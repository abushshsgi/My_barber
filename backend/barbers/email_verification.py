"""Stateless email tasdiq tokeni (TimestampSigner)."""

from __future__ import annotations

from django.conf import settings
from django.core import signing

SALT = "barber-email-verify"
MAX_AGE_SECONDS = 7 * 24 * 3600


def sign_barber_email_token(barber_id: int) -> str:
    signer = signing.TimestampSigner(salt=SALT)
    return signer.sign(str(barber_id))


def unsign_barber_email_token(token: str) -> int | None:
    signer = signing.TimestampSigner(salt=SALT)
    try:
        raw = signer.unsign(token, max_age=MAX_AGE_SECONDS)
        return int(raw)
    except (signing.BadSignature, signing.SignatureExpired, ValueError):
        return None
