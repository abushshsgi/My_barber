from __future__ import annotations

import concurrent.futures
import logging

from django.conf import settings
from django.core.mail import send_mail

from barbers.email_verification import sign_barber_email_token
from barbers.models import Barber

logger = logging.getLogger(__name__)

_MAIL_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=2,
    thread_name_prefix="barber-mail",
)


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
    web_link = f"{base}/barber/verify-email?token={token}"
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


def maybe_schedule_verification_email_when_setup_complete(barber_id: int) -> None:
    """
    Ro‘yxatdan o‘tishda emas: profil sozlamalari (signup + xizmatlar + jadval) tugaganda
    bir marta tasdiq xatini yuborish.
    """
    from django.db import transaction
    from django.utils import timezone

    from barbers.readiness import compute_barber_readiness

    should_send = False
    with transaction.atomic():
        b = (
            Barber.objects.select_for_update()
            .filter(pk=barber_id, is_active=True)
            .first()
        )
        if not b or b.email_verified_at is not None:
            return
        if b.email_verification_invite_sent_at is not None:
            return
        r = compute_barber_readiness(b)
        if not (r.signup_complete and r.services_ok and r.schedule_ok):
            return
        Barber.objects.filter(pk=b.pk).update(
            email_verification_invite_sent_at=timezone.now(),
        )
        should_send = True

    if should_send:
        b2 = Barber.objects.filter(pk=barber_id, is_active=True).first()
        if b2 and b2.email_verified_at is None:
            send_barber_email_verification_async(b2)
