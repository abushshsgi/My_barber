from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail

from barbers.email_verification import sign_barber_email_token
from barbers.models import Barber


def send_barber_email_verification(barber: Barber) -> None:
    """Tasdiq havolasi yuboriladi (email allaqachon tasdiqlangan bo‘lsa hech narsa qilmaydi)."""
    if barber.email_verified_at is not None:
        return
    base = getattr(settings, "BARBER_APP_PUBLIC_BASE", "http://localhost:5173").rstrip("/")
    token = sign_barber_email_token(barber.id)
    link = f"{base}/barber/verify-email?token={token}"
    subject = "MyBarber — email manzilingizni tasdiqlang"
    body = (
        f"Salom{', ' + barber.full_name if barber.full_name else ''}!\n\n"
        f"Email manzilingizni tasdiqlash uchun quyidagi havolani bosing:\n{link}\n\n"
        "Agar siz bu so‘rovni yubormagan bo‘lsangiz, xabarni e’tiborsiz qoldiring."
    )
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [barber.email],
        fail_silently=True,
    )
