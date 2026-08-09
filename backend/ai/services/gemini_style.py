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
  "summary_uz": "1-2 short sentences in Uzbek: yuz shakli, soch uzunligi/turi/rangi, soqol (agar ko'rinsa)"
}}

Rules:
- If no clear single human face is visible, set has_face to false and leave other fields empty.
- detected_gender: perceived gender presentation of the person in the photo (not the app setting).
- gender_confidence: how sure you are about detected_gender (0.0 = guess, 1.0 = very sure).
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

    return {
        "face_shape": face_shape,
        "hair_type": hair_type,
        "hair_color": hair_color,
        "hair_color_hex": HAIR_COLOR_HEX.get(hair_color, HAIR_COLOR_HEX["other"]),
        "hair_texture": hair_texture,
        "beard": beard,
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
    if face_hint and face_hint.get("shape") in FACE_SHAPES:
        normalized["face_shape"] = str(face_hint["shape"])
    normalized["_usage"] = usage
    return normalized


def _gemini_vision_json(
    prompt: str,
    mime: str,
    image_bytes: bytes,
) -> tuple[dict[str, Any], dict[str, Any]]:
    b64 = base64.b64encode(image_bytes).decode("ascii")
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime, "data": b64}},
                ],
            }
        ],
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
            payload = generate_content(model, body, timeout=45, kind="general")
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
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": mime, "data": b64}},
                    ]
                }
            ],
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

    parts = (candidates[0].get("content") or {}).get("parts") or []
    text_parts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
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
