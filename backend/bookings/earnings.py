"""Platform earnings: faqat onlayn + to'langan yakunlangan bronlar."""

from django.db.models import QuerySet

from bookings.models import Booking


def barber_platform_earnings_qs(barber) -> QuerySet[Booking]:
    return Booking.objects.filter(
        barber=barber,
        status=Booking.Status.COMPLETED,
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    )


def platform_earnings_qs(base: QuerySet[Booking] | None = None) -> QuerySet[Booking]:
    qs = base if base is not None else Booking.objects.all()
    return qs.filter(
        status=Booking.Status.COMPLETED,
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    )


def booking_counts_for_platform_earnings(booking: Booking) -> bool:
    return (
        booking.status == Booking.Status.COMPLETED
        and booking.payment_method == Booking.PaymentMethod.ONLINE
        and booking.payment_status == Booking.PaymentStatus.PAID
    )
