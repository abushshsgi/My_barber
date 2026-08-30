"""Gemini Vision — selfie dan soch uslubi tavsiyasi."""

from __future__ import annotations

import base64
import json
import logging
import re
import time
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

from ai.usage_pricing import finalize_usage

from .errors import AiStyleError, map_gemini_http_error, read_http_error_body
from .vertex_auth import vertex_configured
from .vertex_client import generate_content

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_MIME = frozenset({"image/jpeg", "image/png", "image/webp"})
FACE_SHAPES = frozenset({"oval", "round", "square"})
HAIR_TYPES = frozenset({"short", "medium", "long"})
HAIR_COLORS = frozenset(
    {
        "black",
        "dark_brown",
        "brown",
        "light_brown",
        "blonde",
        "red",
        "gray",
        "other",
    }
)
HAIR_TEXTURES = frozenset({"straight", "wavy", "curly", "coily"})
BEARD_LEVELS = frozenset({"none", "light", "full"})
DETECTED_GENDERS = frozenset({"male", "female", "unclear"})
GEMINI_VISION_MODEL = "gemini-2.5-flash"
NO_FACE_MESSAGE = "Yuzdan boshqa narsa yuklandi. Iltimos, yuz shaklingizni yuboring!"

HAIR_COLOR_HEX = {
    "black": "#1A1A1A",
    "dark_brown": "#3B2314",
    "brown": "#6B3F2A",
    "light_brown": "#A67C52",
    "blonde": "#D4B483",
    "red": "#8B3A2F",
    "gray": "#8A8A8A",
    "other": "#5C5C5C",
}


def _vision_model() -> str:
    configured = (getattr(settings, "GEMINI_MODEL", None) or "").strip()
    return configured or GEMINI_VISION_MODEL


def _read_http_error_body(exc: urllib.error.HTTPError) -> str:
    return read_http_error_body(exc)


def _map_gemini_http_error(status: int, body: str, *, kind: str = "general") -> str:
    return map_gemini_http_error(status, body, kind=kind, model=_vision_model())


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


def _sniff_image_mime(payload: bytes, content_type: str = "") -> str:
    mime = (content_type or "").split(";")[0].strip().lower()
    if mime in ALLOWED_MIME:
        return mime
    if payload[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if payload[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return "image/webp"
    raise AiStyleError("Faqat JPEG, PNG yoki WebP qabul qilinadi.", 400)


def _load_media_storage_bytes(source: str) -> tuple[str, bytes] | None:
    """Same-origin `/media/…` — storage'dan o'qish (studio/history)."""
    try:
        from ai.history_storage import extract_media_relative_path
    except Exception:
        return None

    media_rel = extract_media_relative_path(source)
    if not media_rel:
        return None

    try:
        from django.core.files.storage import default_storage

        if not default_storage.exists(media_rel):
            raise AiStyleError("Rasmni yuklab bo'lmadi.", 400)
        with default_storage.open(media_rel, "rb") as fh:
            payload = fh.read(MAX_IMAGE_BYTES + 1)
    except AiStyleError:
        raise
    except Exception as exc:
        raise AiStyleError("Rasmni yuklab bo'lmadi.", 400) from exc

    if not payload:
        raise AiStyleError("Rasm bo'sh.", 400)
    if len(payload) > MAX_IMAGE_BYTES:
        raise AiStyleError("Rasm hajmi 5 MB dan oshmasligi kerak.", 400)
    return _sniff_image_mime(payload), payload


def load_image_bytes(source: str) -> tuple[str, bytes]:
    """Accept data URL, /media/ path, or http(s) image URL (history sync / studio)."""
    raw = (source or "").strip()
    if not raw:
        raise AiStyleError("Rasmni yuboring.", 400)
    if raw.startswith("data:"):
        return parse_data_url(raw)

    stored = _load_media_storage_bytes(raw)
    if stored is not None:
        return stored

    from urllib.parse import urlparse

    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise AiStyleError("Rasm formati noto'g'ri. JPEG yoki PNG yuklang.", 400)

    req = urllib.request.Request(raw, headers={"User-Agent": "MyBarber-MorphAI/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310
            content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            payload = resp.read(MAX_IMAGE_BYTES + 1)
    except Exception as exc:
        raise AiStyleError("Rasmni yuklab bo'lmadi.", 400) from exc

    if not payload:
        raise AiStyleError("Rasm bo'sh.", 400)
    if len(payload) > MAX_IMAGE_BYTES:
        raise AiStyleError("Rasm hajmi 5 MB dan oshmasligi kerak.", 400)

    return _sniff_image_mime(payload, content_type), payload


def _build_face_check_prompt() -> str:
    return """You are a gatekeeper for a hairstyle try-on app.
Does this image clearly show ONE real human face suitable for a selfie / face-shape analysis?

Return ONLY JSON: {"has_face": true} or {"has_face": false}

Set has_face to true ONLY when:
- a single person's face is clearly visible (front or slight angle)
- eyes / nose / mouth area can be analyzed for face shape

Set has_face to false when ANY of these apply:
- no human face (objects, UI screenshots, landscapes, animals, food, text, products)
- only hair / body / hands without a readable face
- group photo without one clear main face
- face is too small, cropped, covered, heavily filtered, or too blurry
- cartoon, anime, drawing, or AI avatar instead of a real photo"""


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
  "hair_color": "black" | "dark_brown" | "brown" | "light_brown" | "blonde" | "red" | "gray" | "other",
  "hair_texture": "straight" | "wavy" | "curly" | "coily",
  "beard": "none" | "light" | "full",
  "face_confidence": 0.0-1.0,
  "hair_type_confidence": 0.0-1.0,
  "hair_color_confidence": 0.0-1.0,
  "summary_uz": "1-2 short sentences in Uzbek: yuz shakli, soch uzunligi/turi/rangi, soqol (agar ko'rinsa)"
}}

Rules:
- If no clear single human face is visible, set has_face to false and leave other fields empty.
- detected_gender: perceived gender presentation of the person in the photo (not the app setting).
- gender_confidence: how sure you are about detected_gender (0.0 = guess, 1.0 = very sure).
- face_confidence / hair_type_confidence / hair_color_confidence MUST be calibrated 0.0–1.0 floats:
  - typical honest range is 0.55–0.92
  - use ~0.95+ only when the trait is unmistakably clear
  - NEVER default every trait to 1.0 / 100
  - lower scores when lighting is poor, hair is covered/tied, color is dyed unevenly, face angle is extreme, or the trait is ambiguous
- hair_color / hair_texture describe the CURRENT selfie hair (before any try-on).
- beard: none if clean-shaven or not visible; light for stubble; full for beard.
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


def _normalize_trait_confidence(value: Any, *, fallback: float = 0.72) -> float:
    """0–1 yoki 0–100 foizni 0–1 ga normalizatsiya qiladi (100% bugini to‘xtatadi)."""
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return fallback
    if confidence > 1.0:
        # Model ba'zan 86 yoki 100 qaytaradi — foiz deb o‘qiymiz.
        confidence = confidence / 100.0
    if confidence <= 0:
        return fallback
    # Mukammal 1.0 ni yumshatamiz — UI da doim 100% chiqmasin.
    return max(0.08, min(0.97, confidence))


def _classify_face_from_ratios(width_to_height: float, jaw_to_forehead: float) -> str:
    """MediaPipe ratio → face shape (web/mobile face-scan bilan mos)."""
    if width_to_height >= 0.9:
        return "round"
    if jaw_to_forehead >= 1.02 and width_to_height <= 0.84:
        return "square"
    return "oval"


def _face_hint_shape_score(face_hint: dict[str, Any] | None) -> tuple[str | None, float]:
    """Hint ratio aniqligidan yuz shakli + ishonch (0–1)."""
    if not face_hint:
        return None, 0.0
    try:
        w_h = float(face_hint.get("width_to_height"))
        j_f = float(face_hint.get("jaw_to_forehead"))
    except (TypeError, ValueError):
        shape = face_hint.get("shape")
        if shape in FACE_SHAPES:
            return str(shape), 0.72
        return None, 0.0

    shape = _classify_face_from_ratios(w_h, j_f)
    # Chegara yaqinligi — qancha uzoq bo‘lsa, shuncha ishonchli.
    round_margin = abs(w_h - 0.9)
    square_margin = min(abs(j_f - 1.02), abs(w_h - 0.84))
    if shape == "round":
        clarity = min(1.0, round_margin / 0.12)
    elif shape == "square":
        clarity = min(1.0, square_margin / 0.1)
    else:
        # Oval: 0.9 va square zonadan uzoqlik
        clarity = min(1.0, min(0.9 - w_h, 1.02 - j_f + 0.05) / 0.12 + 0.35)
        clarity = max(0.0, clarity)
    score = 0.58 + 0.34 * clarity
    return shape, max(0.55, min(0.94, score))


def _blend(a: float, b: float, weight_b: float) -> float:
    w = max(0.0, min(1.0, weight_b))
    return a * (1.0 - w) + b * w


def _calibrate_trait_scores(
    analysis: dict[str, Any],
    face_hint: dict[str, Any] | None,
    *,
    ai_face_shape: str,
) -> dict[str, Any]:
    """AI confidence + MediaPipe hint bo‘yicha foizlarni haqiqiy hisoblash."""
    face_conf = float(analysis.get("face_confidence") or 0.72)
    hair_type_conf = float(analysis.get("hair_type_confidence") or 0.7)
    hair_color_conf = float(analysis.get("hair_color_confidence") or 0.68)
    gender_conf = float(analysis.get("gender_confidence") or 0.0)

    hint_shape, hint_score = _face_hint_shape_score(face_hint)
    final_face_shape = str(analysis.get("face_shape") or "oval")

    if hint_shape:
        if hint_shape == ai_face_shape:
            face_conf = _blend(face_conf, hint_score, 0.55)
            face_conf = min(0.96, face_conf + 0.04)
        elif hint_shape == final_face_shape:
            # Hint ustun — AI boshqa shakl dedi → ishonchni pasaytiramiz.
            face_conf = _blend(hint_score, face_conf, 0.25) * 0.9
        else:
            face_conf = _blend(face_conf, hint_score, 0.4) * 0.85
    else:
        # Hint yo‘q — AI ni yumshoq cheklaymiz.
        face_conf = min(face_conf, 0.9)

    # Soch uzunligi: gender noaniq yoki yuz ishonchi past bo‘lsa, biroz pasaytiramiz.
    if gender_conf and gender_conf < 0.45:
        hair_type_conf *= 0.92
    if face_conf < 0.65:
        hair_type_conf *= 0.94
        hair_color_conf *= 0.94

    # "other" rang — pastroq ishonch.
    if analysis.get("hair_color") == "other":
        hair_color_conf = min(hair_color_conf, 0.62)

    # Uchala foiz ham 0.95+ bo‘lib ketmasin — spread.
    scores = [face_conf, hair_type_conf, hair_color_conf]
    if min(scores) > 0.93:
        face_conf *= 0.92
        hair_type_conf *= 0.9
        hair_color_conf *= 0.88

    analysis["face_confidence"] = round(max(0.12, min(0.97, face_conf)), 3)
    analysis["hair_type_confidence"] = round(max(0.12, min(0.97, hair_type_conf)), 3)
    analysis["hair_color_confidence"] = round(max(0.12, min(0.97, hair_color_conf)), 3)
    return analysis


def _normalize_enum(value: Any, allowed: frozenset[str], fallback: str) -> str:
    raw = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "darkbrown": "dark_brown",
        "lightbrown": "light_brown",
        "ginger": "red",
        "auburn": "red",
        "grey": "gray",
        "silver": "gray",
        "wave": "wavy",
        "waves": "wavy",
        "curl": "curly",
        "coils": "coily",
        "kinky": "coily",
        "stubble": "light",
        "beard": "full",
        "clean": "none",
        "clean_shaven": "none",
    }
    raw = aliases.get(raw, raw)
    if raw in allowed:
        return raw
    return fallback


def _normalize_analysis(data: dict[str, Any]) -> dict[str, Any]:
    _ensure_has_face(data)
    face_shape = _normalize_enum(data.get("face_shape"), FACE_SHAPES, "oval")
    hair_type = _normalize_enum(data.get("hair_type"), HAIR_TYPES, "medium")
    hair_color = _normalize_enum(data.get("hair_color"), HAIR_COLORS, "other")
    hair_texture = _normalize_enum(data.get("hair_texture"), HAIR_TEXTURES, "straight")
    beard = _normalize_enum(data.get("beard"), BEARD_LEVELS, "none")

    summary_uz = str(data.get("summary_uz", "")).strip()[:400]
    detected_gender = _normalize_detected_gender(data.get("detected_gender"))
    gender_confidence = _normalize_gender_confidence(data.get("gender_confidence"))
    face_confidence = _normalize_trait_confidence(data.get("face_confidence"), fallback=0.74)
    hair_type_confidence = _normalize_trait_confidence(
        data.get("hair_type_confidence"),
        fallback=0.7,
    )
    hair_color_confidence = _normalize_trait_confidence(
        data.get("hair_color_confidence"),
        fallback=0.68,
    )

    return {
        "face_shape": face_shape,
        "hair_type": hair_type,
        "hair_color": hair_color,
        "hair_color_hex": HAIR_COLOR_HEX.get(hair_color, HAIR_COLOR_HEX["other"]),
        "hair_texture": hair_texture,
        "beard": beard,
        "face_confidence": face_confidence,
        "hair_type_confidence": hair_type_confidence,
        "hair_color_confidence": hair_color_confidence,
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
    prompt = _build_prompt(audience, face_hint)
    data, usage = _gemini_vision_json(prompt, mime, image_bytes)
    normalized = _normalize_analysis(data)
    ai_face_shape = str(normalized["face_shape"])
    hint_shape, _ = _face_hint_shape_score(face_hint)
    # MediaPipe ratio/shape bo‘lsa — yuz shaklida uni afzal ko‘ramiz.
    if hint_shape in FACE_SHAPES:
        normalized["face_shape"] = hint_shape
    elif face_hint and face_hint.get("shape") in FACE_SHAPES:
        normalized["face_shape"] = str(face_hint["shape"])
    normalized = _calibrate_trait_scores(
        normalized,
        face_hint,
        ai_face_shape=ai_face_shape,
    )
    normalized["_usage"] = usage
    return normalized


def _gemini_vision_json(
    prompt: str,
    mime: str,
    image_bytes: bytes,
) -> tuple[dict[str, Any], dict[str, Any]]:
    return _gemini_vision_json_multi(prompt, [(mime, image_bytes)])


def _gemini_vision_json_multi(
    prompt: str,
    images: list[tuple[str, bytes]],
    *,
    timeout: int = 45,
) -> tuple[dict[str, Any], dict[str, Any]]:
    if not images:
        raise AiStyleError("Rasm yuborilmadi.", 400)
    image_parts: list[dict[str, Any]] = []
    for mime, image_bytes in images:
        if mime not in ALLOWED_MIME:
            raise AiStyleError("Faqat JPEG, PNG yoki WebP qabul qilinadi.", 400)
        if not image_bytes:
            raise AiStyleError("Rasm bo'sh.", 400)
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise AiStyleError("Rasm hajmi 5 MB dan oshmasligi kerak.", 400)
        image_parts.append(
            {
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(image_bytes).decode("ascii"),
                }
            }
        )
    parts = [{"text": prompt}, *image_parts]
    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    model = _vision_model()
    provider = "vertex" if vertex_configured() else "studio"
    started = time.perf_counter()

    if vertex_configured():
        try:
            payload = generate_content(model, body, timeout=timeout, kind="general")
        except AiStyleError:
            raise
        except Exception as exc:
            logger.warning("Vertex vision error (%s): %s", model, exc)
            raise AiStyleError("AI tahlil vaqtincha ishlamayapti.", 502) from exc
    else:
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not api_key:
            raise AiStyleError(
                "AI xizmati hozircha ulanmagan. "
                "VERTEX_SERVICE_ACCOUNT_JSON yoki GEMINI_API_KEY kerak.",
                503,
            )
        body_legacy = {
            "contents": [{"parts": parts}],
            "generationConfig": body["generationConfig"],
        }
        try:
            payload = _post_gemini(model, api_key, body_legacy)
        except urllib.error.HTTPError as exc:
            err_body = _read_http_error_body(exc)
            logger.warning("Gemini HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message = _map_gemini_http_error(exc.code, err_body)
            raise AiStyleError(message, 502 if exc.code >= 500 else 400) from exc
        except urllib.error.URLError as exc:
            logger.warning("Gemini network error (%s): %s", model, exc)
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError("AI tahlil juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI javob bermadi.", 502)

    text_parts = [
        p.get("text", "")
        for p in ((candidates[0].get("content") or {}).get("parts") or [])
        if isinstance(p, dict) and p.get("text")
    ]
    if not text_parts:
        raise AiStyleError("AI javob bermadi.", 502)

    usage_nums = finalize_usage(payload, kind="analyze")
    usage = {
        "prompt": prompt,
        "model": model,
        "provider": provider,
        "latency_ms": latency_ms,
        "prompt_tokens": usage_nums["prompt_tokens"],
        "candidates_tokens": usage_nums["candidates_tokens"],
        "thoughts_tokens": usage_nums["thoughts_tokens"],
        "total_tokens": usage_nums["total_tokens"],
        "cost_usd": usage_nums["cost_usd"],
        "tokens_estimated": usage_nums["tokens_estimated"],
    }
    return _extract_json("".join(text_parts)), usage


def check_face_in_data_url(data_url: str) -> tuple[bool, dict[str, Any]]:
    mime, image_bytes = parse_data_url(data_url)
    data, usage = _gemini_vision_json(_build_face_check_prompt(), mime, image_bytes)
    return _parse_has_face(data), usage


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
