"""Bron bekor qilish qoidalari."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

BOOKING_CANCEL_WINDOW_MINUTES = 5
BOOKING_PENDING_RESPONSE_MINUTES = BOOKING_CANCEL_WINDOW_MINUTES


def customer_cancel_blocked_reason(booking, *, now=None) -> str | None:
    """
    Mijoz bekor qila olmasa sabab qaytaradi, aks holda None.
    Buyurtmadan keyin 5 daqiqa ichida — pending yoki accepted (xizmat boshlanmaguncha).
  """
    from bookings.models import Booking

    now = now or timezone.now()

    if booking.status in (
        Booking.Status.COMPLETED,
        Booking.Status.CANCELLED,
        Booking.Status.REJECTED,
        Booking.Status.IN_PROGRESS,
    ):
        if booking.status == Booking.Status.IN_PROGRESS:
            return "Xizmat davom etmoqda — bekor qilish mumkin emas."
        return "Bu bronni bekor qilib bo'lmaydi."

    if booking.status not in (Booking.Status.PENDING, Booking.Status.ACCEPTED):
        return "Bu bronni bekor qilib bo'lmaydi."

    if not booking.created_at:
        return "Bekor qilish muddati tugadi."

    cutoff = booking.created_at + timedelta(minutes=BOOKING_CANCEL_WINDOW_MINUTES)
    if now >= cutoff:
        return (
            f"Buyurtmadan keyin faqat {BOOKING_CANCEL_WINDOW_MINUTES} daqiqa ichida "
            "bekor qilish mumkin. Muddati tugadi — chat orqali bog'laning."
        )

    return None
