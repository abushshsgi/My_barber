from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urlencode

import requests
from django.conf import settings


class DgisGeocoderError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class GeocodeResult:
    lat: float
    lng: float
    address: str
    city: str
    full_name: str


def _api_key() -> str:
    key = getattr(settings, "DGIS_API_KEY", "").strip()
    if not key:
        raise DgisGeocoderError("2GIS API key is not configured.", status_code=503)
    return key


def _request(params: dict[str, str]) -> dict[str, Any]:
    url = f"https://catalog.api.2gis.com/3.0/items/geocode?{urlencode(params)}"
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise DgisGeocoderError("2GIS geocoder request failed.") from exc

    data = resp.json()
    meta = data.get("meta") or {}
    if meta.get("code") != 200:
        raise DgisGeocoderError("2GIS geocoder returned an error.", status_code=502)
    return data


def _parse_item(item: dict[str, Any]) -> GeocodeResult:
    point = item.get("point") or {}
    lat = float(point.get("lat"))
    lng = float(point.get("lon"))
    full_name = str(item.get("full_name") or item.get("address_name") or item.get("name") or "").strip()
    address = str(item.get("address_name") or item.get("name") or full_name).strip()
    city = ""
    for component in item.get("address", {}).get("components", []) if isinstance(item.get("address"), dict) else []:
        if component.get("type") in ("city", "settlement", "region"):
            city = str(component.get("name") or "").strip()
            if city:
                break
    if not city and full_name:
        city = full_name.split(",")[0].strip()
    return GeocodeResult(lat=lat, lng=lng, address=address, city=city, full_name=full_name)


def geocode_query(q: str) -> list[GeocodeResult]:
    q = q.strip()
    if len(q) < 2:
        return []
    try:
        results = _geocode_query_dgis(q)
        if results:
            return results
    except DgisGeocoderError:
        pass
    from geo.services.nominatim import geocode_query_nominatim
    from geo.services.photon import geocode_query_photon

    results = geocode_query_nominatim(q)
    if results:
        return results
    return geocode_query_photon(q)


def _geocode_query_dgis(q: str) -> list[GeocodeResult]:
    data = _request(
        {
            "q": q,
            "fields": "items.point,items.address,items.address_name,items.full_name,items.name",
            "key": _api_key(),
        }
    )
    items = (data.get("result") or {}).get("items") or []
    out: list[GeocodeResult] = []
    for item in items:
        try:
            out.append(_parse_item(item))
        except (TypeError, ValueError):
            continue
    return out


def reverse_geocode(lat: float, lng: float) -> GeocodeResult | None:
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        raise DgisGeocoderError("Invalid coordinates.", status_code=400)
    try:
        result = _reverse_geocode_dgis(lat, lng)
        if result:
            return result
    except DgisGeocoderError:
        pass
    from geo.services.nominatim import reverse_geocode_nominatim
    from geo.services.photon import reverse_geocode_photon

    result = reverse_geocode_nominatim(lat, lng)
    if result:
        return result
    return reverse_geocode_photon(lat, lng)


def _reverse_geocode_dgis(lat: float, lng: float) -> GeocodeResult | None:
    data = _request(
        {
            "lat": str(lat),
            "lon": str(lng),
            "fields": "items.point,items.address,items.address_name,items.full_name,items.name",
            "key": _api_key(),
        }
    )
    items = (data.get("result") or {}).get("items") or []
    if not items:
        return None
    try:
        return _parse_item(items[0])
    except (TypeError, ValueError):
        return None
