"""Parvarish ob-havo API — region, UV, soatlik, mahsulot rejasi."""

from __future__ import annotations

from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ai.care_serializers import CareProductSerializer
from ai.models import CareUserProduct, HairCareProfile
from ai.services.gemini_weather_plan import enrich_plan_with_llm
from ai.services.weather_care import build_weather_care_payload, list_uz_regions
from ai.unthrottled import UnthrottledAPIView


def _parse_coord(value: str | None) -> float | None:
    if value is None or value == "":
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    return num if num == num else None


def _user_products_payload(request) -> list[dict]:
    if not request.user.is_authenticated:
        return []
    rows = (
        CareUserProduct.objects.filter(user=request.user)
        .select_related("product")
        .order_by("-created_at")[:8]
    )
    out: list[dict] = []
    for row in rows:
        p = row.product
        if not p:
            continue
        out.append(
            {
                "id": p.id,
                "name": p.name,
                "brand": p.brand or "",
                "category": p.category or "other",
                "image_url": CareProductSerializer(p, context={"request": request}).data.get(
                    "image_url"
                ),
                "usage_uz": (p.usage_uz or "")[:400],
            }
        )
    return out


def _hair_profile(request) -> tuple[str, str]:
    condition = (request.query_params.get("condition") or "").strip().lower()
    texture = (request.query_params.get("texture") or "").strip().lower()
    if request.user.is_authenticated and not condition:
        profile = HairCareProfile.objects.filter(user=request.user).first()
        if profile:
            condition = (profile.condition or "").strip().lower()
            texture = (profile.texture or "").strip().lower()
    return condition, texture


class CareWeatherRegionsView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"regions": list_uz_regions()})


class CareWeatherView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        lat = _parse_coord(request.query_params.get("lat"))
        lon = _parse_coord(request.query_params.get("lon"))
        region_id = (request.query_params.get("region_id") or "").strip().lower() or None
        use_ai = (request.query_params.get("ai") or "").strip() in ("1", "true", "yes")

        condition, texture = _hair_profile(request)
        products = _user_products_payload(request)

        try:
            payload = build_weather_care_payload(
                lat=lat,
                lon=lon,
                condition=condition,
                texture=texture,
                region_id=region_id,
                products=products,
            )
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=502)

        if use_ai:
            enriched = enrich_plan_with_llm(
                weather=payload,
                products=products,
                hair_condition=condition,
                hair_texture=texture,
            )
            payload["primary_action"] = enriched["primary_action"]
            payload["product_plan"] = enriched["product_plan"]
            payload["ai_enriched"] = bool(enriched.get("ai_enriched"))
        else:
            payload["ai_enriched"] = False

        return Response(payload)


class CareWeatherPlanView(UnthrottledAPIView):
    """POST — mahsulotlar bilan AI/rule reja (auth)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        lat = _parse_coord(str(request.data.get("lat") or ""))
        lon = _parse_coord(str(request.data.get("lon") or ""))
        region_id = str(request.data.get("region_id") or "").strip().lower() or None
        use_ai = bool(request.data.get("ai", True))

        condition, texture = _hair_profile(request)
        if request.data.get("condition"):
            condition = str(request.data.get("condition")).strip().lower()
        if request.data.get("texture"):
            texture = str(request.data.get("texture")).strip().lower()

        products = _user_products_payload(request)
        extra = request.data.get("products")
        if isinstance(extra, list) and extra:
            products = extra[:8]

        try:
            payload = build_weather_care_payload(
                lat=lat,
                lon=lon,
                condition=condition,
                texture=texture,
                region_id=region_id,
                products=products,
            )
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=502)

        if use_ai:
            enriched = enrich_plan_with_llm(
                weather=payload,
                products=products,
                hair_condition=condition,
                hair_texture=texture,
            )
            payload["primary_action"] = enriched["primary_action"]
            payload["product_plan"] = enriched["product_plan"]
            payload["ai_enriched"] = bool(enriched.get("ai_enriched"))
        else:
            payload["ai_enriched"] = False

        return Response(
            {
                "primary_action": payload.get("primary_action"),
                "product_plan": payload.get("product_plan"),
                "uv": payload.get("uv"),
                "hourly_highlight": payload.get("hourly_highlight"),
                "tomorrow_alert": payload.get("tomorrow_alert"),
                "ai_enriched": payload.get("ai_enriched"),
            }
        )
