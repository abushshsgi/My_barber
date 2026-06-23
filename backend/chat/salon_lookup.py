"""Barber uchun ko'rinadigan salon nomi."""

from __future__ import annotations

from barbers.models import Barber
from salons.models import Salon, SalonMembership


def salon_name_for_barber(barber: Barber) -> str:
    owned = (
        Salon.objects.filter(owner_barber=barber, is_published=True)
        .only("name")
        .first()
    )
    if owned is not None:
        return owned.name
    membership = (
        SalonMembership.objects.select_related("salon")
        .filter(
            barber=barber,
            invite_state=SalonMembership.InviteState.ACTIVE,
            salon__is_published=True,
        )
        .order_by("-activated_at", "-id")
        .first()
    )
    if membership is not None:
        return membership.salon.name
    return barber.full_name or barber.username or "Salon"
