"""OTP SMS yuborish.

Hozir: SMS provayder ulanmaguncha kod faqat log + API orqali ilovada (delivery=app).
Production: SMS_PROVIDER=eskiz va ESKIZ_* env.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)


def is_sms_provider_configured() -> bool:
    provider = os.environ.get("SMS_PROVIDER", "").strip().lower()
    if provider == "eskiz":
        return bool(
            os.environ.get("ESKIZ_EMAIL", "").strip()
            and os.environ.get("ESKIZ_PASSWORD", "").strip()
        )
    if provider in ("twilio", "playmobile"):
        return True
    return False


def _send_eskiz_sms(phone: str, message: str) -> None:
    email = os.environ.get("ESKIZ_EMAIL", "").strip()
    password = os.environ.get("ESKIZ_PASSWORD", "").strip()
    if not email or not password:
        raise RuntimeError("ESKIZ_EMAIL va ESKIZ_PASSWORD kerak.")

    token_req = urllib.request.Request(
        "https://notify.eskiz.uz/api/auth/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(token_req, timeout=15) as resp:
        token_body = json.loads(resp.read().decode("utf-8"))
    token = token_body.get("data", {}).get("token")
    if not token:
        raise RuntimeError("Eskiz token olinmadi.")

    sms_req = urllib.request.Request(
        "https://notify.eskiz.uz/api/message/sms/send",
        data=json.dumps({"mobile_phone": phone, "message": message, "from": "4546"}).encode(
            "utf-8"
        ),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(sms_req, timeout=15) as resp:
        if resp.status >= 400:
            raise RuntimeError(f"Eskiz SMS xato: HTTP {resp.status}")


def send_login_otp(phone: str, code: str) -> None:
    provider = os.environ.get("SMS_PROVIDER", "").strip().lower()
    message = f"mysaloon.uz kirish kodi: {code}. Hech kimga bermang."

    if provider == "eskiz" and is_sms_provider_configured():
        try:
            _send_eskiz_sms(phone, message)
            logger.info("Mijoz OTP SMS (eskiz) %s", phone)
            return
        except (urllib.error.URLError, RuntimeError, json.JSONDecodeError) as exc:
            logger.exception("Eskiz SMS yuborilmadi: %s", exc)
            raise

    if provider in ("twilio", "playmobile"):
        logger.warning(
            "SMS_PROVIDER=%s hali implement qilinmagan; kod faqat logda.",
            provider,
        )

    logger.info("Mijoz OTP (SMS ulanmagan, ilovada ko'rsatiladi) %s -> %s", phone, code)
