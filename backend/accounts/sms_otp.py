"""OTP SMS yuborish.

Hozir: SMS provayder ulanmaguncha kod faqat log + API orqali ilovada (delivery=app).
Keyin: SMS_PROVIDER=eskiz va ESKIZ_* env — shu modulda provayder chaqiriladi.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def is_sms_provider_configured() -> bool:
    """True bo‘lsa — haqiqiy SMS yuboriladi (keyin shu yerda Eskiz/Twilio)."""
    provider = os.environ.get("SMS_PROVIDER", "").strip().lower()
    if provider in ("eskiz", "twilio", "playmobile"):
        return True
    return False


def send_login_otp(phone: str, code: str) -> None:
    if is_sms_provider_configured():
        # TODO: SMS_PROVIDER bo‘yicha provayder chaqiruv — keyingi bosqich.
        logger.info("Mijoz OTP SMS (provider=%s) %s", os.environ.get("SMS_PROVIDER"), phone)
        return

    logger.info("Mijoz OTP (SMS ulanmagan, ilovada ko‘rsatiladi) %s -> %s", phone, code)
