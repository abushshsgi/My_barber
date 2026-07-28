"""Masofa tekshiruvi — ishchi salonga yaqinligini GPS bilan tasdiqlash."""

import math

from rest_framework.exceptions import ValidationError

# Qo‘shilish: salon va barber nuqtalari orasidagi maksimal masofa (100 m).
JOIN_MAX_DISTANCE_KM = 0.1

LOCATION_MISMATCH_MSG = (
    "Joylashuv salon joylashuvi bilan mos kelmaydi (taxminan 100 m ichida bo‘lishi kerak)."
)


def bounding_box(lat: float, lng: float, radius_km: float) -> tuple[float, float, float, float]:
    """Kenglik/balandlik diapazoni — haversine dan oldin DB filtri."""
    lat_delta = radius_km / 111.0
    cos_lat = max(math.cos(lat * math.pi / 180), 0.01)
    lng_delta = radius_km / (111.0 * cos_lat)
    return lat - lat_delta, lat + lat_delta, lng - lng_delta, lng + lng_delta


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p = math.pi / 180
    a = (
        0.5
        - math.cos((lat2 - lat1) * p) / 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def assert_join_distance_ok(salon, lat: float, lng: float) -> None:
    """Salon markazi bilan berilgan nuqta orasidagi masofa ≤100 m bo‘lmasa ValidationError."""
    dist_km = haversine_km(lat, lng, float(salon.latitude), float(salon.longitude))
    if dist_km > JOIN_MAX_DISTANCE_KM:
        raise ValidationError({"detail": LOCATION_MISMATCH_MSG})
