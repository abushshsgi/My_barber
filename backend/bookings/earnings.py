"""Platform earnings: faqat onlayn + to'langan yakunlangan bronlar."""

from django.db.models import Count, F, Q, QuerySet, Sum
from django.db.models.functions import Coalesce, TruncDate

from bookings.models import Booking


def earnings_event_at_field():
    """Yakunlangan vaqt (completion) yoki reja vaqti (start_at)."""
    return Coalesce(F("completion__completed_at"), F("start_at"))


def filter_bookings_by_earnings_period(qs: QuerySet[Booking], start_dt, end_dt) -> QuerySet[Booking]:
    """Daromad/statistika: xizmat yakunlangan sanasi bo'yicha (yo'q bo'lsa start_at)."""
    return qs.filter(
        Q(completion__completed_at__gte=start_dt, completion__completed_at__lte=end_dt)
        | Q(completion__isnull=True, start_at__gte=start_dt, start_at__lte=end_dt)
    )


def annotate_earnings_day(qs: QuerySet[Booking]):
    return qs.annotate(day=TruncDate(earnings_event_at_field()))

def barber_platform_earnings_qs(barber) -> QuerySet[Booking]:
    return Booking.objects.filter(
        barber=barber,
        status=Booking.Status.COMPLETED,
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    )


def barber_cash_earnings_qs(barber) -> QuerySet[Booking]:
    """Yakunlangan naqd bronlar — statistika uchun, yechib olish mumkin emas."""
    return Booking.objects.filter(
        barber=barber,
        status=Booking.Status.COMPLETED,
        payment_method=Booking.PaymentMethod.CASH,
    )


def platform_earnings_qs(base: QuerySet[Booking] | None = None) -> QuerySet[Booking]:
    qs = base if base is not None else Booking.objects.all()
    return qs.filter(
        status=Booking.Status.COMPLETED,
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    )


def completed_bookings_qs(base: QuerySet[Booking] | None = None) -> QuerySet[Booking]:
    """Statistika / dashboard: barcha yakunlangan bronlar (naqd + onlayn)."""
    qs = base if base is not None else Booking.objects.all()
    return qs.filter(status=Booking.Status.COMPLETED)


def booking_counts_for_platform_earnings(booking: Booking) -> bool:
    return (
        booking.status == Booking.Status.COMPLETED
        and booking.payment_method == Booking.PaymentMethod.ONLINE
        and booking.payment_status == Booking.PaymentStatus.PAID
    )


def payment_breakdown(qs: QuerySet[Booking]) -> dict:
    """Tanlangan davr uchun naqd / onlayn ajratish (statistika)."""
    cash = qs.filter(payment_method=Booking.PaymentMethod.CASH).aggregate(
        total=Sum("total_price"), count=Count("id")
    )
    online = qs.filter(
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    ).aggregate(total=Sum("total_price"), count=Count("id"))
    cash_total = cash["total"] or 0
    online_total = online["total"] or 0
    return {
        "cash_total": cash_total,
        "online_total": online_total,
        "cash_count": cash["count"] or 0,
        "online_count": online["count"] or 0,
        "total_income": cash_total + online_total,
        "total_count": (cash["count"] or 0) + (online["count"] or 0),
    }
