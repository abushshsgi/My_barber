"""Chat faqat mijoz–sartarosh o‘rtasida kamida bitta bron mavjud bo‘lganda."""

from __future__ import annotations

from django.db.models import Exists, OuterRef, QuerySet

from bookings.models import Booking

from .models import Conversation


def pair_has_booking_for_chat(user_id: int, barber_id: int) -> bool:
    return Booking.objects.filter(customer_id=user_id, barber_id=barber_id).exists()


def queryset_conversations_with_booking(qs: QuerySet) -> QuerySet:
    return qs.filter(
        Exists(
            Booking.objects.filter(
                customer_id=OuterRef("user_id"),
                barber_id=OuterRef("barber_id"),
            )
        )
    )


def conversation_queryset_for_actor(actor) -> QuerySet:
    base = Conversation.objects.select_related("barber", "user")
    if actor["kind"] == "USER":
        qs = base.filter(user=actor["user"])
    else:
        qs = base.filter(barber=actor["barber"])
    return queryset_conversations_with_booking(qs)
