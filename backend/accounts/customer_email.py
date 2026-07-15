"""Mijoz email tasdiq xatlari."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from accounts.email_verification import sign_customer_email_token
from accounts.referral import user_app_public_base

logger = logging.getLogger(__name__)


def send_customer_email_verification(user_id: int, email: str, code: str) -> tuple[bool, str | None]:
    token = sign_customer_email_token(user_id, email)
    base = user_app_public_base()
    verify_link = f"{base}/verify-email?token={token}"

    subject = "MySaloon — email manzilingizni tasdiqlang"
    body = (
        "Salom!\n\n"
        "Email manzilingizni tasdiqlash uchun quyidagi usullardan birini tanlang.\n\n"
        f"🔗 Havola orqali (tavsiya etiladi):\n{verify_link}\n\n"
        f"🔢 Yoki ilovada 6 raqamli kodni kiriting: {code}\n\n"
        "Agar siz bu so'rovni yubormagan bo'lsangiz, xabarni e'tiborsiz qoldiring."
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@mybarber.local")

    try:
        send_mail(subject, body, from_email, [email], fail_silently=False)
        return True, None
    except Exception as exc:
        logger.exception("Customer email verification failed (user_id=%s, to=%s)", user_id, email)
        return False, str(exc)
