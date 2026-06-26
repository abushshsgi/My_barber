"""Salon egasi profilini katalog uchun tayyorlash (region, membership)."""

from __future__ import annotations

from django.utils import timezone

from geo.region_resolver import region_matches_gps, resolve_region_from_coords

from .models import Salon, SalonMembership


def _city_from_address(address: str) -> str:
    return (address or "").split(",")[0].strip()


def validate_salon_address_coords(address: str, lat: float, lng: float) -> str | None:
    """Shahar matni va GPS mos kelmasa — xato matni."""
    from geo.region_resolver import _match_region_from_text

    city = _city_from_address(address)
    if not city:
        return None
    code = _match_region_from_text(city, address, address)
    if not code:
        return None
    if region_matches_gps(code, lat, lng):
        return None
    resolved = resolve_region_from_coords(lat, lng)
    gps_label = resolved.region_label or resolved.city_label or "boshqa hudud"
    return (
        f"Manzil «{city}» deb ko'rsatilgan, lekin xarita nuqtasi {gps_label}da. "
        "Iltimos, xaritada to'g'ri joyni belgilang."
    )


def sync_owner_region_from_salon(owner_barber, salon: Salon, *, force: bool = False) -> bool:
    """Salon GPS dan owner_barber.region ni yangilash."""
    if not force and (getattr(owner_barber, "region", None) or "").strip():
        return False
    try:
        lat = float(salon.latitude)
        lng = float(salon.longitude)
    except (TypeError, ValueError):
        return False
    resolved = resolve_region_from_coords(lat, lng)
    code = (resolved.region_code or "").strip()
    if not code:
        return False
    if owner_barber.region == code:
        return False
    owner_barber.region = code
    owner_barber.save(update_fields=["region"])
    return True


def sync_owner_profile_location_from_salon(owner_barber, salon: Salon) -> bool:
    """Barber profil joylashuvini salon manzili bilan moslashtirish."""
    address = (salon.address or "").strip()
    if len(address) < 5:
        return False
    from barbers.models import BarberProfile

    prof, _ = BarberProfile.objects.get_or_create(barber=owner_barber)
    updates: list[str] = []
    if prof.location_text != address:
        prof.location_text = address
        updates.append("location_text")
    try:
        lat = float(salon.latitude)
        lng = float(salon.longitude)
    except (TypeError, ValueError):
        lat = lng = None
    if lat is not None and prof.latitude != lat:
        prof.latitude = lat
        updates.append("latitude")
    if lng is not None and prof.longitude != lng:
        prof.longitude = lng
        updates.append("longitude")
    if updates:
        prof.save(update_fields=updates)
        return True
    return False


def owner_is_salon_bookable(owner_barber, salon: Salon) -> bool:
    """Salon sahifasida egasi bron qabul qiladimi (kamida 1 xizmat + ochiq kun)."""
    from barbers.readiness import _owner_has_schedule, _owner_setup_services_ok

    mem = SalonMembership.objects.filter(salon=salon, barber=owner_barber).first()
    return bool(_owner_setup_services_ok(owner_barber, salon.id) and _owner_has_schedule(salon.id, mem))


def ensure_owner_membership_active(barber, salon: Salon) -> SalonMembership:
    """Salon egasi membership — mijoz staff API uchun ACTIVE."""
    now = timezone.now()
    mem, _ = SalonMembership.objects.get_or_create(
        barber=barber,
        salon=salon,
        defaults={
            "role": SalonMembership.Role.OWNER,
            "invite_state": SalonMembership.InviteState.ACTIVE,
            "activated_at": now,
        },
    )
    updates: list[str] = []
    if mem.role != SalonMembership.Role.OWNER:
        mem.role = SalonMembership.Role.OWNER
        updates.append("role")
    if mem.invite_state != SalonMembership.InviteState.ACTIVE:
        mem.invite_state = SalonMembership.InviteState.ACTIVE
        updates.append("invite_state")
    if mem.activated_at is None:
        mem.activated_at = now
        updates.append("activated_at")
    if updates:
        mem.save(update_fields=updates)
    return mem
