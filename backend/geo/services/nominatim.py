from __future__ import annotations

from typing import Any
from urllib.parse import urlencode

import requests

from geo.services.dgis import GeocodeResult

NOMINATIM_BASE = "https://nominatim.openstreetmap.org"
USER_AGENT = "MyBarber/1.0 (geo fallback; contact@mysaloon.uz)"


def _request(path: str, params: dict[str, str]) -> Any:
    url = f"{NOMINATIM_BASE}{path}?{urlencode(params)}"
    resp = requests.get(url, timeout=10, headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    return resp.json()


def _normalize_city(name: str) -> str:
    name = name.strip()
    if name.endswith(" shahri"):
        return name[: -len(" shahri")].strip()
    return name


def _pick_city(address: dict[str, Any]) -> str:
    for key in ("city", "town", "village", "municipality", "county", "state"):
        raw = str(address.get(key) or "").strip()
        if raw:
            return _normalize_city(raw)
    return ""


def _pick_street(address: dict[str, Any]) -> str:
    road = str(address.get("road") or address.get("pedestrian") or address.get("footway") or "").strip()
    house = str(address.get("house_number") or "").strip()
    if road and house:
        return f"{road}, {house}"
    if road:
        return road
    neighbourhood = str(address.get("neighbourhood") or address.get("suburb") or "").strip()
    return neighbourhood


def reverse_geocode_nominatim(lat: float, lng: float) -> GeocodeResult | None:
    try:
        data = _request(
            "/reverse",
            {
                "lat": str(lat),
                "lon": str(lng),
                "format": "json",
                "addressdetails": "1",
                "accept-language": "uz,ru,en",
            },
        )
    except requests.RequestException:
        return None

    if not isinstance(data, dict):
        return None

    address = data.get("address")
    if not isinstance(address, dict):
        return None

    city = _pick_city(address)
    street = _pick_street(address)
    full_name = str(data.get("display_name") or "").strip()
    if not street and full_name:
        street = full_name.split(",")[0].strip()

    if not city and not street:
        return None

    try:
        result_lat = float(data.get("lat", lat))
        result_lng = float(data.get("lon", lng))
    except (TypeError, ValueError):
        result_lat, result_lng = lat, lng

    return GeocodeResult(
        lat=result_lat,
        lng=result_lng,
        address=street or full_name,
        city=city,
        full_name=full_name or ", ".join(p for p in (city, street) if p),
    )


def geocode_query_nominatim(q: str) -> list[GeocodeResult]:
    q = q.strip()
    if len(q) < 2:
        return []
    try:
        rows = _request(
            "/search",
            {
                "q": q,
                "format": "json",
                "addressdetails": "1",
                "limit": "5",
                "countrycodes": "uz",
                "accept-language": "uz,ru,en",
            },
        )
    except requests.RequestException:
        return []

    if not isinstance(rows, list):
        return []

    out: list[GeocodeResult] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        address = row.get("address")
        if not isinstance(address, dict):
            continue
        city = _pick_city(address)
        street = _pick_street(address)
        full_name = str(row.get("display_name") or "").strip()
        if not street and full_name:
            street = full_name.split(",")[0].strip()
        try:
            lat = float(row["lat"])
            lng = float(row["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        out.append(
            GeocodeResult(
                lat=lat,
                lng=lng,
                address=street or full_name,
                city=city,
                full_name=full_name,
            )
        )
    return out
