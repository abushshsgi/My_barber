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
CATEGORIES = frozenset({"barber", "beauty", "nails", "spa"})
MODEL_FALLBACKS = ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash")


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


def _map_gemini_http_error(status: int, body: str) -> str:
    lowered = body.lower()
    if status in (401, 403) or "api key" in lowered or "permission" in lowered:
        return (
            "GEMINI API kaliti noto'g'ri yoki ruxsat yo'q. "
            "aistudio.google.com/apikey dan yangi kalit oling (service account bog'lamang)."
        )
    if status == 429 or "quota" in lowered or "rate" in lowered:
        return "AI limiti tugadi. Biroz kutib qayta urinib ko'ring."
    if status == 404:
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


def _build_prompt(audience: str) -> str:
    return f"""You are a professional hair and grooming stylist for mysaloon.uz (Uzbekistan).
Analyze the selfie photo. Target audience preference: {audience} (men / women / unisex).

Return ONLY valid JSON, no markdown, no extra text:
{{
  "face_shape": "oval" | "round" | "square",
  "hair_type": "short" | "medium" | "long",
  "summary_uz": "1-2 short sentences in Uzbek explaining the face/hair analysis",
  "suggestions": [
    {{
      "title": "style name (Uzbek or common international name)",
      "match": 75-98,
      "reason_uz": "why this style fits, Uzbek, max 140 characters",
      "category": "barber" | "beauty" | "nails" | "spa"
    }}
  ]
}}

Rules:
- Exactly 3 suggestions, sorted by match descending.
- Be realistic; if face is unclear, still give best-effort conservative suggestions.
- match must be integers between 75 and 98."""


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


def _normalize_analysis(data: dict[str, Any]) -> dict[str, Any]:
    face_shape = str(data.get("face_shape", "oval")).lower()
    hair_type = str(data.get("hair_type", "medium")).lower()
    if face_shape not in FACE_SHAPES:
        face_shape = "oval"
    if hair_type not in HAIR_TYPES:
        hair_type = "medium"

    summary_uz = str(data.get("summary_uz", "")).strip()[:400]
    raw_suggestions = data.get("suggestions")
    if not isinstance(raw_suggestions, list):
        raise AiStyleError("AI tavsiyalari topilmadi.", 502)

    suggestions: list[dict[str, Any]] = []
    for idx, item in enumerate(raw_suggestions[:3]):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()[:80] or f"Uslub {idx + 1}"
        try:
            match = int(item.get("match", 85 - idx * 4))
        except (TypeError, ValueError):
            match = 85 - idx * 4
        match = max(75, min(98, match))
        reason_uz = str(item.get("reason_uz", "")).strip()[:200]
        category = str(item.get("category", "barber")).lower()
        if category not in CATEGORIES:
            category = "barber"
        suggestions.append(
            {
                "id": f"ai-{idx + 1}",
                "title": title,
                "match": match,
                "reason_uz": reason_uz or "Yuz shaklingizga mos keladi.",
                "category": category,
                "seed": f"ai{idx + 1}",
            }
        )

    if len(suggestions) < 3:
        raise AiStyleError("AI yetarli tavsiya qaytarmadi. Qayta urinib ko'ring.", 502)

    return {
        "face_shape": face_shape,
        "hair_type": hair_type,
        "summary_uz": summary_uz,
        "suggestions": suggestions,
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


def call_gemini_style_analysis(mime: str, image_bytes: bytes, audience: str) -> dict[str, Any]:
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not api_key:
        raise AiStyleError("AI xizmati hozircha ulanmagan.", 503)

    b64 = base64.b64encode(image_bytes).decode("ascii")
    body = {
        "contents": [
            {
                "parts": [
                    {"text": _build_prompt(audience)},
                    {"inline_data": {"mime_type": mime, "data": b64}},
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
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
            block = (payload.get("promptFeedback") or {}).get("blockReason")
            if block:
                raise AiStyleError("Rasm tahlil qilinmadi. Boshqa selfie yuklang.", 400)
            last_error = AiStyleError("AI javob bermadi. Boshqa rasm bilan urinib ko'ring.", 502)
            continue

        parts = (candidates[0].get("content") or {}).get("parts") or []
        text_parts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
        if not text_parts:
            last_error = AiStyleError("AI javob bermadi.", 502)
            continue

        logger.info("Gemini style analysis ok via model=%s", model)
        return _normalize_analysis(_extract_json("".join(text_parts)))

    if last_error:
        raise last_error
    raise AiStyleError("AI tahlil vaqtincha ishlamayapti. Keyinroq urinib ko'ring.", 502)


def analyze_style_from_data_url(data_url: str, audience: str) -> dict[str, Any]:
    audience_norm = (audience or "unisex").strip().lower()
    if audience_norm not in {"men", "women", "unisex"}:
        audience_norm = "unisex"
    mime, image_bytes = parse_data_url(data_url)
    return call_gemini_style_analysis(mime, image_bytes, audience_norm)
