"""Barber panel: qulayliklar katalogi va salon biriktirish."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_utils import is_platform_admin, request_barber
from barbers.activation_permissions import IsAuthenticatedBarberAware
from salons.amenity_sync import sync_salon_amenities
from salons.models import Amenity, Salon, SalonMembership


def _amenity_lang(request) -> str:
    raw = (request.query_params.get("lang") or request.headers.get("Accept-Language") or "uz").split(",")[0]
    code = raw.strip().lower().split("-")[0]
    return code if code in ("uz", "ru", "en") else "uz"


def _serialize_amenity(amenity: Amenity, lang: str) -> dict:
    labels = amenity.labels or {}
    label = labels.get(lang) or labels.get("uz") or amenity.code
    return {"code": amenity.code, "icon": amenity.icon, "label": label}


def _owner_can_edit_salon(bp, salon: Salon) -> bool:
    return bp is not None and salon.owner_barber_id == bp.id


class AmenityCatalogView(APIView):
    """Barcha qulayliklar katalogi (50 ta)."""

    permission_classes = [IsAuthenticatedBarberAware]

    def get(self, request):
        lang = _amenity_lang(request)
        rows = [_serialize_amenity(a, lang) for a in Amenity.objects.all().order_by("code")]
        return Response(rows)


class BarberSalonAmenitiesView(APIView):
    """
    GET ?salon=<id> — katalog + tanlangan kodlar.
    PUT { salon, amenity_codes } — salon egasi qulayliklarni yangilaydi.
    """

    permission_classes = [IsAuthenticatedBarberAware]

    def get(self, request):
        bp = request_barber(request)
        if bp is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        salon_id = request.query_params.get("salon")
        if not salon_id:
            return Response({"detail": "salon query param required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            sid = int(salon_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid salon id."}, status=status.HTTP_400_BAD_REQUEST)

        salon = get_object_or_404(Salon, pk=sid)
        allowed = _owner_can_edit_salon(bp, salon) or is_platform_admin(request) or (
            SalonMembership.objects.filter(
                salon=salon,
                barber=bp,
                invite_state=SalonMembership.InviteState.ACTIVE,
            ).exists()
        )
        if not allowed:
            return Response(status=status.HTTP_403_FORBIDDEN)

        lang = _amenity_lang(request)
        catalog = [_serialize_amenity(a, lang) for a in Amenity.objects.all().order_by("code")]
        selected = list(
            salon.salon_amenities.select_related("amenity").values_list("amenity__code", flat=True)
        )
        return Response(
            {
                "salon_id": salon.id,
                "can_edit": _owner_can_edit_salon(bp, salon) or is_platform_admin(request),
                "selected_codes": selected,
                "catalog": catalog,
            }
        )

    def put(self, request):
        bp = request_barber(request)
        if bp is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        salon_id = request.data.get("salon")
        codes = request.data.get("amenity_codes")
        if salon_id is None:
            return Response({"detail": "salon required."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(codes, list):
            return Response({"detail": "amenity_codes must be a list."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            sid = int(salon_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid salon id."}, status=status.HTTP_400_BAD_REQUEST)

        salon = get_object_or_404(Salon, pk=sid)
        if not _owner_can_edit_salon(bp, salon) and not is_platform_admin(request):
            return Response(status=status.HTTP_403_FORBIDDEN)

        try:
            sync_salon_amenities(salon, codes)
        except serializers.ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        lang = _amenity_lang(request)
        selected = list(
            salon.salon_amenities.select_related("amenity").values_list("amenity__code", flat=True)
        )
        return Response(
            {
                "salon_id": salon.id,
                "selected_codes": selected,
                "catalog": [_serialize_amenity(a, lang) for a in Amenity.objects.all().order_by("code")],
            }
        )
