"""Post-generation quality signals for Try-On (non-blocking diagnostics).

These checks do not prove hairstyle correctness. They flag obvious identity drift
or extreme forehead edits. Thresholds should be calibrated with human-reviewed samples.
"""

from __future__ import annotations

from typing import Any

from PIL import Image, ImageChops

from .tryon_preserve import MIN_IOU, _analysis, _count, _iou, _open_rgb, _shift_px, _skin_mask

HAIR_BAND_BOTTOM = 0.22


def _hair_band_mask(image: Image.Image) -> Image.Image:
    small = _analysis(image)
    width, height = small.size
    y1 = int(height * HAIR_BAND_BOTTOM)
    mask = Image.new("L", (width, height), 0)
    target = mask.load()
    for y in range(0, max(1, y1)):
        for x in range(width):
            target[x, y] = 255
    return mask


def assess_tryon_quality(
    original: bytes,
    generated: bytes,
    *,
    face_report: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return numeric QC metrics without image bytes."""
    report: dict[str, Any] = {
        "face_status": None,
        "face_iou": None,
        "face_shift_px": None,
        "hair_band_change_ratio": None,
        "forehead_status": "not_run",
        "overall": "not_run",
    }
    if face_report:
        report["face_status"] = face_report.get("status")
        report["face_iou"] = face_report.get("iou")
        report["face_shift_px"] = face_report.get("shift_px")

    try:
        source = _open_rgb(original)
        edited = _open_rgb(generated)
    except Exception:
        report["overall"] = "decode_failed"
        return report

    if edited.size != source.size:
        edited = edited.resize(source.size, Image.Resampling.LANCZOS)

    source_skin = _skin_mask(source)
    edited_skin = _skin_mask(edited)
    iou = _iou(source_skin, edited_skin)
    shift = _shift_px(source_skin, edited_skin, full_size=source.size)
    if face_report is None:
        report["face_iou"] = round(iou, 4)
        report["face_shift_px"] = None if shift is None else round(shift, 2)

    hair_source = _hair_band_mask(source)
    # Non-skin change in the upper band (hair region proxy).
    source_gray = _analysis(source).convert("L")
    edited_gray = _analysis(edited).convert("L")
    diff = ImageChops.difference(source_gray, edited_gray)
    band_pixels = _count(hair_source)
    if band_pixels > 0:
        weighted = ImageChops.multiply(diff, hair_source)
        bright = weighted.point(lambda v: 255 if v >= 28 else 0)
        change_ratio = _count(bright) / band_pixels
        report["hair_band_change_ratio"] = round(change_ratio, 4)
    else:
        report["hair_band_change_ratio"] = None

    forehead_ok = True
    if iou < MIN_IOU:
        forehead_ok = False
    if shift is not None and shift > source.size[1] * 0.04:
        forehead_ok = False
    report["forehead_status"] = "stable" if forehead_ok else "suspect"

    overall = "pass"
    if report.get("face_status") == "failed" or not forehead_ok:
        overall = "review"
    elif report.get("hair_band_change_ratio") is not None and report["hair_band_change_ratio"] < 0.05:
        overall = "low_hair_change"
    report["overall"] = overall
    return report
