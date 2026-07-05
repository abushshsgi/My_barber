"""Vertex AI try-on — selfie + katalog uslubi → preview rasm."""

from __future__ import annotations

import base64
import logging
from pathlib import Path
from typing import Any

from django.conf import settings

from ai.style_prompts import style_detail_for

from .gemini_style import AiStyleError, parse_data_url
from .image_response import extract_image_bytes, to_data_url
from .vertex_image import generate_image_content, vertex_image_configured

logger = logging.getLogger(__name__)

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
    if not vertex_image_configured():
        raise AiStyleError("AI rasm xizmati hozircha ulanmagan.", 503)

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
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4"},
        },
    }

    payload = generate_image_content(body)
    out_mime, out_bytes = extract_image_bytes(payload)
    return to_data_url(out_mime, out_bytes)
