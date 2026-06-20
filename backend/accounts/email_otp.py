"""Email OTP — yangi email manzilini tasdiqlash."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import time

from django.conf import settings
from django.core.cache import cache

OTP_TTL_SECONDS = 900
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

_PENDING_KEY = "email_otp:pending:"
_CODE_KEY = "email_otp:code:"
_ATTEMPTS_KEY = "email_otp:attempts:"
_SENT_KEY = "email_otp:sent:"


def _pepper() -> bytes:
    return settings.SECRET_KEY.encode()


def generate_email_otp() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def set_pending_email(user_id: int, email: str) -> None:
    cache.set(f"{_PENDING_KEY}{user_id}", email.strip().lower(), timeout=OTP_TTL_SECONDS)


def get_pending_email(user_id: int) -> str | None:
    return cache.get(f"{_PENDING_KEY}{user_id}")


def clear_pending_email(user_id: int) -> None:
    cache.delete(f"{_PENDING_KEY}{user_id}")


def store_email_otp(user_id: int, code: str) -> None:
    digest = hmac.new(_pepper(), code.encode(), hashlib.sha256).hexdigest()
    cache.set(f"{_CODE_KEY}{user_id}", digest, timeout=OTP_TTL_SECONDS)


def mark_email_otp_sent(user_id: int) -> None:
    cache.set(f"{_SENT_KEY}{user_id}", int(time.time()), timeout=OTP_RESEND_COOLDOWN_SECONDS)


def resend_blocked(user_id: int) -> bool:
    return cache.get(f"{_SENT_KEY}{user_id}") is not None


def resend_seconds_remaining(user_id: int) -> int | None:
    sent_at = cache.get(f"{_SENT_KEY}{user_id}")
    if sent_at is None:
        return None
    remaining = OTP_RESEND_COOLDOWN_SECONDS - (int(time.time()) - int(sent_at))
    return max(0, remaining)


def verify_email_otp(user_id: int, code: str) -> tuple[bool, str]:
    code = (code or "").strip()
    if len(code) != 6 or not code.isdigit():
        return False, "6 raqamli kodni kiriting."

    attempts_key = f"{_ATTEMPTS_KEY}{user_id}"
    attempts = int(cache.get(attempts_key) or 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        return False, "Juda ko'p noto'g'ri urinish. Yangi kod so'rang."

    digest = cache.get(f"{_CODE_KEY}{user_id}")
    if not digest:
        return False, "Kod muddati tugagan. Yangi kod so'rang."

    expected = hmac.new(_pepper(), code.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(digest, expected):
        cache.set(attempts_key, attempts + 1, timeout=OTP_TTL_SECONDS)
        return False, "Kod noto'g'ri."

    cache.delete(f"{_CODE_KEY}{user_id}")
    cache.delete(attempts_key)
    return True, ""
