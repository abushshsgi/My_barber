"""GPS koordinatalardan viloyat aniqlash va tanlangan viloyat bilan solishtirish."""

from __future__ import annotations

from dataclasses import dataclass

from accounts.uz_regions import UzRegion
from geo.services.dgis import DgisGeocoderError, reverse_geocode

# O'zbekiston taxminiy chegarasi (bbox).
UZ_LAT_MIN, UZ_LAT_MAX = 37.0, 46.5
UZ_LNG_MIN, UZ_LNG_MAX = 55.9, 73.5

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
        return ResolvedLocation(
            region_code=None,
            region_label="",
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
