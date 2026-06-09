"""Telefon bandligi — mijoz va sartarosh o'rtasida markaziy tekshiruv."""

from __future__ import annotations

from accounts.models import User
from accounts.phone_auth import normalize_uz_phone, phone_to_internal_email
from barbers.models import Barber

PHONE_ALREADY_REGISTERED = (
    "Bu raqamdan allaqachon akkaunt ochilgan. Kirish uchun davom eting."
)
PHONE_TAKEN_BY_BARBER = (
    "Bu raqam sartarosh akkauntiga biriktirilgan. Sartarosh ilovasidan kiring."
)


def phone_taken_by_customer(phone: str) -> bool:
    if User.objects.filter(phone=phone, role=User.Role.USER).exists():
        return True
    email = phone_to_internal_email(phone)
    return User.objects.filter(email__iexact=email, role=User.Role.USER).exists()


def phone_taken_by_barber(phone: str) -> bool:
    if Barber.objects.filter(phone=phone).exists():
        return True
    digits = phone.lstrip("+")
    if digits.startswith("998") and len(digits) == 12:
        local = digits[3:]
        return Barber.objects.filter(phone__in=[phone, local, f"+{digits}"]).exists()
    return False


def customer_has_account(phone: str) -> bool:
    return phone_taken_by_customer(phone)


def barber_blocks_customer_signup(phone: str) -> bool:
    return phone_taken_by_barber(phone) and not phone_taken_by_customer(phone)


def customer_signup_blocked_reason(phone: str, intent: str) -> str | None:
    """Mijoz OTP/register uchun blok sababi yoki None."""
    if intent == "register" and phone_taken_by_customer(phone):
        return PHONE_ALREADY_REGISTERED
    if barber_blocks_customer_signup(phone):
        return PHONE_TAKEN_BY_BARBER
    return None


def normalize_phone_field(raw: str | None) -> str | None:
    """Serializer va signup uchun — bo'sh yoki normalizatsiya qilingan +998…"""
    value = (raw or "").strip()
    if not value:
        return None
    return normalize_uz_phone(value)
