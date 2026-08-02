from __future__ import annotations

import logging
from datetime import timedelta
from typing import TYPE_CHECKING

from django.utils import timezone

from .history_storage import image_file_from_source

if TYPE_CHECKING:
    from accounts.models import User

    from .models import MorphAiGenerationEntry

logger = logging.getLogger(__name__)

# Client + server may both persist the same try-on within a short window.
_DEDUPE_SECONDS = 120


def persist_tryon_generation(
    *,
    user: User,
    after_image: str,
    before_image: str | None = None,
    style_id: str = "",
    title: str = "",
    persona_id: str = "",
) -> MorphAiGenerationEntry | None:
    """Try-on natijasini Morph AI history (MorphAiGenerationEntry) ga yozadi."""
    from .models import GENERATION_HISTORY_MAX_PER_USER, MorphAiGenerationEntry

    after_raw = (after_image or "").strip()
    if not after_raw or not user or not getattr(user, "pk", None):
        return None

    style_id = (style_id or "").strip()[:64]
    title = (title or "").strip()[:160]
    persona_id = (persona_id or "").strip()[:64]
    before_raw = (before_image or "").strip()

    since = timezone.now() - timedelta(seconds=_DEDUPE_SECONDS)
    # Title bilan dedupe: try-on juft saqlashni to‘xtatadi, studio presetlari
    # (turli title) esa bir-birini yopib qo‘ymaydi.
    recent_qs = MorphAiGenerationEntry.objects.filter(
        user=user,
        style_id=style_id,
        created_at__gte=since,
    )
    if title:
        recent_qs = recent_qs.filter(title=title)
    recent = recent_qs.order_by("-created_at").first()
    if recent and recent.after_photo:
        return recent

    entry = MorphAiGenerationEntry(
        user=user,
        style_id=style_id,
        title=title,
        persona_id=persona_id,
    )
    try:
        entry.after_photo.save(
            "after.jpg",
            image_file_from_source(after_raw, f"gen-after-{user.pk}"),
            save=False,
        )
        if before_raw:
            entry.before_photo.save(
                "before.jpg",
                image_file_from_source(before_raw, f"gen-before-{user.pk}"),
                save=False,
            )
        entry.save()
    except Exception:
        logger.exception(
            "Try-on generation saqlanmadi (user=%s style=%s)",
            user.pk,
            style_id,
        )
        return None

    ids = list(
        MorphAiGenerationEntry.objects.filter(user=user)
        .order_by("-created_at")
        .values_list("id", flat=True)[GENERATION_HISTORY_MAX_PER_USER:]
    )
    if ids:
        MorphAiGenerationEntry.objects.filter(id__in=ids).delete()

    return entry
