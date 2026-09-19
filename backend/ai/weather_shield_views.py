"""Smart Weather Shield — user catalog + actions, admin CRUD."""

from __future__ import annotations

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.models import WeatherShieldCategory, WeatherShieldProduct, WeatherShieldUserAction
from ai.serializers import _media_absolute_url
from ai.unthrottled import UnthrottledAPIView


CATEGORY_KEYS = (
    ("high_uv_hot", "Issiq / yuqori UV", "sunny-outline"),
    ("high_humidity_rain", "Namlik / yomg‘ir", "rainy-outline"),
    ("cold", "Sovuq havo", "snow-outline"),
    ("high_wind", "Kuchli shamol", "flag-outline"),
    ("poor_aqi", "Havo sifati past", "leaf-outline"),
)


def ensure_default_categories() -> None:
    for i, (key, title, icon) in enumerate(CATEGORY_KEYS):
        WeatherShieldCategory.objects.get_or_create(
            key=key,
            defaults={
                "title_uz": title,
                "description_uz": f"{title} uchun soch himoyasi vositalari",
                "icon": icon,
                "sort_order": i,
                "is_active": True,
            },
        )


def active_triggers(
    *,
    temp: float | None,
    humidity: float | None,
    uv: float | None,
    wind: float | None,
    aqi: float | None,
    condition: str,
) -> list[str]:
    rainy = any(x in (condition or "").lower() for x in ("rain", "drizzle", "shower", "storm", "yomg"))
    out: list[str] = []
    if (uv is not None and uv >= 6) or (temp is not None and temp >= 28):
        out.append("high_uv_hot")
    if (humidity is not None and humidity >= 70) or rainy:
        out.append("high_humidity_rain")
    if temp is not None and temp <= 5:
        out.append("cold")
    if wind is not None and wind >= 20:
        out.append("high_wind")
    if aqi is not None and aqi >= 100:
        out.append("poor_aqi")
    return out


def _f(v) -> float | None:
    try:
        if v is None or v == "":
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def product_payload(p: WeatherShieldProduct, request) -> dict:
    img = ""
    if p.image:
        img = _media_absolute_url(request, p.image.url) or ""
    elif p.external_image_url:
        img = p.external_image_url
    return {
        "id": f"ws-{p.id}",
        "product_id": p.id,
        "type": p.kind,
        "title": p.name,
        "description": p.description_uz,
        "priority": p.priority,
        "icon": p.icon or "flask-outline",
        "productTag": p.product_tag or "",
        "image_url": img,
        "trigger": p.category.key,
        "category_key": p.category.key,
        "category_title": p.category.title_uz,
        "hair_conditions": p.hair_conditions or [],
    }


class WeatherShieldCatalogView(UnthrottledAPIView):
    """GET — ob-havo + soch holatiga mos himoya mahsulotlari."""

    permission_classes = [AllowAny]

    def get(self, request):
        ensure_default_categories()
        temp = _f(request.query_params.get("temp"))
        humidity = _f(request.query_params.get("humidity"))
        uv = _f(request.query_params.get("uv"))
        wind = _f(request.query_params.get("wind"))
        aqi = _f(request.query_params.get("aqi"))
        condition = (request.query_params.get("condition") or "").strip()
        hair = (request.query_params.get("hair_condition") or "").strip().lower()

        triggers = active_triggers(
            temp=temp, humidity=humidity, uv=uv, wind=wind, aqi=aqi, condition=condition
        )
        qs = (
            WeatherShieldProduct.objects.filter(is_published=True, category__is_active=True)
            .select_related("category")
        )
        if triggers:
            qs = qs.filter(category__key__in=triggers)
        else:
            qs = qs.none()

        rows = []
        for p in qs:
            conds = [str(c).lower() for c in (p.hair_conditions or [])]
            if conds and hair and hair not in conds:
                continue
            rows.append(product_payload(p, request))
        rows.sort(key=lambda r: (r["priority"], r["title"]))

        done_ids: list[str] = []
        if request.user and request.user.is_authenticated:
            today = timezone.now().date()
            actions = WeatherShieldUserAction.objects.filter(
                user=request.user,
                completed=True,
                completed_at__date=today,
            )
            for a in actions:
                if a.product_id:
                    done_ids.append(f"ws-{a.product_id}")
                elif a.action_key:
                    done_ids.append(a.action_key)

        alerts = []
        titles = {
            "high_uv_hot": "Yuqori UV / issiq",
            "high_humidity_rain": "Namlik / yomg‘ir",
            "cold": "Sovuq havo",
            "high_wind": "Kuchli shamol",
            "poor_aqi": "Havo sifati past",
        }
        for t in triggers:
            alerts.append(
                {
                    "id": f"alert-{t}",
                    "label": titles.get(t, t),
                    "severity": "high" if t in ("high_uv_hot", "cold", "poor_aqi") else "medium",
                    "trigger": t,
                }
            )

        return Response(
            {
                "triggers": triggers,
                "alerts": alerts,
                "recommendations": rows,
                "done_ids": done_ids,
            }
        )


class WeatherShieldActionView(UnthrottledAPIView):
    """POST — qadamni bajarildi deb belgilash."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        action_key = (request.data.get("action_key") or request.data.get("id") or "").strip()
        completed = request.data.get("completed", True)
        if isinstance(completed, str):
            completed = completed.lower() not in ("0", "false", "no")
        snapshot = request.data.get("weather_snapshot") or {}

        product = None
        if product_id:
            product = WeatherShieldProduct.objects.filter(pk=product_id).first()
        if not product and action_key.startswith("ws-"):
            try:
                product = WeatherShieldProduct.objects.filter(pk=int(action_key[3:])).first()
            except ValueError:
                product = None

        if product:
            row, _ = WeatherShieldUserAction.objects.update_or_create(
                user=request.user,
                product=product,
                defaults={
                    "action_key": "",
                    "completed": bool(completed),
                    "weather_snapshot": snapshot if isinstance(snapshot, dict) else {},
                },
            )
        elif action_key:
            row, _ = WeatherShieldUserAction.objects.update_or_create(
                user=request.user,
                action_key=action_key,
                defaults={
                    "product": None,
                    "completed": bool(completed),
                    "weather_snapshot": snapshot if isinstance(snapshot, dict) else {},
                },
            )
        else:
            return Response({"detail": "product_id yoki action_key kerak"}, status=400)

        if not completed:
            row.delete()
            return Response({"ok": True, "completed": False})

        return Response(
            {
                "ok": True,
                "completed": True,
                "id": f"ws-{row.product_id}" if row.product_id else row.action_key,
            }
        )


# ── Admin ─────────────────────────────────────────────────────────────


class AdminWeatherShieldStatsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        ensure_default_categories()
        today = timezone.now().date()
        return Response(
            {
                "categories_total": WeatherShieldCategory.objects.count(),
                "products_total": WeatherShieldProduct.objects.count(),
                "products_published": WeatherShieldProduct.objects.filter(is_published=True).count(),
                "actions_today": WeatherShieldUserAction.objects.filter(
                    completed=True, completed_at__date=today
                ).count(),
                "actions_total": WeatherShieldUserAction.objects.filter(completed=True).count(),
            }
        )


class AdminWeatherShieldCategoryListView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        ensure_default_categories()
        rows = (
            WeatherShieldCategory.objects.annotate(products_count=Count("products"))
            .order_by("sort_order", "title_uz")
        )
        return Response(
            [
                {
                    "id": c.id,
                    "key": c.key,
                    "title_uz": c.title_uz,
                    "description_uz": c.description_uz,
                    "icon": c.icon,
                    "sort_order": c.sort_order,
                    "is_active": c.is_active,
                    "products_count": c.products_count,
                }
                for c in rows
            ]
        )

    def post(self, request):
        key = (request.data.get("key") or "").strip()
        title = (request.data.get("title_uz") or "").strip()
        if not key or not title:
            return Response({"detail": "key va title_uz majburiy"}, status=400)
        c, created = WeatherShieldCategory.objects.get_or_create(
            key=key,
            defaults={
                "title_uz": title,
                "description_uz": request.data.get("description_uz") or "",
                "icon": request.data.get("icon") or "sunny-outline",
                "sort_order": int(request.data.get("sort_order") or 0),
                "is_active": True,
            },
        )
        if not created:
            return Response({"detail": "Bu key allaqachon bor"}, status=400)
        return Response({"id": c.id, "key": c.key, "title_uz": c.title_uz}, status=201)


class AdminWeatherShieldProductListCreateView(UnthrottledAPIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        ensure_default_categories()
        cat = (request.query_params.get("category") or "").strip()
        qs = WeatherShieldProduct.objects.select_related("category").all()
        if cat.isdigit():
            qs = qs.filter(category_id=int(cat))
        elif cat:
            qs = qs.filter(category__key=cat)
        return Response([product_payload(p, request) | {
            "is_published": p.is_published,
            "sort_order": p.sort_order,
            "name": p.name,
            "description_uz": p.description_uz,
            "kind": p.kind,
            "product_tag": p.product_tag,
            "category_id": p.category_id,
            "hair_conditions": p.hair_conditions or [],
        } for p in qs])

    def post(self, request):
        ensure_default_categories()
        cat_id = request.data.get("category_id")
        cat_key = (request.data.get("category_key") or "").strip()
        category = None
        if cat_id:
            category = WeatherShieldCategory.objects.filter(pk=cat_id).first()
        if not category and cat_key:
            category = WeatherShieldCategory.objects.filter(key=cat_key).first()
        name = (request.data.get("name") or "").strip()
        if not category or not name:
            return Response({"detail": "category va name majburiy"}, status=400)
        p = WeatherShieldProduct(
            category=category,
            name=name,
            description_uz=request.data.get("description_uz") or "",
            kind=request.data.get("kind") or "product",
            product_tag=request.data.get("product_tag") or "",
            icon=request.data.get("icon") or "flask-outline",
            external_image_url=request.data.get("external_image_url") or "",
            priority=int(request.data.get("priority") or 2),
            sort_order=int(request.data.get("sort_order") or 0),
            is_published=str(request.data.get("is_published", "true")).lower() not in ("0", "false"),
            created_by=request.user if request.user.is_authenticated else None,
        )
        hc = request.data.get("hair_conditions")
        if isinstance(hc, str) and hc.strip():
            p.hair_conditions = [x.strip() for x in hc.split(",") if x.strip()]
        elif isinstance(hc, list):
            p.hair_conditions = hc
        if request.FILES.get("image"):
            p.image = request.FILES["image"]
        p.save()
        return Response(product_payload(p, request), status=201)


class AdminWeatherShieldProductDetailView(UnthrottledAPIView):
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request, product_id: int):
        p = WeatherShieldProduct.objects.filter(pk=product_id).select_related("category").first()
        if not p:
            return Response({"detail": "Topilmadi"}, status=404)
        for field in ("name", "description_uz", "kind", "product_tag", "icon", "external_image_url"):
            if field in request.data:
                setattr(p, field, request.data.get(field) or "")
        if "priority" in request.data:
            p.priority = int(request.data.get("priority") or 2)
        if "sort_order" in request.data:
            p.sort_order = int(request.data.get("sort_order") or 0)
        if "is_published" in request.data:
            p.is_published = str(request.data.get("is_published")).lower() not in ("0", "false")
        if "category_id" in request.data:
            cat = WeatherShieldCategory.objects.filter(pk=request.data.get("category_id")).first()
            if cat:
                p.category = cat
        if "category_key" in request.data:
            cat = WeatherShieldCategory.objects.filter(key=request.data.get("category_key")).first()
            if cat:
                p.category = cat
        if "hair_conditions" in request.data:
            hc = request.data.get("hair_conditions")
            if isinstance(hc, str):
                p.hair_conditions = [x.strip() for x in hc.split(",") if x.strip()]
            elif isinstance(hc, list):
                p.hair_conditions = hc
        if request.FILES.get("image"):
            p.image = request.FILES["image"]
        p.save()
        return Response(product_payload(p, request))

    def delete(self, request, product_id: int):
        deleted, _ = WeatherShieldProduct.objects.filter(pk=product_id).delete()
        if not deleted:
            return Response({"detail": "Topilmadi"}, status=404)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminWeatherShieldActivityView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        limit = min(int(request.query_params.get("limit") or 50), 200)
        rows = (
            WeatherShieldUserAction.objects.select_related("user", "product", "product__category")
            .filter(completed=True)
            .order_by("-completed_at")[:limit]
        )
        return Response(
            [
                {
                    "id": a.id,
                    "user_id": a.user_id,
                    "user_email": getattr(a.user, "email", "") or "",
                    "product_id": a.product_id,
                    "product_name": a.product.name if a.product else a.action_key,
                    "category_key": a.product.category.key if a.product else "",
                    "category_title": a.product.category.title_uz if a.product else "",
                    "weather_snapshot": a.weather_snapshot or {},
                    "completed_at": a.completed_at,
                }
                for a in rows
            ]
        )
