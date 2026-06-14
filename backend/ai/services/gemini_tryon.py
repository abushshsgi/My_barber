"""Gemini — selfie + uslub bo'yicha virtual try-on (soch transfer)."""

from __future__ import annotations

import base64
import logging
from pathlib import Path
from typing import Any

from django.conf import settings

from ai.style_prompts import style_detail_for

from .gemini_style import AiStyleError, parse_data_url, _map_gemini_http_error, _read_http_error_body

logger = logging.getLogger(__name__)

IMAGE_MODEL_FALLBACKS = (
    "gemini-2.0-flash-preview-image-generation",
    "gemini-2.5-flash-image-preview",
    "gemini-2.0-flash-exp",
)
PUBLIC_ROOT = Path(settings.BASE_DIR).parent / "apps" / "user" / "public"


def _build_tryon_prompt(*, title: str, style_detail: str, has_reference: bool) -> str:
    ref_hint = (
        "A second reference photo shows the target hairstyle on a model — match that hair shape and length."
        if has_reference
        else ""
    )
    return f"""You are a professional barber/salon AI for mysaloon.uz.

Edit the person in the FIRST photo (client selfie) to show this hairstyle: "{title}" — {style_detail}.
{ref_hint}

CRITICAL:
- Keep the EXACT same face, identity, skin tone, age, and facial features
- Keep pose, camera angle, and expression as close as possible
- ONLY change the hair to a photorealistic professional salon result
- Natural hair texture, realistic lighting on hair
- Do NOT add text, watermarks, logos, or extra people
- Do NOT dramatically change the background
- Front-facing portrait, shoulders visible if present in original

Output a single edited portrait photo."""


def _post_gemini_image(model: str, api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    import json
    import urllib.error
    import urllib.request

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
    with urllib.request.urlopen(req, timeout=90) as res:
        return json.loads(res.read().decode("utf-8"))


def _extract_image_bytes(payload: dict[str, Any]) -> tuple[str, bytes]:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI rasm qaytarmadi.", 502)
    parts = (candidates[0].get("content") or {}).get("parts") or []
    for part in parts:
        if not isinstance(part, dict):
            continue
        inline = part.get("inlineData") or part.get("inline_data")
        if not inline:
            continue
        data = inline.get("data")
        if not data:
            continue
        mime = (inline.get("mimeType") or inline.get("mime_type") or "image/png").lower()
        try:
            raw = base64.b64decode(data, validate=True)
        except Exception as exc:
            raise AiStyleError("AI rasm dekod qilinmadi.", 502) from exc
        if raw:
            return mime, raw
    raise AiStyleError("AI rasm qaytarmadi.", 502)


def _to_data_url(mime: str, raw: bytes) -> str:
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


def load_public_image(relative_url: str) -> tuple[str, bytes] | None:
    rel = (relative_url or "").lstrip("/")
    if not rel:
        return None
    path = PUBLIC_ROOT / rel
    if not path.is_file():
        return None
    suffix = path.suffix.lower()
    mime = {
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(suffix, "image/webp")
    return mime, path.read_bytes()


def generate_tryon_preview(
    *,
    selfie_data_url: str,
    audience: str,
    slug: str,
    title: str,
    reference_image_url: str | None = None,
) -> str:
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not api_key:
        raise AiStyleError("AI xizmati hozircha ulanmagan.", 503)

    mime, selfie_bytes = parse_data_url(selfie_data_url)
    style_detail = style_detail_for(audience, slug)

    reference: tuple[str, bytes] | None = None
    if reference_image_url:
        reference = load_public_image(reference_image_url)

    prompt = _build_tryon_prompt(
        title=title,
        style_detail=style_detail,
        has_reference=reference is not None,
    )

    parts: list[dict[str, Any]] = [{"text": prompt}]
    parts.append(
        {
            "inline_data": {
                "mime_type": mime,
                "data": base64.b64encode(selfie_bytes).decode("ascii"),
            }
        }
    )
    if reference:
        ref_mime, ref_bytes = reference
        parts.append({"text": "Reference hairstyle target (match this hair on the client):"})
        parts.append(
            {
                "inline_data": {
                    "mime_type": ref_mime,
                    "data": base64.b64encode(ref_bytes).decode("ascii"),
                }
            }
        )

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4"},
        },
    }

    import urllib.error

    last_error: AiStyleError | None = None
    for model in IMAGE_MODEL_FALLBACKS:
        try:
            payload = _post_gemini_image(model, api_key, body)
        except urllib.error.HTTPError as exc:
            err_body = _read_http_error_body(exc)
            logger.warning("Gemini try-on HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message = _map_gemini_http_error(exc.code, err_body)
            last_error = AiStyleError(message, 502 if exc.code >= 500 else 400)
            if exc.code == 404:
                continue
            raise last_error from exc
        except urllib.error.URLError as exc:
            logger.warning("Gemini try-on network error (%s): %s", model, exc)
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError("Rasm yaratish juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc

        try:
            out_mime, out_bytes = _extract_image_bytes(payload)
            return _to_data_url(out_mime, out_bytes)
        except AiStyleError as exc:
            last_error = exc
            continue

    if last_error:
        raise last_error
    raise AiStyleError("Rasm yaratish vaqtincha ishlamayapti. Keyinroq urinib ko'ring.", 502)
