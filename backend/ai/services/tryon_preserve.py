"""Post-generation face preservation for models that cannot take a mask.

FLUX 3 Image Klein and legacy Runware edit models accept reference images and a prompt. They do not accept
mask, seedImage, or strength. This module never sends those fields.

The original face is copied back only when a skin-region overlap check says
the generated face is still in the same place. A fringe is left on the
generated image wherever the new hair is not skin. If alignment is weak,
the generated image is returned unchanged.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

MIN_EDGE = 32
ANALYSIS_EDGE = 180
# JPEG full-range YCbCr. Inclusive enough for light and dark skin.
SKIN_Y_MIN = 30
SKIN_CB = (77, 135)
SKIN_CR = (130, 180)
WINDOW = (0.18, 0.20, 0.82, 0.82)
MIN_SKIN_FRACTION = 0.06
MIN_IOU = 0.50
MAX_SHIFT_FRACTION = 0.035
ASPECT_TOLERANCE = 0.02
HAIRLINE_CUT = 0.20
RESTORE_JPEG_QUALITY = 92


def preserve_face(original: bytes, generated: bytes, *, apply: bool = True) -> tuple[bytes, dict[str, Any]]:
    """Return possibly composited JPEG bytes and a small numeric report.

    The report contains sizes, scores, and a reason. It does not contain pixels.
    """
    report: dict[str, Any] = {
        "status": "skipped",
        "reason": "not_run",
        "iou": None,
        "shift_px": None,
        "applied": False,
    }
    try:
        source = _open_rgb(original)
        edited = _open_rgb(generated)
    except Exception:
        report["reason"] = "decode_failed"
        return generated, report

    if min(source.size) < MIN_EDGE or min(edited.size) < MIN_EDGE:
        report["reason"] = "too_small"
        return generated, report

    source_aspect = source.width / source.height
    edited_aspect = edited.width / edited.height
    if abs(edited_aspect - source_aspect) / source_aspect > ASPECT_TOLERANCE:
        report["status"] = "failed"
        report["reason"] = "aspect_mismatch"
        return generated, report

    if edited.size != source.size:
        edited = edited.resize(source.size, Image.Resampling.LANCZOS)

    source_mask = _skin_mask(source)
    edited_mask = _skin_mask(edited)
    window_area = _window_area(*source_mask.size)
    source_count = _count(source_mask)
    if window_area <= 0 or source_count / window_area < MIN_SKIN_FRACTION:
        report["reason"] = "no_face"
        return generated, report

    iou = _iou(source_mask, edited_mask)
    shift = _shift_px(source_mask, edited_mask, full_size=source.size)
    report["iou"] = round(iou, 4)
    report["shift_px"] = None if shift is None else round(shift, 2)

    if _count(edited_mask) == 0 or iou < MIN_IOU or shift is None or shift > MAX_SHIFT_FRACTION * min(source.size):
        report["status"] = "failed"
        report["reason"] = "alignment"
        return generated, report

    if not apply:
        report["status"] = "skipped"
        report["reason"] = "restore_disabled"
        return generated, report

    mask = _restore_mask(source_mask, edited_mask)
    if _count(mask) < 24:
        report["reason"] = "mask_collapsed"
        return generated, report

    full_mask = mask.resize(source.size, Image.Resampling.BILINEAR)
    merged = Image.composite(source, edited, full_mask)
    buffer = BytesIO()
    merged.save(buffer, format="JPEG", quality=RESTORE_JPEG_QUALITY, optimize=True)
    payload = buffer.getvalue()
    if not payload.startswith(b"\xff\xd8\xff"):
        report["reason"] = "encode_failed"
        return generated, report
    report["status"] = "restored"
    report["reason"] = "inner_face"
    report["applied"] = True
    return payload, report


def _open_rgb(raw: bytes) -> Image.Image:
    image = Image.open(BytesIO(raw))
    image = ImageOps.exif_transpose(image)
    if image.mode != "RGB":
        image = image.convert("RGB")
    return image


def _analysis(image: Image.Image) -> Image.Image:
    copy = image.copy()
    copy.thumbnail((ANALYSIS_EDGE, ANALYSIS_EDGE), Image.Resampling.BOX)
    return copy


def _skin_mask(image: Image.Image) -> Image.Image:
    small = _analysis(image).convert("YCbCr")
    width, height = small.size
    x0 = int(width * WINDOW[0])
    y0 = int(height * WINDOW[1])
    x1 = int(width * WINDOW[2])
    y1 = int(height * WINDOW[3])
    pixels = small.load()
    mask = Image.new("L", (width, height), 0)
    target = mask.load()
    for y in range(max(0, y0), min(height, y1)):
        for x in range(max(0, x0), min(width, x1)):
            luma, cb, cr = pixels[x, y]
            if luma >= SKIN_Y_MIN and SKIN_CB[0] <= cb <= SKIN_CB[1] and SKIN_CR[0] <= cr <= SKIN_CR[1]:
                target[x, y] = 255
    return mask


def _restore_mask(source_mask: Image.Image, edited_mask: Image.Image) -> Image.Image:
    overlap = ImageChops.multiply(source_mask, edited_mask)
    bbox = overlap.point(lambda value: 255 if value >= 128 else 0).getbbox()
    if bbox:
        _x0, y0, _x1, y1 = bbox
        cut = y0 + int((y1 - y0) * HAIRLINE_CUT)
        ImageDraw.Draw(overlap).rectangle((0, 0, overlap.width, cut), fill=0)
    eroded = overlap.filter(ImageFilter.MinFilter(3))
    return eroded.filter(ImageFilter.GaussianBlur(radius=1.6))


def _window_area(width: int, height: int) -> int:
    box_w = max(0, int(width * WINDOW[2]) - int(width * WINDOW[0]))
    box_h = max(0, int(height * WINDOW[3]) - int(height * WINDOW[1]))
    return box_w * box_h


def _count(mask: Image.Image) -> int:
    histogram = mask.histogram()
    return sum(histogram[128:])


def _iou(left: Image.Image, right: Image.Image) -> float:
    intersection = _count(ImageChops.multiply(left, right))
    union = _count(ImageChops.add(left, right))
    if union <= 0:
        return 0.0
    return intersection / union


def _centroid(mask: Image.Image) -> tuple[float, float] | None:
    pixels = mask.load()
    width, height = mask.size
    total_x = 0.0
    total_y = 0.0
    count = 0
    for y in range(height):
        for x in range(width):
            if pixels[x, y] >= 128:
                total_x += x
                total_y += y
                count += 1
    if count == 0:
        return None
    return total_x / count, total_y / count


def _shift_px(
    source_mask: Image.Image,
    edited_mask: Image.Image,
    *,
    full_size: tuple[int, int],
) -> float | None:
    source_center = _centroid(source_mask)
    edited_center = _centroid(edited_mask)
    if source_center is None or edited_center is None:
        return None
    scale_x = full_size[0] / source_mask.width
    scale_y = full_size[1] / source_mask.height
    dx = (edited_center[0] - source_center[0]) * scale_x
    dy = (edited_center[1] - source_center[1]) * scale_y
    return (dx * dx + dy * dy) ** 0.5
