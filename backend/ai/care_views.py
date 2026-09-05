"""User Parvarish katalogi va soch profili."""

from __future__ import annotations

from django.db.models import Count, Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from accounts.customer_permissions import IsAuthenticatedCustomer
from ai.care_serializers import (
    CareProductSerializer,
    CareShelfEstimateInputSerializer,
    CareShelfItemSerializer,
    HairCareProfileSerializer,
)
from ai.models import CareProduct, CareProductLike, CareShelfItem, CareUserProduct, HairCareProfile
from ai.services.care_refill_tracker import (
    STATUS_EXPIRED,
    STATUS_REFILL_SOON,
    build_refill_estimate,
    calculate_refill_metrics,
)
from ai.services.care_match import recommend_products, suitability_for_user
from ai.services.errors import AiStyleError
from ai.services.gemini_care_plan import generate_care_plan
from ai.services.gemini_growth_forecast import generate_hair_growth_forecast
from ai.services.gemini_sos_style import generate_sos_fix
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

        # Auth user jinsi bo‘yicha mahsulot filtri (tavsiya qilinmagan ro‘yxat ham).
        if getattr(request.user, "is_authenticated", False):
            gender = (getattr(request.user, "gender", None) or "").strip().lower()
            if gender == "male":
                qs = qs.filter(Q(audience__in=["men", "unisex"]) | Q(audience=""))
            elif gender == "female":
                qs = qs.filter(Q(audience__in=["women", "unisex"]) | Q(audience=""))

        if recommended and request.user.is_authenticated:
            profile = HairCareProfile.objects.filter(user=request.user).first()
            audience = None
            gender = (getattr(request.user, "gender", None) or "").strip().lower()
            if gender == "male":
                audience = "men"
            elif gender == "female":
                audience = "women"
            products = recommend_products(profile, limit=40, audience=audience)
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

        mode = str(request.data.get("mode") or "full").strip().lower()
        existing_plan = request.data.get("existing_plan")
        morning_time = str(
            request.data.get("morning_time") or request.data.get("morningTime") or ""
        ).strip()
        evening_time = str(
            request.data.get("evening_time") or request.data.get("eveningTime") or ""
        ).strip()
        if mode == "append" and not isinstance(existing_plan, dict):
            return Response({"detail": "Append uchun existing_plan kerak."}, status=400)
        if mode == "append" and not product_payload:
            return Response({"detail": "Append uchun yangi mahsulot kerak."}, status=400)

        try:
            plan = generate_care_plan(
                condition=condition,
                texture=texture,
                color_status=color_status,
                scalp=scalp,
                concerns=concerns,
                products=product_payload,
                gender=(getattr(request.user, "gender", None) or "").strip().lower(),
                mode=mode,
                existing_plan=existing_plan if isinstance(existing_plan, dict) else None,
                morning_time=morning_time,
                evening_time=evening_time,
            )
        except AiStyleError as exc:
            return Response({"detail": str(exc)}, status=exc.status or 502)

        usage = plan.pop("_usage", None)
        return Response({"plan": plan, "usage": usage})


class CareGrowthForecastView(UnthrottledAPIView):
    """POST — Hair Growth & Health Tracker uchun 3 oylik prognoz."""

    permission_classes = [IsAuthenticatedCustomer]

    def post(self, request):
        if not can_use_morph_care(request.user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            current_length_cm = float(request.data.get("current_length_cm"))
        except (TypeError, ValueError):
            return Response({"detail": "current_length_cm raqam bo'lishi kerak."}, status=400)
        if current_length_cm <= 0:
            return Response({"detail": "current_length_cm 0 dan katta bo'lishi kerak."}, status=400)

        raw_count = request.data.get("check_ins_count")
        try:
            check_ins_count = int(raw_count if raw_count is not None else 0)
        except (TypeError, ValueError):
            check_ins_count = 0
        check_ins_count = max(0, min(4, check_ins_count))

        raw_products = request.data.get("products_used")
        products_used = (
            [str(x or "").strip() for x in raw_products[:16] if str(x or "").strip()]
            if isinstance(raw_products, list)
            else []
        )

        try:
            forecast = generate_hair_growth_forecast(
                current_length_cm=current_length_cm,
                check_ins_count=check_ins_count,
                products_used=products_used,
            )
        except AiStyleError as exc:
            return Response({"detail": str(exc)}, status=exc.status or 502)

        usage = forecast.pop("_usage", None)
        return Response({"forecast": forecast, "usage": usage})


SOS_TIME_CHOICES = {"2min", "5-10min", "15min+"}
SOS_ISSUE_CHOICES = {"frizzy", "oily", "bedhead", "dry"}
SOS_TOOL_CHOICES = {"dryer", "dry_shampoo", "water_spray", "comb", "wax_gel", "nothing"}


def _pick_choices(raw, allowed: set[str], limit: int) -> list[str]:
    if isinstance(raw, str):
        raw = [raw]
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        key = str(item or "").strip().lower()
        if key in allowed and key not in out:
            out.append(key)
        if len(out) >= limit:
            break
    return out


def _as_bool(raw, default: bool = True) -> bool:
    if raw is None:
        return default
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() not in {"0", "false", "no", "off"}


class CareSosFixView(UnthrottledAPIView):
    """POST — "Bad Hair Day" tezkor styling yechimi (salon tavsiyasisiz)."""

    permission_classes = [IsAuthenticatedCustomer]

    def post(self, request):
        if not can_use_morph_care(request.user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )

        time_available = str(request.data.get("time_available") or "").strip().lower()
        if time_available not in SOS_TIME_CHOICES:
            return Response({"detail": "Qancha vaqtingiz borligini tanlang."}, status=400)

        issues = _pick_choices(
            request.data.get("hair_issue") or request.data.get("issues"),
            SOS_ISSUE_CHOICES,
            limit=4,
        )
        if not issues:
            return Response({"detail": "Asosiy muammoni tanlang."}, status=400)

        tools = _pick_choices(
            request.data.get("tools_available") or request.data.get("tools"),
            SOS_TOOL_CHOICES,
            limit=6,
        )
        if "nothing" in tools and len(tools) > 1:
            tools = [t for t in tools if t != "nothing"]

        profile = HairCareProfile.objects.filter(user=request.user).first()
        fix = generate_sos_fix(
            time_available=time_available,
            issues=issues,
            tools=tools,
            condition=(profile.condition if profile else "") or "",
            texture=(profile.texture if profile else "") or "",
            gender=(getattr(request.user, "gender", None) or "").strip().lower(),
        )
        usage = fix.pop("_usage", None)
        return Response({"fix": fix, "usage": usage})


def _shelf_status_label(*, status_flag: str, days_left: int, days_to_pao: int) -> str:
    if status_flag == STATUS_EXPIRED:
        return "Muddati o'tgan (PAO)"
    if days_to_pao <= 7:
        return f"PAO tugashiga {max(days_to_pao, 0)} kun qoldi"
    if status_flag == STATUS_REFILL_SOON:
        return "1 haftada tugaydi — Yangilash vaqti keldi"
    return f"Yana {max(days_left, 0)} kunga yetadi"


def _serialize_shelf_item(request, row: CareShelfItem) -> dict:
    metrics = calculate_refill_metrics(
        volume_ml=row.volume_ml,
        uses_per_day=row.uses_per_day,
        dose_ml_per_use=row.dose_ml_per_use,
        opened_at=row.opened_at,
        pao_months=row.pao_months,
    )
    image_url = None
    if row.product_id:
        image_url = CareProductSerializer(
            row.product, context={"request": request, "liked_product_ids": set()}
        ).data.get("image_url")
    return {
        "id": row.id,
        "product_id": row.product_id,
        "image_url": image_url,
        "name": row.name,
        "brand": row.brand,
        "category": row.category,
        "volume_ml": row.volume_ml,
        "usage_frequency": row.usage_frequency,
        "uses_per_day": row.uses_per_day,
        "dose_ml_per_use": row.dose_ml_per_use,
        "opened_at": row.opened_at.isoformat(),
        "pao_months": row.pao_months,
        "pao_code": f"{row.pao_months}M",
        "ai_advice": row.ai_advice,
        "status_flag": metrics["status_flag"],
        "status_label": _shelf_status_label(
            status_flag=metrics["status_flag"],
            days_left=metrics["estimated_days_left"],
            days_to_pao=metrics["days_to_pao"],
        ),
        **metrics,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


class CareShelfEstimateView(UnthrottledAPIView):
    permission_classes = [IsAuthenticatedCustomer]

    def post(self, request):
        if not can_use_morph_care(request.user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = CareShelfEstimateInputSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        estimate = build_refill_estimate(
            product_name=str(d["product_name"]),
            category=str(d["category"]),
            volume_ml=int(d["volume_ml"]),
            usage_frequency=str(d["usage_frequency"]),
            opened_at=d["opened_at"],
            pao_months=int(d["pao_months"]),
            dose_ml_per_use=float(d["dose_ml_per_use"]) if d.get("dose_ml_per_use") else None,
            with_ai=True,
        )
        usage = estimate.pop("_usage", None)
        return Response({"estimate": estimate, "usage": usage})


class CareShelfListCreateView(UnthrottledAPIView):
    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        if not can_use_morph_care(request.user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )
        rows = (
            CareShelfItem.objects.filter(user=request.user)
            .select_related("product")
            .order_by("-updated_at")
        )
        items = [_serialize_shelf_item(request, r) for r in rows]
        summary = {
            "active": sum(1 for i in items if i["status_flag"] == "OK"),
            "refill_soon": sum(1 for i in items if i["status_flag"] == STATUS_REFILL_SOON),
            "expired": sum(1 for i in items if i["status_flag"] == STATUS_EXPIRED),
        }
        return Response({"items": items, "summary": summary})

    def post(self, request):
        if not can_use_morph_care(request.user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )
        product = None
        raw_product_id = request.data.get("product_id")
        if raw_product_id not in (None, "", 0, "0"):
            try:
                product = CareProduct.objects.get(id=int(raw_product_id), is_published=True)
            except (TypeError, ValueError, CareProduct.DoesNotExist):
                return Response({"detail": "Noto'g'ri product_id."}, status=400)

        payload = {
            "product": product.id if product else None,
            "name": str(request.data.get("name") or (product.name if product else "")).strip(),
            "brand": str(request.data.get("brand") or (product.brand if product else "")).strip(),
            "category": str(request.data.get("category") or "hair").strip().lower(),
            "volume_ml": request.data.get("volume_ml") or 100,
            "usage_frequency": str(request.data.get("usage_frequency") or "kuniga_1").strip(),
            "opened_at": request.data.get("opened_at"),
            "pao_months": request.data.get("pao_months") or 12,
        }
        ser = CareShelfItemSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        estimate = build_refill_estimate(
            product_name=str(d["name"]),
            category=str(d["category"]),
            volume_ml=int(d["volume_ml"]),
            usage_frequency=str(d["usage_frequency"]),
            opened_at=d["opened_at"],
            pao_months=int(d["pao_months"]),
            with_ai=_as_bool(request.data.get("with_ai"), default=True),
        )
        row = CareShelfItem.objects.create(
            user=request.user,
            product=product,
            name=d["name"],
            brand=d.get("brand") or "",
            category=d["category"],
            volume_ml=int(d["volume_ml"]),
            usage_frequency=str(d["usage_frequency"]),
            uses_per_day=float(estimate["uses_per_day"]),
            dose_ml_per_use=float(estimate["dose_ml_per_use"]),
            opened_at=d["opened_at"],
            pao_months=int(d["pao_months"]),
            ai_advice=str(estimate.get("ai_advice") or "")[:220],
        )
        usage = estimate.pop("_usage", None)
        return Response(
            {"item": _serialize_shelf_item(request, row), "usage": usage},
            status=status.HTTP_201_CREATED,
        )


class CareShelfDetailView(UnthrottledAPIView):
    permission_classes = [IsAuthenticatedCustomer]

    def patch(self, request, item_id: int):
        if not can_use_morph_care(request.user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )
        row = CareShelfItem.objects.filter(user=request.user, id=item_id).select_related("product").first()
        if not row:
            return Response({"detail": "Topilmadi"}, status=404)
        payload = {
            "product": row.product_id,
            "name": request.data.get("name", row.name),
            "brand": request.data.get("brand", row.brand),
            "category": request.data.get("category", row.category),
            "volume_ml": request.data.get("volume_ml", row.volume_ml),
            "usage_frequency": request.data.get("usage_frequency", row.usage_frequency),
            "opened_at": request.data.get("opened_at", row.opened_at),
            "pao_months": request.data.get("pao_months", row.pao_months),
        }
        if "product_id" in request.data:
            raw_product_id = request.data.get("product_id")
            if raw_product_id in (None, "", 0, "0"):
                payload["product"] = None
            else:
                try:
                    product = CareProduct.objects.get(id=int(raw_product_id), is_published=True)
                except (TypeError, ValueError, CareProduct.DoesNotExist):
                    return Response({"detail": "Noto'g'ri product_id."}, status=400)
                payload["product"] = product.id

        ser = CareShelfItemSerializer(instance=row, data=payload, partial=True)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        if "product" in d:
            row.product = d.get("product")
        elif payload.get("product") is None:
            row.product = None
        row.name = d.get("name", row.name)
        row.brand = d.get("brand", row.brand)
        row.category = d.get("category", row.category)
        row.volume_ml = int(d.get("volume_ml", row.volume_ml))
        row.usage_frequency = str(d.get("usage_frequency", row.usage_frequency))
        row.opened_at = d.get("opened_at", row.opened_at)
        row.pao_months = int(d.get("pao_months", row.pao_months))

        estimate = build_refill_estimate(
            product_name=row.name,
            category=row.category,
            volume_ml=row.volume_ml,
            usage_frequency=row.usage_frequency,
            opened_at=row.opened_at,
            pao_months=row.pao_months,
            with_ai=_as_bool(request.data.get("with_ai"), default=True),
        )
        row.uses_per_day = float(estimate["uses_per_day"])
        row.dose_ml_per_use = float(estimate["dose_ml_per_use"])
        row.ai_advice = str(estimate.get("ai_advice") or row.ai_advice)[:220]
        row.save()
        usage = estimate.pop("_usage", None)
        row.refresh_from_db()
        return Response({"item": _serialize_shelf_item(request, row), "usage": usage})

    def delete(self, request, item_id: int):
        if not can_use_morph_care(request.user):
            return Response(
                {"detail": "Morph AI Parvarish Pro obunasida mavjud."},
                status=status.HTTP_403_FORBIDDEN,
            )
        row = CareShelfItem.objects.filter(user=request.user, id=item_id).first()
        if not row:
            return Response(status=status.HTTP_204_NO_CONTENT)
        row.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
        "usage_uz": (p.usage_uz or "")[:400],
        "purpose_uz": (p.purpose_uz or "")[:240],
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
