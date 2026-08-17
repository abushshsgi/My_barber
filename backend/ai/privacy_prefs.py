"""Morph AI foydalanuvchi maxfiylik sozlamalari va ma'lumotlarni o'chirish."""

from __future__ import annotations

import logging
from typing import Any

from django.db.models.fields.files import FieldFile

from ai.chat_prompts import MORF_CHAT_DAILY_LIMIT
from ai.models import (
    AiStyleHistoryEntry,
    MorphAiChatMessage,
    MorphAiChatThread,
    MorphAiGenerationEntry,
    MorphAiLookShare,
    MorphAiUserPrefs,
)

logger = logging.getLogger(__name__)

CHAT_LIMIT_WARN_AT = 3

PREF_BOOL_FIELDS = (
    "privacy_local_only",
    "save_chat_history",
    "persist_looks",
    "limit_notify",
    "use_tryon_context",
)


def get_or_create_prefs(user) -> MorphAiUserPrefs:
    prefs, _ = MorphAiUserPrefs.objects.get_or_create(user=user)
    return prefs


def user_allows_chat_persist(user) -> bool:
    prefs = get_or_create_prefs(user)
    return bool(prefs.save_chat_history) and not bool(prefs.privacy_local_only)


def user_allows_look_persist(user) -> bool:
    return bool(get_or_create_prefs(user).persist_looks)


def chat_limits_payload(user_id: int) -> dict[str, Any]:
    from ai.services.gemini_chat import count_user_chat_today

    used = count_user_chat_today(user_id)
    remaining = max(0, MORF_CHAT_DAILY_LIMIT - used)
    return {
        "daily_limit": MORF_CHAT_DAILY_LIMIT,
        "daily_used": used,
        "daily_remaining": remaining,
        "warn_at": CHAT_LIMIT_WARN_AT,
        "should_warn": remaining <= CHAT_LIMIT_WARN_AT,
    }


def serialize_prefs(prefs: MorphAiUserPrefs) -> dict[str, bool]:
    return {name: bool(getattr(prefs, name)) for name in PREF_BOOL_FIELDS}


def apply_prefs_patch(prefs: MorphAiUserPrefs, data: dict[str, Any]) -> MorphAiUserPrefs:
    changed: list[str] = []
    for name in PREF_BOOL_FIELDS:
        if name not in data:
            continue
        raw = data.get(name)
        if raw is None:
            continue
        value = raw is True or raw == 1 or str(raw).strip().lower() in ("1", "true", "yes")
        if bool(getattr(prefs, name)) != value:
            setattr(prefs, name, value)
            changed.append(name)
    if changed:
        prefs.save(update_fields=[*changed, "updated_at"])
    return prefs


def _delete_field_file(field: FieldFile | None) -> None:
    if field is None:
        return
    name = getattr(field, "name", None)
    if not name:
        return
    try:
        field.delete(save=False)
    except Exception:
        logger.exception("Morph media o'chirilmadi: %s", name)


def wipe_chat_threads(*, user_id: int) -> int:
    deleted, _ = MorphAiChatThread.objects.filter(user_id=user_id).delete()
    return int(deleted or 0)


def wipe_looks(*, user_id: int) -> int:
    entries = list(MorphAiGenerationEntry.objects.filter(user_id=user_id))
    for entry in entries:
        _delete_field_file(entry.before_photo)
        _delete_field_file(entry.after_photo)
    deleted, _ = MorphAiGenerationEntry.objects.filter(user_id=user_id).delete()
    return int(deleted or 0)


def wipe_selfies(*, user_id: int) -> int:
    entries = list(AiStyleHistoryEntry.objects.filter(user_id=user_id))
    for entry in entries:
        _delete_field_file(entry.photo)
    deleted, _ = AiStyleHistoryEntry.objects.filter(user_id=user_id).delete()
    return int(deleted or 0)


def wipe_shares(*, user_id: int) -> int:
    entries = list(MorphAiLookShare.objects.filter(created_by_id=user_id))
    for entry in entries:
        _delete_field_file(entry.before_photo)
        _delete_field_file(entry.after_photo)
    deleted, _ = MorphAiLookShare.objects.filter(created_by_id=user_id).delete()
    return int(deleted or 0)


def wipe_user_morph_data(*, user_id: int, kind: str) -> dict[str, int]:
    key = (kind or "").strip().lower()
    out = {"chats": 0, "looks": 0, "selfies": 0, "shares": 0}
    if key in ("chats", "all"):
        out["chats"] = wipe_chat_threads(user_id=user_id)
    if key in ("looks", "all"):
        out["looks"] = wipe_looks(user_id=user_id)
    if key in ("selfies", "all"):
        out["selfies"] = wipe_selfies(user_id=user_id)
    if key in ("shares", "all"):
        out["shares"] = wipe_shares(user_id=user_id)
    if key not in ("chats", "looks", "selfies", "shares", "all"):
        raise ValueError("kind chats, looks, selfies, shares yoki all bo'lishi kerak.")
    return out


def data_counts(*, user_id: int) -> dict[str, int]:
    return {
        "chat_threads": MorphAiChatThread.objects.filter(user_id=user_id).count(),
        "chat_messages": MorphAiChatMessage.objects.filter(thread__user_id=user_id).count(),
        "looks": MorphAiGenerationEntry.objects.filter(user_id=user_id).count(),
        "selfies": AiStyleHistoryEntry.objects.filter(user_id=user_id).count(),
        "shares": MorphAiLookShare.objects.filter(created_by_id=user_id).count(),
    }


def serialize_privacy(user) -> dict[str, Any]:
    prefs = get_or_create_prefs(user)
    return {
        "prefs": serialize_prefs(prefs),
        "limits": chat_limits_payload(user.pk),
        "data": data_counts(user_id=user.pk),
        "updated_at": prefs.updated_at.isoformat() if prefs.updated_at else None,
    }
