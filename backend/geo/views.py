from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from geo.coverage import published_salon_count
from geo.currency import (
    BASE_CURRENCY,
    CURRENCY_LABELS,
    CURRENCY_SYMBOLS,
    SUPPORTED_CURRENCIES,
    _parse_rates_json,
    get_latest_exchange_rates,
)
from geo.region_resolver import resolve_region_from_coords
from geo.services.dgis import DgisGeocoderError, geocode_query, reverse_geocode


def _parse_coords(request):
    try:
        lat = float(request.query_params["lat"])
        lng = float(request.query_params["lng"])
    except (KeyError, TypeError, ValueError):
        return None, None
    return lat, lng


class GeocodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"detail": "q must be at least 2 characters."}, status=400)
        try:
            results = geocode_query(q)
        except DgisGeocoderError:
            # 2GIS vaqtincha ishlamasa — bo'sh ro'yxat (502 o'rniga).
            results = []
        return Response(
            {
                "results": [
                    {
                        "lat": r.lat,
                        "lng": r.lng,
                        "address": r.address,
                        "city": r.city,
                        "full_name": r.full_name,
                    }
                    for r in results
                ]
            }
        )


class ReverseGeocodeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, TypeError, ValueError):
            return Response({"detail": "lat and lng are required."}, status=400)
        try:
            result = reverse_geocode(lat, lng)
        except DgisGeocoderError:
            return Response({"detail": "Address lookup temporarily unavailable."}, status=404)
        if result is None:
            return Response({"detail": "No address found for these coordinates."}, status=404)
        return Response(
            {
                "lat": result.lat,
                "lng": result.lng,
                "address": result.address,
                "city": result.city,
                "full_name": result.full_name,
            }
        )


class ValidateLocationView(APIView):
    """GPS va tanlangan viloyat mosligi + viloyatda salon mavjudligi."""

    permission_classes = [AllowAny]

    def get(self, request):
        lat, lng = _parse_coords(request)
        if lat is None:
            return Response({"detail": "lat and lng are required."}, status=400)
        selected = (request.query_params.get("region") or "").strip()
        resolved = resolve_region_from_coords(lat, lng)
        matches = bool(
            selected
            and resolved.region_code
            and resolved.region_code == selected
        )
        region_for_coverage = selected or resolved.region_code or ""
        salon_count = published_salon_count(region_for_coverage) if region_for_coverage else 0
        return Response(
            {
                "region_from_gps": resolved.region_code or "",
                "region_from_gps_label": resolved.region_label,
                "city_label": resolved.city_label,
                "matches_selected": matches if selected else None,
                "in_uzbekistan": resolved.in_uzbekistan,
                "salons_published": salon_count,
                "has_coverage": salon_count > 0,
            }
        )


class CurrencyRatesView(APIView):
    """Valyuta ro'yxati va UZS ga nisbatan kurslar (ko'rsatish uchun)."""

    permission_classes = [AllowAny]

    def get(self, request):
        snapshot = get_latest_exchange_rates(auto_sync=True)
        rates = _parse_rates_json(snapshot.rates)
        return Response(
            {
                "base": BASE_CURRENCY,
                "updated_at": snapshot.fetched_at.isoformat(),
                "source": snapshot.source,
                "currencies": [
                    {
                        "code": code,
                        "label": CURRENCY_LABELS.get(code, code),
                        "symbol": CURRENCY_SYMBOLS.get(code, code),
                        "uzs_per_unit": str(rates.get(code, "1")),
                    }
                    for code in SUPPORTED_CURRENCIES
                ],
            }
        )
