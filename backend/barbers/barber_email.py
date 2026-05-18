from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from barbers.email_verification import sign_barber_email_token
from barbers.models import Barber

logger = logging.getLogger(__name__)


def send_barber_email_verification(barber: Barber) -> tuple[bool, str | None]:
    """
    Tasdiq havolasi yuboriladi.
    Returns (ok, error_message). Ro'yxatdan o'tish baribir muvaffaqiyatli bo'lishi uchun xato raise qilinmaydi.
    """
    if barber.email_verified_at is not None:
        return True, None

    base = getattr(settings, "BARBER_APP_PUBLIC_BASE", "").strip().rstrip("/")
    if not base:
        base = "http://localhost:5173"
        if not settings.DEBUG:
            logger.warning(
                "FRONTEND_BARBER_ORIGIN/BARBER_APP_PUBLIC_BASE o'rnatilmagan — "
                "email havolasi localhost ga ketmoqda."
            )

    token = sign_barber_email_token(barber.id)
    link = f"{base}/barber/verify-email?token={token}"
    subject = "MySaloon — email manzilingizni tasdiqlang"
    body = (
        f"Salom{', ' + barber.full_name if barber.full_name else ''}!\n\n"
        f"Email manzilingizni tasdiqlash uchun quyidagi havolani bosing:\n{link}\n\n"
        "Agar siz bu so‘rovni yubormagan bo‘lsangiz, xabarni e’tiborsiz qoldiring."
    )
    from_email = getattr(settings, "BARBER_FROM_EMAIL", settings.DEFAULT_FROM_EMAIL)

    try:
        send_mail(
            subject,
            body,
            from_email,
            [barber.email],
            fail_silently=False,
        )
        return True, None
    except Exception as exc:
        logger.exception(
            "Barber verification email failed (barber_id=%s, to=%s)",
            barber.pk,
            barber.email,
        )
        return False, str(exc)
