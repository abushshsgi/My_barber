"""Buyurtma raqami va bir martalik check-in token generatsiyasi."""

from __future__ import annotations

import secrets

from django.utils import timezone

# Adashtirmaslik uchun O/0, I/1, L kabi belgilar olib tashlangan.
_SHORT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_ORDER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ0123456789"


def generate_order_number() -> str:
    """Sana + tasodifiy qism: MS-20260629-7F3A."""
    today = timezone.now().strftime("%Y%m%d")
    suffix = "".join(secrets.choice(_ORDER_ALPHABET) for _ in range(4))
    return f"MS-{today}-{suffix}"


def generate_check_in_token() -> str:
    """URL-xavfsiz maxfiy token (QR payload uchun)."""
    return secrets.token_urlsafe(24)


def generate_short_code() -> str:
    """6 belgili qo'lda kiritiladigan kod."""
    return "".join(secrets.choice(_SHORT_CODE_ALPHABET) for _ in range(6))


def assign_unique_order_number(booking) -> str:
    """Booking uchun unique order_number topadi va saqlaydi."""
    from django.db import IntegrityError

    from bookings.models import Booking

    for _ in range(10):
        candidate = generate_order_number()
        if not Booking.objects.filter(order_number=candidate).exists():
            booking.order_number = candidate
            try:
                booking.save(update_fields=["order_number"])
                return candidate
            except IntegrityError:
                continue
    # Juda kam ehtimol: PK bilan kafolatlangan unique.
    candidate = f"MS-{booking.pk}"
    booking.order_number = candidate
    booking.save(update_fields=["order_number"])
    return candidate


def issue_check_in_token(booking) -> None:
    """Accept paytida yangi bir martalik token + qisqa kod beradi."""
    from bookings.models import Booking

    for _ in range(10):
        token = generate_check_in_token()
        if not Booking.objects.filter(check_in_token=token).exists():
            booking.check_in_token = token
            break
    booking.check_in_short_code = generate_short_code()
    booking.check_in_token_issued_at = timezone.now()
    booking.check_in_token_used_at = None


def clear_check_in_token(booking) -> None:
    booking.check_in_token = None
    booking.check_in_short_code = None
