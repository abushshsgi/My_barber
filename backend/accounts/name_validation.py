"""Rasmiy ism (full_name) validatsiyasi — profil va sozlamalar."""

from __future__ import annotations

import re

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError

DISPLAY_NAME_MAX_LEN = 255
MIN_NAME_PART_LEN = 2
MAX_NAME_PARTS = 4

_NAME_SEPARATORS = {" ", "-", "'", "\u02bb", "\u2019"}
_MULTI_SPACE = re.compile(r"\s+")


def normalize_display_name(value: str) -> str:
    return _MULTI_SPACE.sub(" ", (value or "").strip())


def _char_allowed(ch: str) -> bool:
    if ch in _NAME_SEPARATORS:
        return True
    return ch.isalpha()


def display_name_has_invalid_chars(value: str) -> bool:
    return any(not _char_allowed(ch) for ch in value)


def validate_display_name(value: str, *, exclude_user_id: int | None = None) -> str:
    normalized = normalize_display_name(value)
    if not normalized:
        raise ValidationError("Ism bo'sh bo'lmasligi kerak.")

    if len(normalized) > DISPLAY_NAME_MAX_LEN:
        raise ValidationError(f"Ism {DISPLAY_NAME_MAX_LEN} belgidan oshmasligi kerak.")

    if display_name_has_invalid_chars(normalized):
        raise ValidationError(
            "Faqat harflar, bo'sh joy, defis (-) va apostrof (') ishlatiladi."
        )

    parts = normalized.split()
    if len(parts) < 2:
        raise ValidationError("Ism va familiyani to'liq kiriting (kamida 2 so'z).")

    if len(parts) > MAX_NAME_PARTS:
        raise ValidationError(f"Ism {MAX_NAME_PARTS} so'zdan oshmasligi kerak.")

    for part in parts:
        letters_only = part.replace("-", "").replace("'", "").replace("\u02bb", "").replace("\u2019", "")
        if len(letters_only) < MIN_NAME_PART_LEN:
            raise ValidationError(
                f"Har bir qism kamida {MIN_NAME_PART_LEN} ta harfdan iborat bo'lishi kerak."
            )

    if is_display_name_taken(normalized, exclude_user_id=exclude_user_id):
        raise ValidationError("Bu ism allaqachon band. Boshqa ism tanlang.")

    return normalized


def is_display_name_taken(name: str, *, exclude_user_id: int | None = None) -> bool:
    from accounts.models import User
    from barbers.models import Barber

    normalized = normalize_display_name(name)
    if not normalized:
        return False

    user_qs = User.objects.filter(full_name__iexact=normalized).exclude(full_name="")
    if exclude_user_id is not None:
        user_qs = user_qs.exclude(pk=exclude_user_id)
    if user_qs.exists():
        return True

    return Barber.objects.filter(full_name__iexact=normalized).exclude(full_name="").exists()


def validate_display_name_django(value: str, *, exclude_user_id: int | None = None) -> str:
    try:
        return validate_display_name(value, exclude_user_id=exclude_user_id)
    except ValidationError as exc:
        detail = exc.detail
        if isinstance(detail, list):
            msg = str(detail[0])
        else:
            msg = str(detail)
        raise DjangoValidationError(msg) from exc
