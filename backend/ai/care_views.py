"""User Parvarish katalogi va soch profili."""

from __future__ import annotations

from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.customer_permissions import IsAuthenticatedCustomer
from ai.care_serializers import CareProductSerializer, HairCareProfileSerializer
from ai.models import CareProduct, HairCareProfile
from ai.services.care_match import recommend_products
from ai.unthrottled import UnthrottledAPIView


class HairCareProfileMeView(UnthrottledAPIView):
    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        profile, _ = HairCareProfile.objects.get_or_create(user=request.user)
        return Response(HairCareProfileSerializer(profile).data)

    def put(self, request):
        return self._save(request)

    def patch(self, request):
        return self._save(request)

    def _save(self, request):
        profile, _ = HairCareProfile.objects.get_or_create(user=request.user)
        ser = HairCareProfileSerializer(instance=profile, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        condition = ser.validated_data.get("condition", profile.condition)
        texture = ser.validated_data.get("texture", profile.texture)
        color_status = ser.validated_data.get("color_status", profile.color_status)
        if not condition or not texture or not color_status:
            return Response(
                {"detail": "Soch holati, tekstura va rangni kiriting."},
                status=400,
            )
        ser.save()
        profile.refresh_from_db()
        return Response(HairCareProfileSerializer(profile).data)


class CareProductListView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = CareProduct.objects.filter(is_published=True)
        category = (request.query_params.get("category") or "").strip().lower()
        q = (request.query_params.get("q") or "").strip()
        recommended = request.query_params.get("recommended") in ("1", "true", "yes")
        if category in {c[0] for c in CareProduct.Category.choices}:
            qs = qs.filter(category=category)
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(brand__icontains=q)
                | Q(purpose_uz__icontains=q)
                | Q(ingredients_text__icontains=q)
            )
        if recommended and request.user.is_authenticated:
            profile = HairCareProfile.objects.filter(user=request.user).first()
            products = recommend_products(profile, limit=40)
            if category:
                products = [p for p in products if p.category == category]
            if q:
                q_low = q.lower()
                products = [
                    p
                    for p in products
                    if q_low in p.name.lower()
                    or q_low in (p.brand or "").lower()
                    or q_low in (p.purpose_uz or "").lower()
                ]
            ser = CareProductSerializer(products, many=True, context={"request": request})
            return Response(ser.data)
        ser = CareProductSerializer(
            qs.order_by("sort_order", "name")[:200],
            many=True,
            context={"request": request},
        )
        return Response(ser.data)


class CareProductDetailView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id: int):
        try:
            obj = CareProduct.objects.get(pk=product_id, is_published=True)
        except CareProduct.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)
        return Response(CareProductSerializer(obj, context={"request": request}).data)
