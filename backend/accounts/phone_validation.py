"""O'zbekiston mobil telefon — barber signup/login uchun qat'iy tekshiruv."""

from __future__ import annotations

from accounts.phone_auth import normalize_uz_phone

# Asosiy mobil operator kodlari (+998 dan keyin 2 xona)
UZ_MOBILE_PREFIXES = frozenset(
    {
        "20",
        "22",
        "33",
        "50",
        "77",
        "78",
        "88",
        "90",
        "91",
        "93",
        "94",
        "95",
        "97",
        "98",
        "99",
    }
)


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
    local = normalized[4:]
    if len(local) != 9:
        return None, "Telefon 9 ta raqamdan iborat bo'lishi kerak."
    if local[:2] not in UZ_MOBILE_PREFIXES:
        return None, "O'zbekiston mobil raqami kiriting."
    return normalized, None
