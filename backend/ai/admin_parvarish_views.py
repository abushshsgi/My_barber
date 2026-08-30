"""Admin Parvarish — soch mahsulotlari CRUD va statistika."""

from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.care_serializers import CareProductSerializer
from ai.models import CareProduct, CareProductLike, CareUserProduct, IngredientScanEntry
from ai.serializers import _media_absolute_url
from ai.unthrottled import UnthrottledAPIView
from ai.management.commands.seed_care_demo_products import (
    DEMO_PRODUCTS,
    DEMO_SLUG_PREFIX,
    demo_product_defaults,
)


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
                "likes_total": CareProductLike.objects.count(),
                "my_products_total": CareUserProduct.objects.count(),
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


class AdminParvarishLikesView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        products = (
            CareProduct.objects.annotate(likes_count=Count("likes"))
            .filter(likes_count__gt=0)
            .order_by("-likes_count", "name")
        )
        if q:
            products = products.filter(
                Q(name__icontains=q) | Q(brand__icontains=q) | Q(slug__icontains=q)
            )

        rows = []
        for product in products[:200]:
            likes = (
                CareProductLike.objects.filter(product=product)
                .select_related("user")
                .order_by("-created_at")[:50]
            )
            rows.append(
                {
                    "product_id": product.id,
                    "product_name": product.name,
                    "brand": product.brand,
                    "category": product.category,
                    "image_url": _media_absolute_url(request, product.image),
                    "likes_count": int(product.likes_count),
                    "likers": [
                        {
                            "user_id": like.user_id,
                            "full_name": getattr(like.user, "full_name", "") or "",
                            "phone": getattr(like.user, "phone", "") or "",
                            "username": getattr(like.user, "username", "") or "",
                            "liked_at": like.created_at.isoformat() if like.created_at else None,
                        }
                        for like in likes
                    ],
                }
            )

        return Response(
            {
                "total_likes": CareProductLike.objects.count(),
                "products_liked": len(rows),
                "products": rows,
            }
        )


class AdminParvarishMyProductsView(UnthrottledAPIView):
    """Admin — foydalanuvchilar saqlagan mahsulotlar."""

    permission_classes = [IsAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = CareUserProduct.objects.select_related("user", "product").order_by("-created_at")
        if q:
            qs = qs.filter(
                Q(product__name__icontains=q)
                | Q(product__brand__icontains=q)
                | Q(user__phone__icontains=q)
                | Q(user__username__icontains=q)
                | Q(user__full_name__icontains=q)
            )
        rows = []
        for row in qs[:300]:
            p = row.product
            u = row.user
            rows.append(
                {
                    "id": row.id,
                    "source": row.source,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "user": {
                        "id": u.id,
                        "full_name": getattr(u, "full_name", "") or "",
                        "phone": getattr(u, "phone", "") or "",
                        "username": getattr(u, "username", "") or "",
                    },
                    "product": {
                        "id": p.id,
                        "name": p.name,
                        "brand": p.brand,
                        "category": p.category,
                        "image_url": _media_absolute_url(request, p.image),
                    },
                }
            )
        return Response(
            {
                "total": CareUserProduct.objects.count(),
                "rows": rows,
            }
        )


class AdminParvarishProductListCreateView(UnthrottledAPIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = (
            CareProduct.objects.annotate(
                likes_count=Count("likes"),
                viewers_count=Count("insights", filter=Q(insights__views__gt=0)),
                clickers_count=Count("insights", filter=Q(insights__clicks__gt=0)),
            )
            .all()
            .order_by("sort_order", "name")
        )
        category = (request.query_params.get("category") or "").strip().lower()
        q = (request.query_params.get("q") or "").strip()
        published = request.query_params.get("published")
        if category in {c[0] for c in CareProduct.Category.choices}:
            qs = qs.filter(category=category)
        if published in ("0", "1"):
            qs = qs.filter(is_published=published == "1")
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(brand__icontains=q)
                | Q(slug__icontains=q)
                | Q(barcode__icontains=q)
                | Q(country_of_origin__icontains=q)
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


class AdminParvarishDemoActionView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        action = (request.data.get("action") or "").strip().lower()
        if action == "purge":
            deleted_count, _ = CareProduct.objects.filter(
                slug__startswith=DEMO_SLUG_PREFIX
            ).delete()
            return Response(
                {
                    "success": True,
                    "action": "purge",
                    "deleted_count": deleted_count,
                    "message": f"{deleted_count} ta demo mahsulot o'chirildi",
                }
            )

        if action == "seed":
            created_count = 0
            updated_count = 0
            for item in DEMO_PRODUCTS:
                slug = item["slug"]
                defaults = demo_product_defaults(item)
                _, created = CareProduct.objects.update_or_create(
                    slug=slug,
                    defaults=defaults,
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

            return Response(
                {
                    "success": True,
                    "action": "seed",
                    "created_count": created_count,
                    "updated_count": updated_count,
                    "total": len(DEMO_PRODUCTS),
                    "message": f"20 ta demo mahsulot tayyorlandi ({created_count} yangi, {updated_count} yangilandi)",
                }
            )

        return Response(
            {"detail": "Noto'g'ri action. 'seed' yoki 'purge' yuboring."},
            status=status.HTTP_400_BAD_REQUEST,
        )

