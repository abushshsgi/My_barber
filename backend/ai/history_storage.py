from __future__ import annotations

import io
from typing import TYPE_CHECKING

from django.core.files.base import ContentFile
from PIL import Image

from ai.services.gemini_style import parse_data_url

if TYPE_CHECKING:
    from accounts.models import User

    from .models import AiStyleHistoryEntry

HISTORY_THUMB_MAX_PX = 512
HISTORY_JPEG_QUALITY = 85
SHARE_MAX_PX = 960
SHARE_JPEG_QUALITY = 88


def image_file_from_data_url(
    data_url: str,
    filename_stem: str,
    *,
    max_px: int = HISTORY_THUMB_MAX_PX,
    quality: int = HISTORY_JPEG_QUALITY,
) -> ContentFile:
    mime, payload = parse_data_url(data_url)
    image = Image.open(io.BytesIO(payload))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    return ContentFile(buffer.getvalue(), name=f"{filename_stem}.jpg")


def image_file_from_source(
    source: str,
    filename_stem: str,
    *,
    max_px: int = SHARE_MAX_PX,
    quality: int = SHARE_JPEG_QUALITY,
) -> ContentFile:
    raw = (source or "").strip()
    if not raw:
        raise ValueError("Bo'sh rasm manbai.")
    if raw.startswith("data:"):
        return image_file_from_data_url(raw, filename_stem, max_px=max_px, quality=quality)

    from urllib.parse import urlparse
    import urllib.request

    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("Faqat data URL yoki http(s) rasm qabul qilinadi.")

    req = urllib.request.Request(raw, headers={"User-Agent": "MyBarber-MorphShare/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310
        payload = resp.read(8_000_000)
    image = Image.open(io.BytesIO(payload))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    return ContentFile(buffer.getvalue(), name=f"{filename_stem}.jpg")


def trim_user_history(user: User) -> None:
    from .models import AiStyleHistoryEntry, HISTORY_MAX_PER_USER

    ids = list(
        AiStyleHistoryEntry.objects.filter(user=user)
        .order_by("-created_at")
        .values_list("id", flat=True)[HISTORY_MAX_PER_USER:]
    )
    if ids:
        AiStyleHistoryEntry.objects.filter(id__in=ids).delete()


def save_history_photo(entry: AiStyleHistoryEntry, source: str) -> None:
    """Accept data URL or http(s) image URL (synced history / studio re-save)."""
    if entry.photo:
        entry.photo.delete(save=False)
    entry.photo.save(
        f"entry-{entry.pk}",
        image_file_from_source(
            source,
            f"entry-{entry.pk}",
            max_px=HISTORY_THUMB_MAX_PX,
            quality=HISTORY_JPEG_QUALITY,
        ),
        save=True,
    )
