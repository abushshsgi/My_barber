from django.conf import settings
from django.core.mail import send_mail

from barbers.models import Barber

from .expo_push import send_barber_expo_push
from .models import Notification
from .ws_broadcast import push_ws_barber, push_ws_user


def _ws_payload(n: Notification) -> dict:
    return {
        "event": "notification",
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "payload": n.payload or {},
        "created_at": n.created_at.isoformat(),
    }


def notify_user(user, type_: str, title: str, body: str = "", payload=None, send_email: bool = False):
    n = Notification.objects.create(
        user=user,
        barber=None,
        type=type_,
        title=title,
        body=body,
        payload=payload or {},
    )
    push_ws_user(user.id, _ws_payload(n))
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
    n = Notification.objects.create(
        user=None,
        barber=barber,
        type=type_,
        title=title,
        body=body,
        payload=payload or {},
    )
    push_ws_barber(barber.id, _ws_payload(n))
    send_barber_expo_push(
        barber,
        title=title,
        body=body or title,
        payload={**(payload or {}), "notification_id": n.id, "type": type_},
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

