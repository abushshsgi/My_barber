"""Telefon + OTP — mijoz ilovasi uchun kirish/ro'yxatdan o'tish."""

from __future__ import annotations

import re
import secrets

from django.core.cache import cache

OTP_TTL_SECONDS = 300
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

_CODE_KEY = "phone_otp:code:"
_ATTEMPTS_KEY = "phone_otp:attempts:"
_SENT_KEY = "phone_otp:sent:"


def normalize_uz_phone(raw: str | None) -> str | None:
    """9 xonali raqam yoki +998… -> +998XXXXXXXXX."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("998") and len(digits) == 12:
        digits = digits[3:]
    if len(digits) != 9:
        return None
    return f"+998{digits}"


def phone_to_internal_email(phone: str) -> str:
    return f"{phone.lstrip('+')}@phone.mysaloon.local"


def generate_otp_code() -> str:
    return f"{secrets.randbelow(10000):04d}"


def store_otp(phone: str, code: str) -> None:
    cache.set(f"{_CODE_KEY}{phone}", code, OTP_TTL_SECONDS)
    cache.set(f"{_ATTEMPTS_KEY}{phone}", 0, OTP_TTL_SECONDS)


def verify_otp(phone: str, code: str) -> tuple[bool, str | None]:
    stored = cache.get(f"{_CODE_KEY}{phone}")
    if not stored:
        return False, "Kod muddati tugagan yoki yuborilmagan. Yangi kod so'rang."

    attempts = int(cache.get(f"{_ATTEMPTS_KEY}{phone}", 0) or 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        return False, "Juda ko'p noto'g'ri urinish. Yangi kod so'rang."

    submitted = (code or "").strip()
    if stored != submitted:
        cache.set(f"{_ATTEMPTS_KEY}{phone}", attempts + 1, OTP_TTL_SECONDS)
        return False, "Noto'g'ri kod."

    cache.delete(f"{_CODE_KEY}{phone}")
    cache.delete(f"{_ATTEMPTS_KEY}{phone}")
    return True, None


def resend_blocked(phone: str) -> bool:
    return bool(cache.get(f"{_SENT_KEY}{phone}"))


def mark_otp_sent(phone: str) -> None:
    cache.set(f"{_SENT_KEY}{phone}", 1, OTP_RESEND_COOLDOWN_SECONDS)
