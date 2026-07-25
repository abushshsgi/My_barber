from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import requests
from django.conf import settings


class GeocoderError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


# Backward-compatible alias while callers migrate off 2GIS naming.
DgisGeocoderError = GeocoderError


@dataclass(frozen=True)
class GeocodeResult:
    lat: float
    lng: float
    address: str
    city: str
    full_name: str


def _api_key() -> str:
    key = (
        getattr(settings, "GOOGLE_MAPS_API_KEY", "")
        or getattr(settings, "DGIS_API_KEY", "")
    ).strip()
    if not key:
        raise GeocoderError("Google Maps API key is not configured.", status_code=503)
    return key


def _request(params: dict[str, str]) -> dict[str, Any]:
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{urlencode(params)}"
    try:
        resp = requests.get(url, timeout=4)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise GeocoderError("Google geocoder request failed.") from exc

    data = resp.json()
    status = str(data.get("status") or "")
    if status == "ZERO_RESULTS":
        return data
    if status != "OK":
        raise GeocoderError(f"Google geocoder returned {status or 'an error'}.", status_code=502)
    return data


def _component(components: list[dict[str, Any]], *types: str) -> str:
    wanted = set(types)
    for component in components:
        ctype = set(component.get("types") or [])
        if ctype & wanted:
            return str(component.get("long_name") or "").strip()
    return ""


def _parse_result(item: dict[str, Any]) -> GeocodeResult:
    geometry = item.get("geometry") or {}
    location = geometry.get("location") or {}
    lat = float(location["lat"])
    lng = float(location["lng"])
    full_name = str(item.get("formatted_address") or "").strip()
    components = item.get("address_components") or []
    if not isinstance(components, list):
        components = []

    street_number = _component(components, "street_number")
    route = _component(components, "route")
    address = ", ".join(part for part in (route, street_number) if part) or full_name
    city = (
        _component(components, "locality")
        or _component(components, "administrative_area_level_2")
        or _component(components, "administrative_area_level_1")
    )
    if not city and full_name:
        city = full_name.split(",")[0].strip()
    return GeocodeResult(lat=lat, lng=lng, address=address, city=city, full_name=full_name)


def geocode_query(q: str) -> list[GeocodeResult]:
    q = q.strip()
    if len(q) < 2:
        return []
    try:
        results = _geocode_query_google(q)
        if results:
            return results
    except GeocoderError:
        pass
    from geo.services.nominatim import geocode_query_nominatim
    from geo.services.photon import geocode_query_photon

    results = geocode_query_nominatim(q)
    if results:
        return results
    return geocode_query_photon(q)


def _geocode_query_google(q: str) -> list[GeocodeResult]:
    data = _request(
        {
            "address": q,
            "region": "uz",
            "language": "uz",
            "key": _api_key(),
        }
    )
    items = data.get("results") or []
    out: list[GeocodeResult] = []
    for item in items:
        try:
            out.append(_parse_result(item))
        except (KeyError, TypeError, ValueError):
            continue
    return out


def reverse_geocode(lat: float, lng: float) -> GeocodeResult | None:
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        raise GeocoderError("Invalid coordinates.", status_code=400)

    cache_key = f"geo:rev:{round(lat, 5)}:{round(lng, 5)}"
    try:
        from django.core.cache import cache

        cached = cache.get(cache_key)
        if isinstance(cached, dict) and cached.get("lat") is not None:
            return GeocodeResult(
                lat=float(cached["lat"]),
                lng=float(cached["lng"]),
                address=str(cached.get("address") or ""),
                city=str(cached.get("city") or ""),
                full_name=str(cached.get("full_name") or ""),
            )
    except Exception:
        pass

    result: GeocodeResult | None = None
    try:
        result = _reverse_geocode_google(lat, lng)
    except Exception:
        result = None
    if not result:
        try:
            from geo.services.nominatim import reverse_geocode_nominatim
            from geo.services.photon import reverse_geocode_photon

            result = reverse_geocode_nominatim(lat, lng) or reverse_geocode_photon(lat, lng)
        except Exception:
            result = None

    if result:
        try:
            from django.core.cache import cache

            cache.set(
                cache_key,
                {
                    "lat": result.lat,
                    "lng": result.lng,
                    "address": result.address,
                    "city": result.city,
                    "full_name": result.full_name,
                },
                timeout=600,
            )
        except Exception:
            pass
    return result


def _reverse_geocode_google(lat: float, lng: float) -> GeocodeResult | None:
    data = _request(
        {
            "latlng": f"{lat},{lng}",
            "language": "uz",
            "key": _api_key(),
        }
    )
    items = data.get("results") or []
    if not items:
        return None
    try:
        return _parse_result(items[0])
    except (KeyError, TypeError, ValueError):
        return None


# Private aliases used by older tests / patches.
_geocode_query_dgis = _geocode_query_google
_reverse_geocode_dgis = _reverse_geocode_google
