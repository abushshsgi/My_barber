"""Mijoz email yordamchilari — sintetik telefon emailini ajratish."""

from __future__ import annotations

INTERNAL_EMAIL_SUFFIX = "@phone.mysaloon.local"


def is_internal_email(email: str | None) -> bool:
    value = (email or "").strip().lower()
    return value.endswith(INTERNAL_EMAIL_SUFFIX)


def normalize_customer_email(raw: str | None) -> str | None:
    value = (raw or "").strip().lower()
    if not value or "@" not in value:
        return None
    if is_internal_email(value):
        return None
    return value
