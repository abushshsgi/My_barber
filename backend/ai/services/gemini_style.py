"""Gemini Vision — selfie dan soch uslubi tavsiyasi."""

from __future__ import annotations

import base64
import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_MIME = frozenset({"image/jpeg", "image/png", "image/webp"})
FACE_SHAPES = frozenset({"oval", "round", "square"})
HAIR_TYPES = frozenset({"short", "medium", "long"})
DETECTED_GENDERS = frozenset({"male", "female", "unclear"})
MODEL_FALLBACKS = ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash")
NO_FACE_MESSAGE = "Iltimos, yuz shakli rasmini yuklang."


class AiStyleError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def _gemini_models() -> tuple[str, ...]:
    preferred = (getattr(settings, "GEMINI_MODEL", None) or "").strip()
    ordered: list[str] = []
    for model in (preferred, *MODEL_FALLBACKS):
        if model and model not in ordered:
            ordered.append(model)
    return tuple(ordered)


def _read_http_error_body(exc: urllib.error.HTTPError) -> str:
    try:
        return exc.read().decode("utf-8", errors="replace")
    except Exception:
        return ""


def _map_gemini_http_error(status: int, body: str, *, kind: str = "general") -> str:
    lowered = body.lower()
    if status in (401, 403) or "api key" in lowered or "permission" in lowered:
        return (
            "GEMINI API kaliti noto'g'ri yoki ruxsat yo'q. "
            "aistudio.google.com/apikey dan yangi kalit oling."
        )
    if status == 429 or "quota" in lowered or "rate" in lowered or "exceeded" in lowered:
        if kind == "image":
            return (
                "Rasm generatsiya limiti tugadi (Google AI). "
                "Bepul rejada tez tugaydi — aistudio.google.com da billing yoqing "
                "yoki 30–60 daqiqadan keyin qayta urinib ko'ring."
            )
        return (
            "AI so'rov limiti tugadi (Google). "
            "Biroz kuting yoki aistudio.google.com da billing/limitni tekshiring."
        )
    if status == 503 or "unavailable" in lowered or "high demand" in lowered:
        return "AI hozir juda yuklangan. 1–2 daqiqadan keyin qayta urinib ko'ring."
    if status == 404:
        if kind == "image":
            return (
                "Rasm generatsiya modeli topilmadi. "
                "GEMINI_IMAGE_MODEL ni tekshiring (masalan: gemini-2.5-flash-image)."
            )
        return "AI model topilmadi. Backend GEMINI_MODEL sozlamasini tekshiring."
    return "AI tahlil vaqtincha ishlamayapti. Keyinroq urinib ko'ring."


def parse_data_url(data_url: str) -> tuple[str, bytes]:
    raw = (data_url or "").strip()
    match = re.match(r"^data:(image/(?:jpeg|png|webp));base64,(.+)$", raw, re.I | re.S)
    if not match:
        raise AiStyleError("Rasm formati noto'g'ri. JPEG yoki PNG yuklang.", 400)
    mime = match.group(1).lower()
    if mime not in ALLOWED_MIME:
        raise AiStyleError("Faqat JPEG, PNG yoki WebP qabul qilinadi.", 400)
    try:
        payload = base64.b64decode(match.group(2), validate=True)
    except Exception as exc:
        raise AiStyleError("Rasm dekod qilinmadi.", 400) from exc
    if not payload:
        raise AiStyleError("Rasm bo'sh.", 400)
    if len(payload) > MAX_IMAGE_BYTES:
        raise AiStyleError("Rasm hajmi 5 MB dan oshmasligi kerak.", 400)
    return mime, payload


def _build_face_check_prompt() -> str:
    return """Does this image clearly show ONE human face suitable for a hairstyle selfie?
Return ONLY JSON: {"has_face": true} or {"has_face": false}

Set has_face to false when:
- no human face is visible
- only objects, landscapes, animals, text, or products
- group photo without one clear main face
- face is too small, fully hidden, or too blurry to analyze"""


def _format_face_hint(face_hint: dict[str, Any] | None) -> str:
    if not face_hint:
        return ""
    shape = face_hint.get("shape")
    w_h = face_hint.get("width_to_height")
    j_f = face_hint.get("jaw_to_forehead")
    parts = []
    if shape:
        parts.append(f"preliminary face shape from 3D scan: {shape}")
    if w_h is not None:
        parts.append(f"width/height ratio: {w_h}")
    if j_f is not None:
        parts.append(f"jaw/forehead ratio: {j_f}")
    if not parts:
        return ""
    return "Client face scan measurements: " + "; ".join(parts) + ". Prefer matching styles for this shape.\n"


def _build_prompt(audience: str, face_hint: dict[str, Any] | None = None) -> str:
    hint_block = _format_face_hint(face_hint)
    return f"""You are a professional hair and grooming stylist for mysaloon.uz (Uzbekistan).
Analyze the selfie photo. App profile audience hint: {audience} (men / women / unisex).
{hint_block}

Return ONLY valid JSON, no markdown, no extra text:
{{
  "has_face": true | false,
  "detected_gender": "male" | "female" | "unclear",
  "gender_confidence": 0.0-1.0,
  "face_shape": "oval" | "round" | "square",
  "hair_type": "short" | "medium" | "long",
  "summary_uz": "1-2 short sentences in Uzbek: yuz shakli, soch uzunligi/turi, soqol (agar ko'rinsa), soch rangi (agar aniq bo'lsa)"
}}

Rules:
- If no clear single human face is visible, set has_face to false and leave other fields empty.
- detected_gender: perceived gender presentation of the person in the photo (not the app setting).
- gender_confidence: how sure you are about detected_gender (0.0 = guess, 1.0 = very sure).
- Do NOT recommend hairstyle names — analysis only.
- Be realistic; if face is unclear, set has_face to false."""


def _parse_has_face(data: dict[str, Any]) -> bool:
    value = data.get("has_face")
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes"}
    return False


def _ensure_has_face(data: dict[str, Any]) -> None:
    if not _parse_has_face(data):
        raise AiStyleError(NO_FACE_MESSAGE, 400)


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AiStyleError("AI javobi noto'g'ri formatda. Qayta urinib ko'ring.", 502) from exc
    if not isinstance(data, dict):
        raise AiStyleError("AI javobi noto'g'ri formatda.", 502)
    return data


def _normalize_detected_gender(value: Any) -> str:
    raw = str(value or "unclear").strip().lower()
    if raw in {"male", "man", "men", "erkak", "m"}:
        return "male"
    if raw in {"female", "woman", "women", "ayol", "f"}:
        return "female"
    if raw in DETECTED_GENDERS:
        return raw
    return "unclear"


def _normalize_gender_confidence(value: Any) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, confidence))


def _normalize_analysis(data: dict[str, Any]) -> dict[str, Any]:
    _ensure_has_face(data)
    face_shape = str(data.get("face_shape", "oval")).lower()
    hair_type = str(data.get("hair_type", "medium")).lower()
    if face_shape not in FACE_SHAPES:
        face_shape = "oval"
    if hair_type not in HAIR_TYPES:
        hair_type = "medium"

    summary_uz = str(data.get("summary_uz", "")).strip()[:400]
    detected_gender = _normalize_detected_gender(data.get("detected_gender"))
    gender_confidence = _normalize_gender_confidence(data.get("gender_confidence"))

    return {
        "face_shape": face_shape,
        "hair_type": hair_type,
        "summary_uz": summary_uz,
        "detected_gender": detected_gender,
        "gender_confidence": gender_confidence,
    }


def _post_gemini(model: str, api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=45) as res:
        return json.loads(res.read().decode("utf-8"))


def call_gemini_style_analysis(
    mime: str,
    image_bytes: bytes,
    audience: str,
    face_hint: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = _gemini_vision_json(_build_prompt(audience, face_hint), mime, image_bytes)
    normalized = _normalize_analysis(data)
    if face_hint and face_hint.get("shape") in FACE_SHAPES:
        normalized["face_shape"] = str(face_hint["shape"])
    return normalized


def _gemini_vision_json(prompt: str, mime: str, image_bytes: bytes) -> dict[str, Any]:
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not api_key:
        raise AiStyleError("AI xizmati hozircha ulanmagan.", 503)

    b64 = base64.b64encode(image_bytes).decode("ascii")
    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime, "data": b64}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    last_error: AiStyleError | None = None
    for model in _gemini_models():
        try:
            payload = _post_gemini(model, api_key, body)
        except urllib.error.HTTPError as exc:
            err_body = _read_http_error_body(exc)
            logger.warning("Gemini HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message = _map_gemini_http_error(exc.code, err_body)
            last_error = AiStyleError(message, 502 if exc.code >= 500 else 400)
            if exc.code == 404:
                continue
            raise last_error from exc
        except urllib.error.URLError as exc:
            logger.warning("Gemini network error (%s): %s", model, exc)
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError("AI tahlil juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc

        candidates = payload.get("candidates") or []
        if not candidates:
            last_error = AiStyleError("AI javob bermadi.", 502)
            continue

        parts = (candidates[0].get("content") or {}).get("parts") or []
        text_parts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
        if not text_parts:
            last_error = AiStyleError("AI javob bermadi.", 502)
            continue

        return _extract_json("".join(text_parts))

    if last_error:
        raise last_error
    raise AiStyleError("AI tahlil vaqtincha ishlamayapti. Keyinroq urinib ko'ring.", 502)


def check_face_in_data_url(data_url: str) -> bool:
    mime, image_bytes = parse_data_url(data_url)
    data = _gemini_vision_json(_build_face_check_prompt(), mime, image_bytes)
    return _parse_has_face(data)


def analyze_style_from_data_url(
    data_url: str,
    audience: str,
    face_hint: dict[str, Any] | None = None,
) -> dict[str, Any]:
    audience_norm = (audience or "unisex").strip().lower()
    if audience_norm not in {"men", "women", "unisex"}:
        audience_norm = "unisex"
    mime, image_bytes = parse_data_url(data_url)
    return call_gemini_style_analysis(mime, image_bytes, audience_norm, face_hint)
