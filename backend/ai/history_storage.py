from __future__ import annotations

import io
import logging
from typing import TYPE_CHECKING
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image

from ai.services.gemini_style import parse_data_url

if TYPE_CHECKING:
    from accounts.models import User

    from .models import AiStyleHistoryEntry

logger = logging.getLogger(__name__)

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


def _media_url_prefix() -> str:
    try:
        configured = bool(getattr(settings, "configured", False))
        base = (
            ((getattr(settings, "MEDIA_URL", None) if configured else None) or "/media/")
            .strip()
            or "/media/"
        )
    except Exception:
        base = "/media/"
    if not base.startswith("/"):
        base = f"/{base}"
    return base if base.endswith("/") else f"{base}/"


def extract_media_relative_path(source: str) -> str | None:
    """'/media/foo.jpg' yoki 'https://host/media/foo.jpg' → 'foo.jpg'."""
    raw = (source or "").strip()
    if not raw:
        return None
    prefix = _media_url_prefix()
    path = raw
    if raw.startswith("http://") or raw.startswith("https://"):
        parsed = urlparse(raw)
        path = parsed.path or ""
    if path.startswith(prefix):
        rel = path[len(prefix) :].lstrip("/")
        return rel or None
    if path.startswith("media/"):
        return path[len("media/") :].lstrip("/") or None
    return None


def _bytes_to_jpeg_content(
    payload: bytes,
    filename_stem: str,
    *,
    max_px: int,
    quality: int,
) -> ContentFile:
    image = Image.open(io.BytesIO(payload))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.thumbnail((max_px, max_px), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    return ContentFile(buffer.getvalue(), name=f"{filename_stem}.jpg")


def image_file_from_storage(
    relative_path: str,
    filename_stem: str,
    *,
    max_px: int = SHARE_MAX_PX,
    quality: int = SHARE_JPEG_QUALITY,
) -> ContentFile:
    from django.core.files.storage import default_storage

    rel = relative_path.lstrip("/")
    if not default_storage.exists(rel):
        raise ValueError(f"Media topilmadi: {rel}")
    with default_storage.open(rel, "rb") as fh:
        payload = fh.read(8_000_000)
    return _bytes_to_jpeg_content(payload, filename_stem, max_px=max_px, quality=quality)


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

    # Same-origin /media/… — storage'dan o'qish (server o'zini fetch qilmasin).
    media_rel = extract_media_relative_path(raw)
    if media_rel:
        try:
            return image_file_from_storage(
                media_rel, filename_stem, max_px=max_px, quality=quality
            )
        except Exception:
            logger.exception("Media storage'dan o'qilmadi: %s", media_rel)
            # Absolute URL bo'lsa pastdagi http fetch'ga tushadi.
            if not (raw.startswith("http://") or raw.startswith("https://")):
                raise

    parsed = urlparse(raw)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("Faqat data URL, /media/ yo'l yoki http(s) rasm qabul qilinadi.")

    import urllib.request

    req = urllib.request.Request(raw, headers={"User-Agent": "MyBarber-MorphShare/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310
        payload = resp.read(8_000_000)
    return _bytes_to_jpeg_content(payload, filename_stem, max_px=max_px, quality=quality)


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
