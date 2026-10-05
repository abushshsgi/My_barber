"""OTP yuborish (SMS / Telegram Gateway).

Production:
  SMS_PROVIDER=eskiz + ESKIZ_*
  yoki SMS_PROVIDER=telegram + TELEGRAM_GATEWAY_TOKEN
  (gateway.telegram.org)
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Literal

logger = logging.getLogger(__name__)

DeliveryChannel = Literal["sms", "telegram", "app"]


def _provider() -> str:
    return os.environ.get("SMS_PROVIDER", "").strip().lower()


def is_sms_provider_configured() -> bool:
    """OTP tashqi kanalga (SMS yoki Telegram) yuboriladi mi."""
    provider = _provider()
    if provider == "eskiz":
        return bool(
            os.environ.get("ESKIZ_EMAIL", "").strip()
            and os.environ.get("ESKIZ_PASSWORD", "").strip()
        )
    if provider in ("telegram", "telegram_gateway"):
        return bool(os.environ.get("TELEGRAM_GATEWAY_TOKEN", "").strip())
    if provider in ("twilio", "playmobile"):
        return True
    return False


def otp_delivery_channel() -> DeliveryChannel:
    if not is_sms_provider_configured():
        return "app"
    provider = _provider()
    if provider in ("telegram", "telegram_gateway"):
        return "telegram"
    return "sms"


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


def _send_telegram_gateway(phone: str, code: str) -> None:
    """Telegram Gateway — kod Telegramdagi «Verification Codes» chatiga."""
    token = os.environ.get("TELEGRAM_GATEWAY_TOKEN", "").strip()
    if not token:
        raise RuntimeError("TELEGRAM_GATEWAY_TOKEN kerak.")

    payload: dict[str, str | int] = {
        "phone_number": phone,
        "code": code,
        "ttl": 300,
    }
    sender = os.environ.get("TELEGRAM_GATEWAY_SENDER_USERNAME", "").strip().lstrip("@")
    if sender:
        payload["sender_username"] = sender

    req = urllib.request.Request(
        "https://gatewayapi.telegram.org/sendVerificationMessage",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err_body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(err_body)
            detail = parsed.get("error") or err_body
        except json.JSONDecodeError:
            detail = err_body or str(exc)
        raise RuntimeError(f"Telegram Gateway HTTP {exc.code}: {detail}") from exc

    if not body.get("ok"):
        raise RuntimeError(f"Telegram Gateway xato: {body.get('error', body)}")


def send_login_otp(phone: str, code: str) -> None:
    provider = _provider()
    message = f"mysaloon.uz kirish kodi: {code}. Hech kimga bermang."

    if provider == "eskiz" and is_sms_provider_configured():
        try:
            _send_eskiz_sms(phone, message)
            logger.info("Mijoz OTP SMS (eskiz) %s", phone)
            return
        except (urllib.error.URLError, RuntimeError, json.JSONDecodeError) as exc:
            logger.exception("Eskiz SMS yuborilmadi: %s", exc)
            raise

    if provider in ("telegram", "telegram_gateway") and is_sms_provider_configured():
        try:
            _send_telegram_gateway(phone, code)
            logger.info("Mijoz OTP Telegram Gateway %s", phone)
            return
        except (urllib.error.URLError, RuntimeError, json.JSONDecodeError) as exc:
            logger.exception("Telegram Gateway OTP yuborilmadi: %s", exc)
            raise

    if provider in ("twilio", "playmobile"):
        logger.warning(
            "SMS_PROVIDER=%s hali implement qilinmagan; kod faqat logda.",
            provider,
        )

    logger.info("Mijoz OTP (SMS ulanmagan, ilovada ko'rsatiladi) %s -> %s", phone, code)
