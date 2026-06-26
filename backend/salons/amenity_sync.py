"""Salon qulayliklarini sinxronlash."""

from __future__ import annotations

from rest_framework import serializers

from salons.models import Amenity, Salon, SalonAmenity


def sync_salon_amenities(salon: Salon, codes: list[str] | None) -> None:
    if codes is None:
        return
    normalized: list[str] = []
    for code in codes:
        c = (code or "").strip()
        if c and c not in normalized:
            normalized.append(c)
    amenities = list(Amenity.objects.filter(code__in=normalized))
    found = {a.code for a in amenities}
    missing = [c for c in normalized if c not in found]
    if missing:
        raise serializers.ValidationError(
            {"amenity_codes": f"Unknown amenity codes: {', '.join(missing)}"}
        )
    SalonAmenity.objects.filter(salon=salon).exclude(amenity__code__in=normalized).delete()
    existing = set(
        SalonAmenity.objects.filter(salon=salon, amenity__code__in=normalized).values_list(
            "amenity__code", flat=True
        )
    )
    for amenity in amenities:
        if amenity.code not in existing:
            SalonAmenity.objects.create(salon=salon, amenity=amenity)
