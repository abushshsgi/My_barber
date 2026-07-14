"""Profil GPS dan viloyatni aniqlash / to'ldirish."""

from __future__ import annotations

from accounts.models import User
from geo.region_resolver import resolve_region_from_coords, resolve_region_from_coords_fast


def user_location_region(
    user: User,
    *,
    prefer_full_resolve: bool = False,
) -> tuple[str, str, str]:
    """
    Returns (region_code, region_label, city_label).

    GPS bor bo'lsa joylashuvga mos viloyat asosiy manba;
    aks holda saqlangan region.
    """
    stored = (user.region or "").strip()

    if user.latitude is not None and user.longitude is not None:
        lat = float(user.latitude)
        lng = float(user.longitude)
        resolved = (
            resolve_region_from_coords(lat, lng)
            if prefer_full_resolve
            else resolve_region_from_coords_fast(lat, lng)
        )
        if resolved.region_code:
            return (
                resolved.region_code,
                resolved.region_label or resolved.region_code,
                resolved.city_label or "",
            )

    if stored:
        from accounts.uz_regions import UzRegion

        label = dict(UzRegion.choices).get(stored, stored)
        return stored, label, ""
    return "", "", ""


def sync_user_region_from_gps(
    user: User,
    *,
    persist: bool = True,
    full_resolve: bool = True,
) -> str:
    """GPS dan viloyatni yozadi. Qaytadi: region code."""
    if user.latitude is None or user.longitude is None:
        return (user.region or "").strip()

    resolve = resolve_region_from_coords if full_resolve else resolve_region_from_coords_fast
    resolved = resolve(float(user.latitude), float(user.longitude))
    code = (resolved.region_code or "").strip()
    if not code:
        return (user.region or "").strip()

    if (user.region or "").strip() == code:
        return code

    user.region = code
    if persist:
        user.save(update_fields=["region"])
    return code
