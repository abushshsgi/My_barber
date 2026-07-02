"""Mijoz ifodalari — sartarosh yakunlangan bron uchun."""

from django.db.models import Count

from bookings.models import ClientImpression

VALID_KINDS = frozenset(k for k, _ in ClientImpression.Kind.choices)


def customer_impression_stats(customer_id: int) -> dict[str, int]:
    rows = (
        ClientImpression.objects.filter(customer_id=customer_id)
        .values("kind")
        .annotate(count=Count("id"))
    )
    return {row["kind"]: row["count"] for row in rows}


def booking_impression_kinds(booking_id: int, barber_id: int) -> list[str]:
    return list(
        ClientImpression.objects.filter(booking_id=booking_id, barber_id=barber_id)
        .order_by("kind")
        .values_list("kind", flat=True)
    )
