"""Salon egasi profilini katalog uchun tayyorlash (region, membership)."""

from __future__ import annotations

from django.utils import timezone

from geo.region_resolver import resolve_region_from_coords

from .models import Salon, SalonMembership


def sync_owner_region_from_salon(owner_barber, salon: Salon) -> None:
    """Owner barber.region bo'sh bo'lsa — salon GPS yoki manzildan viloyatni aniqlash."""
    if (getattr(owner_barber, "region", None) or "").strip():
        return
    try:
        lat = float(salon.latitude)
        lng = float(salon.longitude)
    except (TypeError, ValueError):
        return
    resolved = resolve_region_from_coords(lat, lng)
    code = (resolved.region_code or "").strip()
    if not code:
        return
    owner_barber.region = code
    owner_barber.save(update_fields=["region"])


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
