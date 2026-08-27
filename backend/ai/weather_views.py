"""Parvarish ob-havo API."""

from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ai.models import HairCareProfile
from ai.services.weather_care import build_weather_care_payload
from ai.unthrottled import UnthrottledAPIView


def _parse_coord(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    return num if num == num else None  # NaN check


class CareWeatherView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        lat = _parse_coord(request.query_params.get("lat"))
        lon = _parse_coord(request.query_params.get("lon"))

        condition = (request.query_params.get("condition") or "").strip().lower()
        texture = (request.query_params.get("texture") or "").strip().lower()

        if request.user.is_authenticated and not condition:
            profile = HairCareProfile.objects.filter(user=request.user).first()
            if profile:
                condition = (profile.condition or "").strip().lower()
                texture = (profile.texture or "").strip().lower()

        try:
            payload = build_weather_care_payload(
                lat=lat,
                lon=lon,
                condition=condition,
                texture=texture,
            )
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=502)

        return Response(payload)
