"""Admin Tarkib — mahsulot rasmini katalog oblojkasi (1:1 studio) qilish."""

from __future__ import annotations

import base64
import io
import logging
from typing import Any

from PIL import Image

from ai.services.errors import AiStyleError
from ai.services.image_response import extract_image_bytes
from ai.services.studio_image import studio_image_configured
from ai.services.vertex_image import generate_image_content, image_generation_configured

logger = logging.getLogger(__name__)

COVER_SIDE = 1600
COVER_PAD = 0.06
COVER_BG = (248, 248, 246)
TARGET_MIN_BYTES = 180 * 1024
TARGET_MAX_BYTES = 600 * 1024
HARD_MAX_BYTES = 1024 * 1024

_COVER_PROMPT = """You are a product photographer preparing a catalog COVER photo.

TASK: Create a premium e-commerce cover of THIS exact hair-care product from the attached photo.

MUST KEEP:
- The same bottle/box, shape, colors, label artwork, brand name, and packaging. Do not invent a different product.

STUDIO STANDARD:
- Square 1:1 composition
- Soft white or very light gray seamless background
- Product upright and centered
- About 6–8% empty margin around the product so the bottle fills the frame but is never cropped
- Even soft lighting, gentle shadow under the product only
- Photorealistic, sharp, clean

FORBIDDEN:
- Extra props, hands, text overlays, watermarks, logos that are not on the original pack
- Do NOT add Mysaloon, Morf AI, or any app branding
- No beauty-filter distortion of the label text

Return ONE square product photo only.
"""


def compose_square_cover(raw: bytes, *, side: int = COVER_SIDE) -> bytes:
    """Kvadrat 1600 canvas, markazda 12% chet, JPEG 200–600 KB (max 1 MB)."""
    src = Image.open(io.BytesIO(raw))
    if src.mode not in ("RGB", "L"):
        src = src.convert("RGB")
    elif src.mode == "L":
        src = src.convert("RGB")

    canvas = Image.new("RGB", (side, side), COVER_BG)
    inner = int(round(side * (1 - 2 * COVER_PAD)))
    fitted = src.copy()
    fitted.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (side - fitted.width) // 2
    y = (side - fitted.height) // 2
    canvas.paste(fitted, (x, y))

    best = _jpeg_bytes(canvas, 85)
    for quality in (88, 84, 80, 76, 72, 68):
        blob = _jpeg_bytes(canvas, quality)
        if TARGET_MIN_BYTES <= len(blob) <= TARGET_MAX_BYTES:
            return blob
        if len(blob) < len(best) and len(blob) <= HARD_MAX_BYTES:
            best = blob
        if len(blob) <= TARGET_MAX_BYTES:
            best = blob
            break
    if len(best) > HARD_MAX_BYTES:
        best = _jpeg_bytes(canvas, 62)
    return best


def _jpeg_bytes(image: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=quality, optimize=True, subsampling=1)
    return buf.getvalue()


def _studio_cover_bytes(mime: str, raw: bytes) -> bytes:
    parts: list[dict[str, Any]] = [
        {
            "inline_data": {
                "mime_type": mime,
                "data": base64.b64encode(raw).decode("ascii"),
            }
        },
        {"text": _COVER_PROMPT},
    ]
    configs: list[dict[str, Any]] = [
        {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "1:1", "imageSize": "1K"},
        },
        {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "1:1"},
        },
        {"responseModalities": ["IMAGE"]},
    ]
    last_exc: AiStyleError | None = None
    for config in configs:
        body = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": config,
        }
        try:
            payload = generate_image_content(body)
            _out_mime, out_bytes = extract_image_bytes(payload)
            if out_bytes:
                return out_bytes
        except AiStyleError as exc:
            last_exc = exc
            logger.warning("Care cover gen failed config=%s: %s", config, exc)
            continue
    if last_exc is not None:
        raise last_exc
    raise AiStyleError("Oblojka rasmi olinmadi.", 502)


def make_catalog_cover(mime: str, raw: bytes) -> tuple[bytes, str]:
    """AI studio cover + kvadrat JPEG. AI ishlamasa originalni padronlab qaytaradi."""
    source = "pad"
    working = raw
    if image_generation_configured() or studio_image_configured():
        try:
            working = _studio_cover_bytes(mime, raw)
            source = "ai"
        except AiStyleError as exc:
            logger.warning("Care cover AI skipped: %s", exc)
            working = raw
            source = "pad"
    return compose_square_cover(working), source
