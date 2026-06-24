"""O'zbekiston telefon — +998 va 9 ta raqam (operator kodi cheklanmaydi)."""

from __future__ import annotations

from accounts.phone_auth import normalize_uz_phone, phone_to_internal_email


def validate_uz_mobile_phone(raw: str | None) -> tuple[str | None, str | None]:
    """
    (normalized +998…, None) yoki (None, xato matni).
    Bir xil raqam har doim +998XXXXXXXXX ko'rinishida qaytariladi.
    """
    value = (raw or "").strip()
    if not value:
        return None, "Telefon raqami majburiy."
    normalized = normalize_uz_phone(value)
    if not normalized:
        return None, "Telefon noto'g'ri. +998 va 9 ta raqam kiriting."
    return normalized, None


def resolve_barber_signup_contact(
    email: str | None,
    phone: str | None,
) -> tuple[str, str, str | None]:
    """
    Barber signup: email yoki telefon (kamida bittasi).
    Faqat telefon bo'lsa — ichki email generatsiya qilinadi.
    """
    resolved_email = (email or "").strip().lower()
    phone_raw = (phone or "").strip()
    resolved_phone = ""

    if phone_raw:
        normalized, err = validate_uz_mobile_phone(phone_raw)
        if err:
            return "", "", err
        assert normalized is not None
        resolved_phone = normalized

    if not resolved_email and not resolved_phone:
        return "", "", "Email yoki telefon kiriting — kamida bittasi majburiy."

    if not resolved_email:
        resolved_email = phone_to_internal_email(resolved_phone)

    return resolved_email, resolved_phone, None
