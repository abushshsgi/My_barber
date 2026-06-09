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


def image_file_from_data_url(data_url: str, filename_stem: str) -> ContentFile:
    mime, payload = parse_data_url(data_url)
    image = Image.open(io.BytesIO(payload))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.thumbnail((HISTORY_THUMB_MAX_PX, HISTORY_THUMB_MAX_PX), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=HISTORY_JPEG_QUALITY, optimize=True)
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


def save_history_photo(entry: AiStyleHistoryEntry, data_url: str) -> None:
    if entry.photo:
        entry.photo.delete(save=False)
    entry.photo.save(
        f"entry-{entry.pk}",
        image_file_from_data_url(data_url, f"entry-{entry.pk}"),
        save=True,
    )
