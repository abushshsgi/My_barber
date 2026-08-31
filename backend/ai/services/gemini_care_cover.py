"""Admin Tarkib — mahsulot rasmini oq studio katalog oblojkasi qilish."""

from __future__ import annotations

import base64
import io
import logging
from typing import Any

from PIL import Image, ImageFilter

from ai.services.errors import AiStyleError
from ai.services.image_response import extract_image_bytes
from ai.services.studio_image import studio_image_configured
from ai.services.vertex_image import generate_image_content, image_generation_configured

logger = logging.getLogger(__name__)

COVER_SIDE = 1600
COVER_PAD = 0.018
COVER_BG = (255, 255, 255)
BG_LUMA = 232
TARGET_MIN_BYTES = 180 * 1024
TARGET_MAX_BYTES = 600 * 1024
HARD_MAX_BYTES = 1024 * 1024

_COVER_PROMPT = """You are a marketplace catalog photographer (Uzum / Ozon / Wildberries style).

TASK: Turn the attached photo into a PREMIUM 1:1 studio COVER of THIS exact hair-care product.

LOOK (must match):
- Pure WHITE seamless studio backdrop — RGB 255,255,255. No gray, no beige, no gradient, no floor line.
- One product only, standing upright, front label fully readable.
- The bottle/box fills 90–96% of the frame height — LARGE close-up packshot. Almost edge-to-edge. Tiny margin only so the cap and base are not cropped.
- Centered. Soft even beauty lighting. Tiny contact shadow under the base only.
- Sharp, high-end e-commerce packshot. Square 1:1.

MUST KEEP:
- Exact same packaging, shape, colors, brand, label text and pump/cap. Do not invent another SKU.

FORBIDDEN:
- Infographic text, bullets, "how to use", before/after insets, hands, foam, extra products
- Colored creative backgrounds, pink sets, lifestyle scenes
- Watermarks, app logos, Mysaloon, Morf AI
- Gray or off-white backgrounds. Background MUST be pure white.

Return ONE square studio packshot only.
"""


def _as_rgb(src: Image.Image) -> Image.Image:
    if src.mode == "RGB":
        return src
    if src.mode == "L":
        return src.convert("RGB")
    return src.convert("RGB")


def _content_bbox(im: Image.Image) -> tuple[int, int, int, int] | None:
    gray = im.convert("L")
    mask = gray.point(lambda p: 0 if p >= BG_LUMA else 255)
    mask = mask.filter(ImageFilter.MaxFilter(3))
    return mask.getbbox()


def _bleach_near_white(im: Image.Image) -> Image.Image:
    """Kulrang studio fonni oppoq qiladi, etiketka ranglarini saqlaydi."""
    src = _as_rgb(im)
    px = src.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r >= BG_LUMA and g >= BG_LUMA and b >= BG_LUMA:
                px[x, y] = COVER_BG
    return src


def compose_square_cover(raw: bytes, *, side: int = COVER_SIDE) -> bytes:
    """Oq 1600 kvadrat, mahsulot katta (~2% chet), JPEG 200–600 KB."""
    src = _as_rgb(Image.open(io.BytesIO(raw)))
    src = _bleach_near_white(src)
    box = _content_bbox(src)
    if box:
        pad = 2
        left, top, right, bottom = box
        src = src.crop(
            (
                max(0, left - pad),
                max(0, top - pad),
                min(src.width, right + pad),
                min(src.height, bottom + pad),
            )
        )

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
            "imageConfig": {"aspectRatio": "1:1", "imageSize": "2K"},
        },
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
    """AI oq studio packshot + kvadrat JPEG. AI ishlamasa originalni oq fonda kattalashtiradi."""
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
