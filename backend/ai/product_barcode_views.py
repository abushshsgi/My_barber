"""Admin upsert + user/mobile barcode lookup (DB → Open Beauty Facts → UPCitemdb)."""

from __future__ import annotations

from types import SimpleNamespace

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.admin_parvarish_views import _unique_slug
from ai.care_serializers import CareProductSerializer
from ai.models import HairCareProfile
from ai.services.barcode_country import detect_country_from_barcode, normalize_barcode
from ai.services.care_match import parse_ingredients_text, score_against_hair, suitability_for_user
from ai.services.product_barcode_lookup import (
    external_as_product_payload,
    find_product_by_barcode,
    lookup_external_product,
)
from ai.unthrottled import UnthrottledAPIView


def _profile_from_request(request) -> HairCareProfile | None:
    if getattr(request.user, "is_authenticated", False):
        profile = HairCareProfile.objects.filter(user=request.user).first()
        if profile is not None:
            return profile
    data = request.query_params
    condition = str(data.get("condition") or "").strip().lower()
    texture = str(data.get("texture") or "").strip().lower()
    color_status = str(data.get("color_status") or data.get("colorStatus") or "").strip().lower()
    scalp = str(data.get("scalp") or "").strip().lower()
    if not (condition and texture and color_status):
        return None
    return SimpleNamespace(
        condition=condition,
        texture=texture,
        color_status=color_status,
        scalp=scalp,
        concerns=[],
        is_complete=True,
        tag_set=lambda: {t for t in (condition, texture, color_status) if t},
    )


def _fit_payload(product_like, ingredients: list[str], profile) -> dict:
    fit = suitability_for_user(product_like, profile)
    scored = score_against_hair(product_like, ingredients, profile, "")
    return {
        "match_percent": fit["match_percent"],
        "fit_verdict": fit["fit_verdict"] or scored.get("verdict"),
        "fit_reasons": fit["fit_reasons"],
        "usage_steps": fit["usage_steps"],
        "safety_score": scored.get("safety_score"),
        "flags": scored.get("flags") or [],
    }


class AdminProductUpsertView(UnthrottledAPIView):
    """POST /api/admin/products/ — barcode bo'yicha create yoki update."""

    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        barcode = normalize_barcode(request.data.get("barcode") or "")
        obj = find_product_by_barcode(barcode) if barcode else None
        creating = obj is None
        if creating:
            ser = CareProductSerializer(data=request.data, context={"request": request})
        else:
            ser = CareProductSerializer(
                instance=obj,
                data=request.data,
                partial=True,
                context={"request": request},
            )
        ser.is_valid(raise_exception=True)
        name = str(ser.validated_data.get("name") or getattr(obj, "name", "") or "").strip()
        brand = str(ser.validated_data.get("brand") or getattr(obj, "brand", "") or "").strip()
        if not name:
            return Response({"detail": "Mahsulot nomi kerak."}, status=400)
        if creating:
            obj = ser.save(slug=_unique_slug(name, brand), created_by=None)
        else:
            obj = ser.save()
            if "name" in ser.validated_data or "brand" in ser.validated_data:
                desired = _unique_slug(name, brand, exclude_pk=obj.pk)
                if desired != obj.slug:
                    obj.slug = desired
                    obj.save(update_fields=["slug"])
        image = request.FILES.get("image")
        if image:
            obj.image = image
            obj.save(update_fields=["image"])
        return Response(
            CareProductSerializer(obj, context={"request": request}).data,
            status=status.HTTP_201_CREATED if creating else status.HTTP_200_OK,
        )


class AdminProductLookupView(UnthrottledAPIView):
    """GET — admin forma uchun barcode auto-fill."""

    permission_classes = [IsAdmin]

    def get(self, request):
        barcode = normalize_barcode(request.query_params.get("barcode") or "")
        if len(barcode) < 8:
            return Response({"detail": "Barcode kamida 8 ta raqam bo'lishi kerak."}, status=400)
        country = detect_country_from_barcode(barcode)
        local = find_product_by_barcode(barcode)
        if local is not None:
            return Response(
                {
                    "barcode": barcode,
                    "source": "db",
                    "country": country,
                    "local": CareProductSerializer(local, context={"request": request}).data,
                    "external": None,
                }
            )
        external = lookup_external_product(barcode)
        return Response(
            {
                "barcode": barcode,
                "source": (external or {}).get("source"),
                "country": country,
                "local": None,
                "external": external,
            }
        )


class ProductBarcodeLookupView(UnthrottledAPIView):
    """GET /api/products/barcode/:barcode/ — user/mobile asosiy lookup."""

    permission_classes = [AllowAny]

    def get(self, request, barcode: str):
        code = normalize_barcode(barcode)
        if len(code) < 8:
            return Response({"detail": "Noto'g'ri barcode."}, status=400)
        country = detect_country_from_barcode(code)
        profile = _profile_from_request(request)

        local = find_product_by_barcode(code)
        if local is not None:
            data = CareProductSerializer(local, context={"request": request}).data
            ingredients = local.ingredients if isinstance(local.ingredients, list) else []
            if not ingredients:
                ingredients = parse_ingredients_text(str(local.ingredients_text or ""))
            fit = _fit_payload(local, ingredients, profile)
            return Response(
                {
                    "found": True,
                    "source": "db",
                    "barcode": code,
                    "country": country,
                    "product": data,
                    **fit,
                }
            )

        external = lookup_external_product(code)
        if external is None:
            return Response(
                {
                    "found": False,
                    "source": None,
                    "barcode": code,
                    "country": country,
                    "detail": "Mahsulot topilmadi.",
                },
                status=404,
            )

        payload = external_as_product_payload(external)
        ghost = SimpleNamespace(
            name=payload["name"],
            brand=payload["brand"],
            category=payload["category"],
            suitable_for=[],
            not_suitable_for=[],
            scalp_types=[],
            concerns=[],
            ingredients=payload["ingredients"],
            ingredients_text=payload["ingredients_text"],
            usage_uz=payload["usage_uz"],
            sort_order=0,
        )
        fit = _fit_payload(ghost, payload["ingredients"], profile)
        return Response(
            {
                "found": True,
                "source": external.get("source"),
                "barcode": code,
                "country": country,
                "product": payload,
                **fit,
            }
        )
