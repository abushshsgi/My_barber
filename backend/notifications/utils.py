from django.conf import settings
from django.core.mail import send_mail

from barbers.models import Barber

from .models import Notification


def notify_user(user, type_: str, title: str, body: str = "", payload=None, send_email: bool = False):
    Notification.objects.create(
        user=user,
        barber=None,
        type=type_,
        title=title,
        body=body,
        payload=payload or {},
    )
    if send_email and user.email:
        try:
            send_mail(
                title,
                body or title,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
        except Exception:
            pass


def notify_barber(
    barber: Barber,
    type_: str,
    title: str,
    body: str = "",
    payload=None,
    send_email: bool = False,
):
    Notification.objects.create(
        user=None,
        barber=barber,
        type=type_,
        title=title,
        body=body,
        payload=payload or {},
    )
    if send_email and barber.email:
        try:
            send_mail(
                title,
                body or title,
                settings.DEFAULT_FROM_EMAIL,
                [barber.email],
                fail_silently=True,
            )
        except Exception:
            pass

