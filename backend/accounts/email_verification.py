"""Mijoz email tasdiq tokeni (TimestampSigner)."""

from __future__ import annotations

from django.core import signing

SALT = "customer-email-verify"
MAX_AGE_SECONDS = 24 * 3600


def sign_customer_email_token(user_id: int, email: str) -> str:
    signer = signing.TimestampSigner(salt=SALT)
    return signer.sign(f"{user_id}:{email.strip().lower()}")


def unsign_customer_email_token(token: str) -> tuple[int, str] | None:
    signer = signing.TimestampSigner(salt=SALT)
    try:
        raw = signer.unsign(token, max_age=MAX_AGE_SECONDS)
        user_id_str, email = raw.split(":", 1)
        return int(user_id_str), email
    except (signing.BadSignature, signing.SignatureExpired, ValueError):
        return None
