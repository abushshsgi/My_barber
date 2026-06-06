"""OTP SMS yuborish (hozir log; keyin Eskiz/Twilio)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def send_login_otp(phone: str, code: str) -> None:
    # Production: SMS provayder shu yerda ulanadi.
    logger.info("Mijoz OTP %s -> %s", phone, code)
