"""GPS koordinatalardan viloyat aniqlash va tanlangan viloyat bilan solishtirish."""

from __future__ import annotations

from dataclasses import dataclass

import math

from accounts.uz_regions import UzRegion
from geo.services.dgis import DgisGeocoderError, reverse_geocode

# O'zbekiston taxminiy chegarasi (bbox).
UZ_LAT_MIN, UZ_LAT_MAX = 37.0, 46.5
UZ_LNG_MIN, UZ_LNG_MAX = 55.9, 73.5

# 2GIS ishlamasa — viloyat markaziga yaqinlik bo'yicha taxmin.
_REGION_CENTERS: list[tuple[str, float, float]] = [
    (UzRegion.ANDIJON, 40.7821, 72.3442),
    (UzRegion.BUXORO, 39.7747, 64.4286),
    (UzRegion.FARGONA, 40.3864, 71.7864),
    (UzRegion.JIZZAX, 40.1158, 67.8422),
    (UzRegion.QASHQADARYO, 38.8606, 65.7891),
    (UzRegion.NAVOIY, 40.0844, 65.3792),
    (UzRegion.NAMANGAN, 40.9983, 71.6726),
    (UzRegion.SAMARQAND, 39.6542, 66.9597),
    (UzRegion.SURXONDARYO, 37.9409, 67.5708),
    (UzRegion.SIRDARYO, 40.8433, 68.6617),
    (UzRegion.TOSHKENT_SH, 41.2995, 69.2401),
    (UzRegion.TOSHKENT_V, 41.0212, 69.5584),
    (UzRegion.XORAZM, 41.5500, 60.6333),
]


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlng / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def _region_from_nearest_center(lat: float, lng: float) -> str | None:
    best_code: str | None = None
    best_km = float("inf")
    for code, clat, clng in _REGION_CENTERS:
        km = _haversine_km(lat, lng, clat, clng)
        if km < best_km:
            best_km = km
            best_code = code
    return best_code if best_km <= 120 else None

# Kalit-so'z → viloyat kodi (uz/ru/en, kichik harf).
_REGION_KEYWORDS: list[tuple[str, str]] = [
    ("toshkent shahri", UzRegion.TOSHKENT_SH),
    ("tashkent city", UzRegion.TOSHKENT_SH),
    ("город ташкент", UzRegion.TOSHKENT_SH),
    ("toshkent viloyati", UzRegion.TOSHKENT_V),
    ("tashkent region", UzRegion.TOSHKENT_V),
    ("toshkent", UzRegion.TOSHKENT_SH),
    ("tashkent", UzRegion.TOSHKENT_SH),
    ("ташкент", UzRegion.TOSHKENT_SH),
    ("andijon", UzRegion.ANDIJON),
    ("andijan", UzRegion.ANDIJON),
    ("андijan", UzRegion.ANDIJON),
    ("buxoro", UzRegion.BUXORO),
    ("bukhara", UzRegion.BUXORO),
    ("бухара", UzRegion.BUXORO),
    ("farg'ona", UzRegion.FARGONA),
    ("fargona", UzRegion.FARGONA),
    ("fergana", UzRegion.FARGONA),
    ("фергана", UzRegion.FARGONA),
    ("jizzax", UzRegion.JIZZAX),
    ("jizzakh", UzRegion.JIZZAX),
    ("жizzax", UzRegion.JIZZAX),
    ("qashqadaryo", UzRegion.QASHQADARYO),
    ("kashkadarya", UzRegion.QASHQADARYO),
    ("кашкадарья", UzRegion.QASHQADARYO),
    ("navoiy", UzRegion.NAVOIY),
    ("navoi", UzRegion.NAVOIY),
    ("namangan", UzRegion.NAMANGAN),
    ("samarqand", UzRegion.SAMARQAND),
    ("samarkand", UzRegion.SAMARQAND),
    ("самарканд", UzRegion.SAMARQAND),
    ("surxondaryo", UzRegion.SURXONDARYO),
    ("surkhandarya", UzRegion.SURXONDARYO),
    ("sirdaryo", UzRegion.SIRDARYO),
    ("syrdarya", UzRegion.SIRDARYO),
    ("xorazm", UzRegion.XORAZM),
    ("khorezm", UzRegion.XORAZM),
    ("хорезм", UzRegion.XORAZM),
]

REGION_MISMATCH_MSG = "Joylashuvingiz tanlangan viloyatga mos emas."


@dataclass(frozen=True)
class ResolvedLocation:
    region_code: str | None
    region_label: str
    city_label: str
    in_uzbekistan: bool


def is_in_uzbekistan(lat: float, lng: float) -> bool:
    return UZ_LAT_MIN <= lat <= UZ_LAT_MAX and UZ_LNG_MIN <= lng <= UZ_LNG_MAX


def _region_label(code: str | None) -> str:
    if not code:
        return ""
    for value, label in UzRegion.choices:
        if value == code:
            return label
    return code


def _match_region_from_text(*parts: str) -> str | None:
    haystack = " ".join(p.strip().lower() for p in parts if p and p.strip())
    if not haystack:
        return None
    # Uzunroq kalitlar birinchi (masalan "toshkent viloyati" vs "toshkent").
    for keyword, code in sorted(_REGION_KEYWORDS, key=lambda x: -len(x[0])):
        if keyword in haystack:
            return code
    return None


def resolve_region_from_coords(lat: float, lng: float) -> ResolvedLocation:
    if not is_in_uzbekistan(lat, lng):
        return ResolvedLocation(
            region_code=None,
            region_label="",
            city_label="",
            in_uzbekistan=False,
        )
    try:
        result = reverse_geocode(lat, lng)
    except DgisGeocoderError:
        result = None
    if result is None:
        fallback = _region_from_nearest_center(lat, lng)
        return ResolvedLocation(
            region_code=fallback,
            region_label=_region_label(fallback),
            city_label="",
            in_uzbekistan=True,
        )
    code = _match_region_from_text(result.city, result.full_name, result.address)
    return ResolvedLocation(
        region_code=code,
        region_label=_region_label(code),
        city_label=result.city or (result.full_name.split(",")[0].strip() if result.full_name else ""),
        in_uzbekistan=True,
    )


def region_matches_gps(selected_region: str, lat: float, lng: float) -> bool:
    selected = (selected_region or "").strip()
    if not selected:
        return False
    resolved = resolve_region_from_coords(lat, lng)
    if not resolved.in_uzbekistan:
        return False
    if not resolved.region_code:
        return False
    return resolved.region_code == selected
