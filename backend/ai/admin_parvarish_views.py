"""Admin Parvarish — soch mahsulotlari CRUD va statistika."""

from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.care_serializers import CareProductSerializer
from ai.models import CareProduct, IngredientScanEntry
from ai.unthrottled import UnthrottledAPIView


def _unique_slug(name: str, brand: str = "", *, exclude_pk: int | None = None) -> str:
    base = slugify(f"{brand}-{name}" if brand else name) or "product"
    slug = base[:170]
    n = 0
    qs = CareProduct.objects.all()
    if exclude_pk is not None:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=slug).exists():
        n += 1
        slug = f"{base[:160]}-{n}"
    return slug


class AdminParvarishStatsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.now().date()
        recent = IngredientScanEntry.objects.select_related("user", "matched_product")[:12]
        return Response(
            {
                "products_total": CareProduct.objects.count(),
                "products_published": CareProduct.objects.filter(is_published=True).count(),
                "scans_total": IngredientScanEntry.objects.count(),
                "scans_today": IngredientScanEntry.objects.filter(created_at__date=today).count(),
                "recent_scans": [
                    {
                        "id": row.id,
                        "user_id": row.user_id,
                        "verdict": row.verdict,
                        "safety_score": row.safety_score,
                        "extracted_name": row.extracted_name,
                        "product_name": row.matched_product.name if row.matched_product else "",
                        "created_at": row.created_at,
                    }
                    for row in recent
                ],
            }
        )


class AdminParvarishProductListCreateView(UnthrottledAPIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = CareProduct.objects.all().order_by("sort_order", "name")
        category = (request.query_params.get("category") or "").strip().lower()
        q = (request.query_params.get("q") or "").strip()
        published = request.query_params.get("published")
        if category in {c[0] for c in CareProduct.Category.choices}:
            qs = qs.filter(category=category)
        if published in ("0", "1"):
            qs = qs.filter(is_published=published == "1")
        if q:
            qs = qs.filter(
                Q(name__icontains=q) | Q(brand__icontains=q) | Q(slug__icontains=q)
            )
        ser = CareProductSerializer(qs[:400], many=True, context={"request": request})
        return Response(ser.data)

    def post(self, request):
        ser = CareProductSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        name = str(ser.validated_data.get("name") or "").strip()
        brand = str(ser.validated_data.get("brand") or "").strip()
        if not name:
            return Response({"detail": "Mahsulot nomi kerak."}, status=400)
        # Admin JWT → AdminPrincipal (User emas); created_by faqat User FK.
        obj = ser.save(slug=_unique_slug(name, brand), created_by=None)
        image = request.FILES.get("image")
        if image:
            obj.image = image
            obj.save(update_fields=["image"])
        return Response(
            CareProductSerializer(obj, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminParvarishProductDetailView(UnthrottledAPIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, product_id: int):
        try:
            obj = CareProduct.objects.get(pk=product_id)
        except CareProduct.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)
        return Response(CareProductSerializer(obj, context={"request": request}).data)

    def patch(self, request, product_id: int):
        try:
            obj = CareProduct.objects.get(pk=product_id)
        except CareProduct.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)
        ser = CareProductSerializer(
            instance=obj, data=request.data, partial=True, context={"request": request}
        )
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        name = str(obj.name or "").strip()
        brand = str(obj.brand or "").strip()
        if name and (not obj.slug or "name" in ser.validated_data or "brand" in ser.validated_data):
            desired = _unique_slug(name, brand, exclude_pk=obj.pk)
            if desired != obj.slug:
                obj.slug = desired
                obj.save(update_fields=["slug"])
        image = request.FILES.get("image")
        if image:
            obj.image = image
            obj.save(update_fields=["image"])
        return Response(CareProductSerializer(obj, context={"request": request}).data)

    def delete(self, request, product_id: int):
        try:
            obj = CareProduct.objects.get(pk=product_id)
        except CareProduct.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
