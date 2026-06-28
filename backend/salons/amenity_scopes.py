"""Amenity scope va salon turini aniqlash."""

from __future__ import annotations

from salons.models import Amenity, Salon, SalonMembership

# (code, icon, labels, scope)
AmenityScope = str


def salon_is_solo_studio(salon: Salon) -> bool:
    """Faol ishchi (BARBER roli) yo'q — brend-studiya / yolg'iz usta."""
    active_workers = SalonMembership.objects.filter(
        salon=salon,
        invite_state=SalonMembership.InviteState.ACTIVE,
        role=SalonMembership.Role.WORKER,
    ).count()
    return active_workers == 0


def scopes_for_salon(salon: Salon) -> frozenset[str]:
    if salon_is_solo_studio(salon):
        return frozenset({Amenity.Scope.ALL, Amenity.Scope.SOLO_STUDIO})
    return frozenset({Amenity.Scope.ALL, Amenity.Scope.SALON})


def filter_amenities_for_salon(qs, salon: Salon):
    allowed = scopes_for_salon(salon)
    return qs.filter(scope__in=allowed)
