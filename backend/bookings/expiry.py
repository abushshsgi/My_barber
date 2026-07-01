"""Pending bronlarni sartarosh javobsiz qoldirsa avtomatik bekor qilish."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from bookings.policy import BOOKING_CANCEL_WINDOW_MINUTES

logger = logging.getLogger(__name__)

BOOKING_PENDING_RESPONSE_MINUTES = BOOKING_CANCEL_WINDOW_MINUTES


def _pending_booking_qs(*, with_related: bool = True):
    from bookings.models import Booking

    from bookings.db_compat import booking_queryset_compat

    qs = booking_queryset_compat(Booking.objects)
    if with_related:
        qs = qs.select_related("customer", "barber", "salon")
    return qs


def pending_response_deadline(booking, *, now=None):
    """Sartarosh qabul qilishi kerak bo'lgan oxirgi vaqt."""
    if not booking.created_at:
        return None
    return booking.created_at + timedelta(minutes=BOOKING_PENDING_RESPONSE_MINUTES)


def is_pending_response_expired(booking, *, now=None) -> bool:
    from bookings.models import Booking

    now = now or timezone.now()
    if booking.status != Booking.Status.PENDING:
        return False
    deadline = pending_response_deadline(booking, now=now)
    if deadline is None:
        return True
    return now >= deadline


def auto_cancel_pending_no_response(booking, *, now=None) -> bool:
    """
    Pending bron muddati tugagan bo'lsa bekor qiladi.
    True = hozir bekor qilindi yoki allaqachon bekor qilingan.
    """
    from bookings.models import Booking

    now = now or timezone.now()
    if booking.status != Booking.Status.PENDING:
        return booking.status == Booking.Status.CANCELLED
    if not is_pending_response_expired(booking, now=now):
        return False

    try:
        from bookings.db_compat import bookings_has_check_in_token_column
        from bookings.payments import maybe_refund_booking
        from bookings.ws_broadcast import broadcast_booking_updated
        from notifications.utils import notify_barber, notify_user

        maybe_refund_booking(booking)
        booking.status = Booking.Status.CANCELLED
        update_fields = ["status", "updated_at"]
        if bookings_has_check_in_token_column():
            from bookings.checkin_tokens import clear_check_in_token

            if booking.check_in_token:
                clear_check_in_token(booking)
                update_fields += ["check_in_token", "check_in_short_code"]
        booking.save(update_fields=update_fields)

        payload = {"booking_id": booking.id, "reason": "barber_no_response"}
        place = (
            booking.salon.name
            if booking.salon_id
            else (booking.barber.full_name or booking.barber.email)
        )
        notify_user(
            booking.customer,
            "booking_expired",
            "Bron avtomatik bekor qilindi",
            (
                f"{place}: sartarosh {BOOKING_PENDING_RESPONSE_MINUTES} daqiqa ichida "
                "javob bermadi. Boshqa vaqt yoki sartarosh tanlang."
            ),
            payload,
            send_email=True,
        )
        notify_barber(
            booking.barber,
            "booking_expired",
            "Bron muddati tugadi",
            (
                f"{booking.customer.full_name or booking.customer.email} — "
                f"{BOOKING_PENDING_RESPONSE_MINUTES} daqiqa ichida qabul qilmadingiz, bron yopildi."
            ),
            payload,
        )
        broadcast_booking_updated(booking=booking)
        return True
    except Exception:
        logger.exception("auto_cancel_pending_no_response failed for booking %s", booking.pk)
        return False


def expire_stale_pending_bookings(*, now=None) -> int:
    """Barcha muddati o'tgan pending bronlarni bekor qiladi. Qaytaradi: soni."""
    from bookings.models import Booking

    now = now or timezone.now()
    cutoff = now - timedelta(minutes=BOOKING_PENDING_RESPONSE_MINUTES)
    try:
        ids = list(
            _pending_booking_qs()
            .filter(status=Booking.Status.PENDING, created_at__lte=cutoff)
            .values_list("id", flat=True)
        )
    except Exception:
        logger.exception("expire_stale_pending_bookings query failed")
        return 0

    count = 0
    for booking_id in ids:
        try:
            with transaction.atomic():
                booking = (
                    _pending_booking_qs(with_related=False)
                    .select_for_update()
                    .filter(pk=booking_id)
                    .first()
                )
                if booking and auto_cancel_pending_no_response(booking, now=now):
                    count += 1
        except Exception:
            logger.exception(
                "expire_stale_pending_bookings failed for booking %s", booking_id
            )
    return count


def ensure_pending_not_expired(booking, *, now=None) -> str | None:
    """Agar muddati tugagan bo'lsa bekor qiladi va xabar qaytaradi."""
    now = now or timezone.now()
    fresh = _pending_booking_qs().filter(pk=booking.pk).first()
    if not fresh:
        return None
    if auto_cancel_pending_no_response(fresh, now=now):
        return (
            f"Sartarosh {BOOKING_PENDING_RESPONSE_MINUTES} daqiqa ichida javob bermadi — "
            "bron avtomatik bekor qilindi."
        )
    return None
