"""Telefon + OTP — mijoz ilovasi uchun kirish/ro'yxatdan o'tish."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import time

from django.conf import settings
from django.core.cache import cache

OTP_TTL_SECONDS = 300
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5
OTP_DAILY_SEND_LIMIT = 12

PASSWORD_MAX_ATTEMPTS = 5
PASSWORD_LOCK_SECONDS = 900

_CODE_KEY = "phone_otp:code:"
_ATTEMPTS_KEY = "phone_otp:attempts:"
_SENT_KEY = "phone_otp:sent:"
_DAILY_SEND_KEY = "phone_otp:daily:"
_PW_FAIL_KEY = "phone_auth:pw_fail:"
_PW_LOCK_KEY = "phone_auth:pw_lock:"


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


def _otp_pepper() -> bytes:
    return settings.SECRET_KEY.encode()


def hash_otp_code(code: str) -> str:
    return hmac.new(_otp_pepper(), code.encode(), hashlib.sha256).hexdigest()


def store_otp(phone: str, code: str) -> None:
    cache.set(f"{_CODE_KEY}{phone}", hash_otp_code(code), OTP_TTL_SECONDS)
    cache.set(f"{_ATTEMPTS_KEY}{phone}", 0, OTP_TTL_SECONDS)


def verify_otp(phone: str, code: str) -> tuple[bool, str | None]:
    stored = cache.get(f"{_CODE_KEY}{phone}")
    if not stored:
        return False, "Kod muddati tugagan yoki yuborilmagan. Yangi kod so'rang."

    attempts = int(cache.get(f"{_ATTEMPTS_KEY}{phone}", 0) or 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        cache.delete(f"{_CODE_KEY}{phone}")
        return False, "Juda ko'p noto'g'ri urinish. Yangi kod so'rang."

    submitted = (code or "").strip()
    if not hmac.compare_digest(stored, hash_otp_code(submitted)):
        cache.set(f"{_ATTEMPTS_KEY}{phone}", attempts + 1, OTP_TTL_SECONDS)
        return False, "Noto'g'ri kod."

    cache.delete(f"{_CODE_KEY}{phone}")
    cache.delete(f"{_ATTEMPTS_KEY}{phone}")
    return True, None


def resend_seconds_remaining(phone: str) -> int:
    expires_at = cache.get(f"{_SENT_KEY}{phone}")
    if not expires_at:
        return 0
    try:
        remaining = int(float(expires_at) - time.time())
    except (TypeError, ValueError):
        return 0
    return max(0, remaining)


def resend_blocked(phone: str) -> bool:
    return resend_seconds_remaining(phone) > 0


def mark_otp_sent(phone: str) -> None:
    expires_at = time.time() + OTP_RESEND_COOLDOWN_SECONDS
    cache.set(f"{_SENT_KEY}{phone}", expires_at, OTP_RESEND_COOLDOWN_SECONDS)


def daily_send_count(phone: str) -> int:
    return int(cache.get(f"{_DAILY_SEND_KEY}{phone}", 0) or 0)


def daily_send_blocked(phone: str) -> bool:
    return daily_send_count(phone) >= OTP_DAILY_SEND_LIMIT


def increment_daily_send(phone: str) -> int:
    key = f"{_DAILY_SEND_KEY}{phone}"
    count = daily_send_count(phone) + 1
    cache.set(key, count, 86400)
    return count


def password_lock_seconds_remaining(phone: str) -> int:
    expires_at = cache.get(f"{_PW_LOCK_KEY}{phone}")
    if not expires_at:
        return 0
    try:
        remaining = int(float(expires_at) - time.time())
    except (TypeError, ValueError):
        return 0
    return max(0, remaining)


def password_login_locked(phone: str) -> bool:
    return password_lock_seconds_remaining(phone) > 0


def record_password_failure(phone: str) -> int:
    fail_key = f"{_PW_FAIL_KEY}{phone}"
    fails = int(cache.get(fail_key, 0) or 0) + 1
    cache.set(fail_key, fails, PASSWORD_LOCK_SECONDS)
    if fails >= PASSWORD_MAX_ATTEMPTS:
        lock_until = time.time() + PASSWORD_LOCK_SECONDS
        cache.set(f"{_PW_LOCK_KEY}{phone}", lock_until, PASSWORD_LOCK_SECONDS)
        cache.delete(fail_key)
        return password_lock_seconds_remaining(phone) or PASSWORD_LOCK_SECONDS
    return 0


def clear_password_failures(phone: str) -> None:
    cache.delete(f"{_PW_FAIL_KEY}{phone}")
    cache.delete(f"{_PW_LOCK_KEY}{phone}")
