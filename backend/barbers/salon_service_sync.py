"""Barber panelidagi BarberService → mijoz salon booking (salons.Service) sinxronizatsiyasi."""

from __future__ import annotations

from django.db.models import Q

from barbers.models import Barber, BarberService
from salons.models import Salon, SalonMembership, Service


def _active_memberships(barber: Barber):
    return SalonMembership.objects.filter(
        barber=barber,
        invite_state=SalonMembership.InviteState.ACTIVE,
    ).select_related("salon")


def _salon_target_barber(salon: Salon, barber: Barber) -> Barber | None:
    """Salon egasi xizmatlari salon katalogiga (barber=null) yoziladi; ishchilarniki
    o‘ziga (barber=worker) biriktiriladi. Mijoz salon sahifasida egasi guruhini
    "Salon xizmatlari" sifatida ko‘rsatish uchun."""
    if salon.owner_barber_id == barber.id:
        return None
    return barber


def _lookup_for_barber_service(
    salon: Salon, target_barber: Barber | None, barber_service: BarberService
) -> dict:
    base = {"salon": salon, "barber": target_barber}
    if barber_service.catalog_service_id:
        return {**base, "catalog_service_id": barber_service.catalog_service_id}
    return {**base, "name": barber_service.name}


def sync_barber_service_to_salons(barber_service: BarberService) -> None:
    """Barber xizmatini faol salon a'zoliklariga salons.Service sifatida yozadi.
    Egasi xizmatlari salon katalogiga (barber=null), ishchilarniki barber=worker."""
    barber = barber_service.profile.barber
    defaults = {
        "name": barber_service.name,
        "price": barber_service.price,
        "duration_minutes": barber_service.duration_minutes,
        "is_active": barber_service.is_active,
    }
    if barber_service.catalog_service_id:
        defaults["catalog_service_id"] = barber_service.catalog_service_id

    for mem in _active_memberships(barber):
        target_barber = _salon_target_barber(mem.salon, barber)
        Service.objects.update_or_create(
            **_lookup_for_barber_service(mem.salon, target_barber, barber_service),
            defaults=defaults,
        )


def remove_barber_service_from_salons(barber_service: BarberService) -> None:
    barber = barber_service.profile.barber
    for mem in _active_memberships(barber):
        target_barber = _salon_target_barber(mem.salon, barber)
        qs = Service.objects.filter(
            **_lookup_for_barber_service(mem.salon, target_barber, barber_service)
        )
        qs.delete()


def ensure_salon_service_for_barber_service(
    salon: Salon,
    barber: Barber,
    barber_service: BarberService,
) -> Service | None:
    """Mavjud BarberService uchun salons.Service qatorini qaytaradi (kerak bo‘lsa yaratadi)."""
    if not barber_service.is_active:
        return None
    sync_barber_service_to_salons(barber_service)
    target_barber = _salon_target_barber(salon, barber)
    return (
        Service.objects.filter(
            **_lookup_for_barber_service(salon, target_barber, barber_service)
        )
        .filter(is_active=True)
        .filter(Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True))
        .first()
    )


def sync_all_barber_services_for_barber(barber: Barber) -> int:
    """Barcha BarberService larni salonlarga qayta sinxronlashtiradi (migratsiya / tuzatish)."""
    from barbers.models import BarberProfile

    prof = BarberProfile.objects.filter(barber=barber).first()
    if not prof:
        return 0
    count = 0
    for row in BarberService.objects.filter(profile=prof):
        sync_barber_service_to_salons(row)
        count += 1
    return count
