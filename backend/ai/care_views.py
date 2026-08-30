"""User Parvarish katalogi va soch profili."""

from __future__ import annotations

from django.db.models import Count, Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from accounts.customer_permissions import IsAuthenticatedCustomer
from ai.care_serializers import CareProductSerializer, HairCareProfileSerializer
from ai.models import CareProduct, CareProductLike, CareUserProduct, HairCareProfile
from ai.services.care_match import recommend_products, suitability_for_user
from ai.services.errors import AiStyleError
from ai.services.gemini_care_plan import generate_care_plan
from ai.unthrottled import UnthrottledAPIView
from subscriptions.services import can_use_morph_care


def _liked_ids_for(user, product_ids: list[int]) -> set[int]:
    if not getattr(user, "is_authenticated", False) or not product_ids:
        return set()
    return set(
        CareProductLike.objects.filter(user=user, product_id__in=product_ids).values_list(
            "product_id", flat=True
        )
    )


def _serialize_products(request, products):
    ids = [p.id for p in products]
    ctx = {
        "request": request,
        "liked_product_ids": _liked_ids_for(request.user, ids),
    }
    data = CareProductSerializer(products, many=True, context=ctx).data
    profile = None
    if getattr(request.user, "is_authenticated", False):
        profile = HairCareProfile.objects.filter(user=request.user).first()
    for product, row in zip(products, data):
        fit = suitability_for_user(product, profile)
        row["match_percent"] = fit["match_percent"]
        row["fit_verdict"] = fit["fit_verdict"]
        row["fit_reasons"] = fit["fit_reasons"]
        row["usage_steps"] = fit["usage_steps"]
    return data


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
        qs = CareProduct.objects.filter(is_published=True).annotate(likes_count=Count("likes"))
        category = (request.query_params.get("category") or "").strip().lower()
        q = (request.query_params.get("q") or "").strip()
        recommended = request.query_params.get("recommended") in ("1", "true", "yes")
        order = (request.query_params.get("order") or "").strip().lower()
        exclude_mine = request.query_params.get("exclude_mine") in ("1", "true", "yes")
        exclude_raw = (request.query_params.get("exclude_ids") or "").strip()

        exclude_ids: set[int] = set()
        if exclude_raw:
            for part in exclude_raw.split(","):
                part = part.strip()
                if part.isdigit():
                    exclude_ids.add(int(part))
        if exclude_mine and getattr(request.user, "is_authenticated", False):
            exclude_ids.update(
                CareUserProduct.objects.filter(user=request.user).values_list(
                    "product_id", flat=True
                )
            )

        if category in {c[0] for c in CareProduct.Category.choices}:
            qs = qs.filter(category=category)
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(brand__icontains=q)
                | Q(purpose_uz__icontains=q)
                | Q(ingredients_text__icontains=q)
            )
        if exclude_ids:
            qs = qs.exclude(id__in=exclude_ids)

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
            if exclude_ids:
                products = [p for p in products if p.id not in exclude_ids]
            ids = [p.id for p in products]
            annotated = {
                p.id: p
                for p in CareProduct.objects.filter(id__in=ids).annotate(likes_count=Count("likes"))
            }
            products = [annotated[i] for i in ids if i in annotated]
            if order in ("likes", "-likes", "popular"):
                products.sort(key=lambda p: int(getattr(p, "likes_count", 0) or 0), reverse=True)
            return Response(_serialize_products(request, products))

        if order in ("likes", "-likes", "popular"):
            qs = qs.order_by("-likes_count", "sort_order", "name")
        else:
            qs = qs.order_by("sort_order", "name")
        products = list(qs[:200])
        if getattr(request.user, "is_authenticated", False):
            from ai.services.care_insights import record_product_event

            for product in products[:40]:
                record_product_event(product, request.user, kind="view")
        return Response(_serialize_products(request, products))


class CareProductDetailView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id: int):
        try:
            obj = CareProduct.objects.annotate(likes_count=Count("likes")).get(
                pk=product_id, is_published=True
            )
        except CareProduct.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)
        data = CareProductSerializer(
            obj,
            context={
                "request": request,
                "liked_product_ids": _liked_ids_for(request.user, [obj.id]),
            },
        ).data
        profile = None
        if getattr(request.user, "is_authenticated", False):
            profile = HairCareProfile.objects.filter(user=request.user).first()
        fit = suitability_for_user(obj, profile)
        data["match_percent"] = fit["match_percent"]
        data["fit_verdict"] = fit["fit_verdict"]
        data["fit_reasons"] = fit["fit_reasons"]
        data["usage_steps"] = fit["usage_steps"]
        from ai.services.care_insights import record_product_event

        record_product_event(obj, request.user, kind="click")
        return Response(data)


class CareProductLikeToggleView(UnthrottledAPIView):
    permission_classes = [IsAuthenticatedCustomer]

    def post(self, request, product_id: int):
        try:
            product = CareProduct.objects.get(pk=product_id, is_published=True)
        except CareProduct.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)

        existing = CareProductLike.objects.filter(user=request.user, product=product).first()
        if existing:
            existing.delete()
            liked = False
        else:
            CareProductLike.objects.create(user=request.user, product=product)
            liked = True

        likes_count = CareProductLike.objects.filter(product=product).count()
        return Response({"liked": liked, "likes_count": likes_count, "product_id": product.id})


class CarePlanGenerateView(UnthrottledAPIView):
    """POST — soch profili + foydalanuvchi mahsulotlaridan AI parvarish rejasi."""

    permission_classes = [IsAuthenticatedCustomer]

    def post(self, request):
        user = request.user

        if not can_use_morph_care(user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )

        profile = HairCareProfile.objects.filter(user=user).first()
        condition = (request.data.get("condition") or (profile.condition if profile else "") or "").strip()
        texture = (request.data.get("texture") or (profile.texture if profile else "") or "").strip()
        color_status = (
            request.data.get("color_status")
            or request.data.get("colorStatus")
            or (profile.color_status if profile else "")
            or ""
        ).strip()
        scalp = (
            request.data.get("scalp")
            or (profile.scalp if profile else "")
            or ""
        ).strip()
        raw_concerns = request.data.get("concerns")
        if isinstance(raw_concerns, list):
            concerns = [str(x).strip() for x in raw_concerns if str(x).strip()]
        else:
            concerns = list(profile.concerns or []) if profile and isinstance(profile.concerns, list) else []

        if not condition or not texture or not color_status:
            return Response(
                {"detail": "Avval soch profilingizni to'ldiring."},
                status=400,
            )

        raw_products = request.data.get("products")
        product_payload: list[dict] = []
        if isinstance(raw_products, list) and raw_products:
            ids: list[int] = []
            for item in raw_products[:24]:
                if isinstance(item, dict) and item.get("id") is not None:
                    try:
                        ids.append(int(item["id"]))
                    except (TypeError, ValueError):
                        continue
                elif isinstance(item, int):
                    ids.append(item)
            catalog = {
                p.id: p
                for p in CareProduct.objects.filter(id__in=ids, is_published=True)
            }
            for item in raw_products[:24]:
                if not isinstance(item, dict):
                    continue
                try:
                    pid = int(item.get("id"))
                except (TypeError, ValueError):
                    continue
                db = catalog.get(pid)
                fit = suitability_for_user(db, profile) if db else {}
                product_payload.append(
                    {
                        "id": pid,
                        "name": str(item.get("name") or (db.name if db else "")).strip(),
                        "brand": str(item.get("brand") or (db.brand if db else "")).strip(),
                        "category": str(
                            item.get("category") or (db.category if db else "other")
                        ).strip(),
                        "usage_uz": (db.usage_uz if db else "") or "",
                        "purpose_uz": (db.purpose_uz if db else "") or "",
                        "match_percent": fit.get("match_percent"),
                        "fit_reasons": fit.get("fit_reasons") or [],
                        "usage_steps": fit.get("usage_steps") or [],
                        "concerns": list(db.concerns or []) if db else [],
                        "scalp_types": list(db.scalp_types or []) if db else [],
                    }
                )

        try:
            plan = generate_care_plan(
                condition=condition,
                texture=texture,
                color_status=color_status,
                scalp=scalp,
                concerns=concerns,
                products=product_payload,
            )
        except AiStyleError as exc:
            return Response({"detail": str(exc)}, status=exc.status or 502)

        usage = plan.pop("_usage", None)
        return Response({"plan": plan, "usage": usage})


def _serialize_my_product(request, row: CareUserProduct) -> dict:
    p = row.product
    return {
        "id": p.id,
        "name": p.name,
        "brand": p.brand or "",
        "category": p.category,
        "image_url": CareProductSerializer(
            p, context={"request": request, "liked_product_ids": set()}
        ).data.get("image_url"),
        "source": row.source,
        "added_at": row.created_at.isoformat() if row.created_at else None,
        "save_id": row.id,
    }


class CareMyProductListCreateView(UnthrottledAPIView):
    """GET/POST — foydalanuvchi mahsulotlari (DB)."""

    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        rows = (
            CareUserProduct.objects.filter(user=request.user)
            .select_related("product")
            .order_by("-created_at")
        )
        return Response([_serialize_my_product(request, r) for r in rows if r.product_id])

    def post(self, request):
        try:
            product_id = int(request.data.get("product_id"))
        except (TypeError, ValueError):
            return Response({"detail": "product_id kerak."}, status=400)
        source = (request.data.get("source") or "catalog").strip().lower()
        if source not in {c[0] for c in CareUserProduct.Source.choices}:
            source = CareUserProduct.Source.CATALOG
        try:
            product = CareProduct.objects.get(pk=product_id, is_published=True)
        except CareProduct.DoesNotExist:
            return Response({"detail": "Topilmadi"}, status=404)

        row, created = CareUserProduct.objects.get_or_create(
            user=request.user,
            product=product,
            defaults={"source": source},
        )
        if not created and row.source != source and source == CareUserProduct.Source.SCAN:
            row.source = source
            row.save(update_fields=["source"])
        return Response(
            _serialize_my_product(request, row),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CareMyProductDeleteView(UnthrottledAPIView):
    permission_classes = [IsAuthenticatedCustomer]

    def delete(self, request, product_id: int):
        deleted, _ = CareUserProduct.objects.filter(
            user=request.user, product_id=product_id
        ).delete()
        if not deleted:
            return Response({"detail": "Topilmadi"}, status=404)
        return Response({"ok": True, "product_id": product_id})
