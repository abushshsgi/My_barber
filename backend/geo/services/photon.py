from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

import requests

from geo.services.dgis import GeocodeResult
from geo.services.nominatim import _normalize_city

PHOTON_BASE = "https://photon.komoot.io"
USER_AGENT = "MyBarber/1.0 (geo fallback; contact@mysaloon.uz)"


def _request(path: str, params: dict[str, str]) -> Any:
    url = f"{PHOTON_BASE}{path}?{urlencode(params)}"
    resp = requests.get(
        url,
        timeout=12,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    resp.raise_for_status()
    return resp.json()


def _parse_feature(feature: dict[str, Any], fallback_lat: float, fallback_lng: float) -> GeocodeResult | None:
    props = feature.get("properties")
    if not isinstance(props, dict):
        return None

    city = _normalize_city(str(props.get("city") or props.get("district") or props.get("county") or "").strip())
    name = str(props.get("name") or "").strip()
    house = str(props.get("housenumber") or "").strip()
    street = f"{name}, {house}" if name and house else name
    if not street:
        street = str(props.get("locality") or props.get("street") or "").strip()

    if not city and not street:
        return None

    geometry = feature.get("geometry")
    coords = geometry.get("coordinates") if isinstance(geometry, dict) else None
    try:
        result_lng = float(coords[0]) if isinstance(coords, list) and len(coords) >= 2 else fallback_lng
        result_lat = float(coords[1]) if isinstance(coords, list) and len(coords) >= 2 else fallback_lat
    except (TypeError, ValueError):
        result_lat, result_lng = fallback_lat, fallback_lng

    parts = [p for p in (city, street, str(props.get("country") or "").strip()) if p]
    full_name = ", ".join(parts)

    return GeocodeResult(
        lat=result_lat,
        lng=result_lng,
        address=street or full_name,
        city=city,
        full_name=full_name,
    )


def reverse_geocode_photon(lat: float, lng: float) -> GeocodeResult | None:
    try:
        data = _request("/reverse", {"lat": str(lat), "lon": str(lng), "lang": "en"})
    except requests.RequestException:
        return None

    if not isinstance(data, dict):
        return None

    features = data.get("features")
    if not isinstance(features, list) or not features:
        return None

    first = features[0]
    if not isinstance(first, dict):
        return None

    return _parse_feature(first, lat, lng)


def geocode_query_photon(q: str) -> list[GeocodeResult]:
    q = q.strip()
    if len(q) < 2:
        return []

    try:
        data = _request("/api/", {"q": q, "limit": "5", "lang": "en"})
    except requests.RequestException:
        return []

    if not isinstance(data, dict):
        return []

    features = data.get("features")
    if not isinstance(features, list):
        return []

    out: list[GeocodeResult] = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        props = feature.get("properties")
        if not isinstance(props, dict):
            continue
        if str(props.get("countrycode") or "").upper() not in ("", "UZ"):
            continue
        geometry = feature.get("geometry")
        coords = geometry.get("coordinates") if isinstance(geometry, dict) else None
        try:
            fallback_lng = float(coords[0])
            fallback_lat = float(coords[1])
        except (TypeError, ValueError, IndexError):
            continue
        parsed = _parse_feature(feature, fallback_lat, fallback_lng)
        if parsed:
            out.append(parsed)
    return out
