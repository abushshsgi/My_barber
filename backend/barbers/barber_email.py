from __future__ import annotations

import concurrent.futures
import logging
import os

from django.conf import settings
from django.core.mail import send_mail

from accounts.email_utils import is_internal_email
from barbers.email_verification import sign_barber_email_token
from barbers.models import Barber

logger = logging.getLogger(__name__)

PROD_BARBER_WEB_BASE = "https://partner.mysaloon.uz"


def barber_has_verifiable_email(barber: Barber) -> bool:
    """Haqiqiy pochta — telefon-only ichki @phone.mysaloon.local emas."""
    return bool((barber.email or "").strip()) and not is_internal_email(barber.email)


_MAIL_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=2,
    thread_name_prefix="barber-mail",
)


def _is_local_web_base(base: str) -> bool:
    lower = (base or "").lower()
    return (
        "localhost" in lower
        or "127.0.0.1" in lower
        or "0.0.0.0" in lower
        or "[::1]" in lower
    )


def resolve_barber_web_base() -> str:
    """
    Email ichidagi veb havola — productionda hech qachon localhost emas.
    FRONTEND_BARBER_ORIGIN da localhost birinchi turgan bo‘lsa ham o‘tkazib yuboradi.
    """
    base = (getattr(settings, "BARBER_APP_PUBLIC_BASE", "") or "").strip().rstrip("/")
    if base and not _is_local_web_base(base):
        return base

    raw = (os.environ.get("FRONTEND_BARBER_ORIGIN") or "").strip()
    for part in raw.split(","):
        cleaned = part.strip().strip('"').strip("'").rstrip("/")
        if cleaned and not _is_local_web_base(cleaned):
            return cleaned

    if settings.DEBUG:
        if base:
            return base
        return "http://localhost:3003"

    if base and _is_local_web_base(base):
        logger.error(
            "BARBER_APP_PUBLIC_BASE localhost (%s) — prod fallback %s. "
            "Railway FRONTEND_BARBER_ORIGIN=https://partner.mysaloon.uz qiling.",
            base,
            PROD_BARBER_WEB_BASE,
        )
    return PROD_BARBER_WEB_BASE


def send_barber_email_verification(barber: Barber) -> tuple[bool, str | None]:
    """
    Tasdiq havolasi yuboriladi.
    Returns (ok, error_message). Ro'yxatdan o'tish baribir muvaffaqiyatli bo'lishi uchun xato raise qilinmaydi.
    """
    if barber.email_verified_at is not None:
        return True, None
    if not barber_has_verifiable_email(barber):
        return False, "Telefon orqali ro‘yxatdan o‘tgan akkaunt — email tasdiqlash talab qilinmaydi."

    base = resolve_barber_web_base()
    token = sign_barber_email_token(barber.id)
    web_link = f"{base}/verify-email?token={token}"
    scheme = getattr(settings, "BARBER_MOBILE_VERIFY_SCHEME", "mysaloonpartner")
    mobile_link = f"{scheme}://verify-email?token={token}"
    subject = "MySaloon — email manzilingizni tasdiqlang"
    body = (
        f"Salom{', ' + barber.full_name if barber.full_name else ''}!\n\n"
        "Email manzilingizni tasdiqlash uchun quyidagi havolalardan birini bosing.\n\n"
        f"📱 Partner mobil ilova (tavsiya etiladi):\n{mobile_link}\n\n"
        f"🌐 Veb-brauzer (kompyuter yoki ilova o‘rnatilmagan bo‘lsa):\n{web_link}\n\n"
        "Mobil telefonda ilovadan ro‘yxatdan o‘tgan bo‘lsangiz, birinchi (📱) havolani bosing — "
        "brauzer o‘rniga MySaloon Partner ilovasi ochiladi.\n\n"
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


def send_barber_email_verification_async(barber: Barber) -> None:
    """Ro'yxatdan o'tish HTTP javobini SMTP kutib qotirmaslik uchun."""
    backend = getattr(settings, "EMAIL_BACKEND", "") or ""
    if "locmem" in backend:
        send_barber_email_verification(barber)
        return
    _MAIL_EXECUTOR.submit(send_barber_email_verification, barber)


def send_barber_email_verification_with_timeout(
    barber: Barber,
    *,
    timeout: float = 25,
) -> tuple[bool, str | None]:
    """Resend endpoint: SMTP bloklamasligi uchun alohida threadda."""
    future = _MAIL_EXECUTOR.submit(send_barber_email_verification, barber)
    return future.result(timeout=timeout)


def maybe_schedule_verification_email_once(barber_id: int) -> None:
    """Email tasdiqlash o‘chirilgan — avtomatik xat yuborilmaydi."""
    return


def maybe_schedule_verification_email_when_setup_complete(barber_id: int) -> None:
    """Eski nom — endi setup tugashini kutmay, bir marta yuboradi."""
    maybe_schedule_verification_email_once(barber_id)
