import math
from datetime import datetime

from django.db import transaction
from django.db.models import Avg, Count, Q
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_utils import customer_catalog_region
from accounts.throttles import SalonSearchThrottle
from accounts.uz_regions import UzRegion
from bookings.availability import (
    build_available_slots,
    get_independent_services_for_barber,
    parse_id_list,
)
from bookings.models import Booking, BookingLine, Review
from notifications.utils import notify_user
from salons.catalog_bootstrap import ensure_default_catalog_seeded
from salons.models import CatalogService, Salon, SalonMembership

from .models import (
    Barber,
    BarberExpense,
    BarberGoal,
    BarberInventoryItem,
    BarberInventoryMovement,
    BarberProfile,
    BarberPromo,
    BarberService,
    BarberSetting,
    BarberSupportTicket,
    BarberWorkPhoto,
    BarberWorkingHours,
)
from .permissions import IsBarber
from .readiness import batch_publicly_visible_barber_ids
from .serializers import (
    BarberExpenseSerializer,
    BarberGoalSerializer,
    BarberInventoryItemSerializer,
    BarberInventoryMovementSerializer,
    BarberProfileUpsertSerializer,
    BarberPromoSerializer,
    BarberPublicDetailSerializer,
    BarberPublicListSerializer,
    BarberSettingSerializer,
    BarberServiceSerializer,
    BarberSupportTicketSerializer,
    BarberWorkPhotoCreateSerializer,
    BarberWorkingHoursSerializer,
)


def _haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p = math.pi / 180
    a = (
        0.5
        - math.cos((lat2 - lat1) * p) / 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def _public_salon_for_barber(barber):
    owned = (
        Salon.objects.filter(owner_barber=barber, is_published=True)
        .only("id", "name", "latitude", "longitude")
        .first()
    )
    if owned is not None:
        return owned
    membership = (
        SalonMembership.objects.select_related("salon")
        .filter(
            barber=barber,
            invite_state=SalonMembership.InviteState.ACTIVE,
            salon__is_published=True,
        )
        .order_by("-activated_at", "-id")
        .first()
    )
    return membership.salon if membership is not None else None


class BarberPublicViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    queryset = BarberProfile.objects.select_related("barber").prefetch_related(
        "services",
        "services__catalog_service",
        "work_photos",
    )

    def get_queryset(self):
        qs = (
            BarberProfile.objects.select_related("barber")
            .prefetch_related("services", "services__catalog_service", "work_photos", "working_hours")
            .annotate(
                avg_rating=Coalesce(Avg("barber__reviews_about__rating"), 0.0),
                review_count=Count("barber__reviews_about", distinct=True),
            )
        )
        r = self.request.query_params
        min_price = r.get("min_price")
        max_price = r.get("max_price")
        min_rating = r.get("min_rating")
        forced_region = customer_catalog_region(self.request)
        region = (r.get("region") or "").strip()
        service_q = (r.get("service_q") or r.get("q") or "").strip()
        available_date = (r.get("available_date") or "").strip()
        work_mode = (r.get("work_mode") or "").strip().lower()

        if work_mode == "independent":
            qs = qs.filter(barber__work_mode=Barber.WorkMode.INDEPENDENT)

        try:
            min_p = float(min_price) if min_price not in (None, "") else None
        except (ValueError, TypeError):
            min_p = None
        try:
            max_p = float(max_price) if max_price not in (None, "") else None
        except (ValueError, TypeError):
            max_p = None
        if min_p is not None or max_p is not None:
            pq = Q(services__is_active=True) & (
                Q(services__catalog_service__isnull=True)
                | Q(services__catalog_service__is_active=True)
            )
            if min_p is not None:
                pq &= Q(services__price__gte=min_p)
            if max_p is not None:
                pq &= Q(services__price__lte=max_p)
            qs = qs.filter(pq).distinct()
        if min_rating not in (None, ""):
            try:
                qs = qs.filter(avg_rating__gte=float(min_rating))
            except ValueError:
                pass
        valid_regions = {c[0] for c in UzRegion.choices}
        if forced_region:
            qs = qs.filter(barber__region=forced_region)
        elif region and region in valid_regions:
            qs = qs.filter(barber__region=region)
        if service_q:
            qs = qs.filter(
                services__is_active=True,
            ).filter(
                Q(services__catalog_service__isnull=True)
                | Q(services__catalog_service__is_active=True)
            ).filter(
                Q(services__name__icontains=service_q)
                | Q(services__catalog_service__name__icontains=service_q)
            ).distinct()
        if available_date:
            try:
                wd = datetime.fromisoformat(available_date).date().weekday()
                qs = qs.filter(working_hours__weekday=wd, working_hours__is_day_off=False).distinct()
            except ValueError:
                pass

        barber_ids = list(qs.values_list("barber_id", flat=True).distinct())
        visible = batch_publicly_visible_barber_ids(barber_ids)
        return qs.filter(barber_id__in=visible)

    def get_serializer_class(self):
        if self.action == "list":
            return BarberPublicListSerializer
        return BarberPublicDetailSerializer

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[AllowAny],
        url_path="by-barber-id",
    )
    def by_barber_id(self, request):
        """Bitta sartarosh (Barber PK) bo‘yicha ochiq profil — ro‘yxatni to‘liq yuklamasdan."""
        raw = request.query_params.get("id")
        try:
            bid = int(raw) if raw is not None else 0
        except (TypeError, ValueError):
            bid = 0
        if bid < 1:
            return Response(
                {"detail": "Query parametri id (sartarosh ID) majburiy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = self.get_queryset().filter(barber_id=bid)
        prof = qs.first()
        if not prof:
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        ser = BarberPublicDetailSerializer(prof, context={"request": request})
        return Response(ser.data)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[AllowAny],
        throttle_classes=[SalonSearchThrottle],
    )
    def nearby(self, request):
        """Ochiq barberlar — mustaqil bo'lsa o'z lokatsiyasi, salonniki bo'lsa salon lokatsiyasi."""
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
            radius = float(request.query_params.get("radius_km", 3))
        except (KeyError, ValueError, TypeError):
            return Response(
                {"detail": "lat, lng required; radius_km optional."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = self.get_queryset().select_related("barber")
        forced_region = customer_catalog_region(request)
        if forced_region:
            qs = qs.filter(barber__region=forced_region)
        else:
            region = (request.query_params.get("region") or "").strip()
            valid_regions = {c[0] for c in UzRegion.choices}
            if region and region in valid_regions:
                qs = qs.filter(barber__region=region)
        out = []
        for p in qs:
            barber = p.barber
            row_lat = p.latitude
            row_lng = p.longitude
            booking_kind = "independent"
            salon = None
            if barber.work_mode != Barber.WorkMode.INDEPENDENT:
                salon = _public_salon_for_barber(barber)
                if salon is None:
                    continue
                row_lat = salon.latitude
                row_lng = salon.longitude
                booking_kind = "salon"
            if row_lat is None or row_lng is None:
                continue
            d = _haversine_km(lat, lng, float(row_lat), float(row_lng))
            if d <= radius:
                ser = BarberPublicListSerializer(p, context={"request": request})
                row = dict(ser.data)
                row["latitude"] = str(row_lat)
                row["longitude"] = str(row_lng)
                row["work_mode"] = barber.work_mode
                row["booking_kind"] = booking_kind
                row["salon_id"] = salon.id if salon is not None else None
                row["salon_name"] = salon.name if salon is not None else None
                row["distance_km"] = round(d, 3)
                out.append(row)
        out.sort(key=lambda x: x["distance_km"])
        return Response(out)


class MyBarberProfileView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        b = request.user.barber
        prof = BarberProfile.objects.filter(barber=b).first()
        if not prof:
            return Response({"exists": False})
        return Response(
            {
                "exists": True,
                "id": prof.id,
                "location_text": prof.location_text,
                "latitude": prof.latitude,
                "longitude": prof.longitude,
                "spoken_languages": list(prof.spoken_languages or []),
            }
        )

    def patch(self, request):
        b = request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        ser = BarberProfileUpsertSerializer(instance=prof, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response({"status": "ok", **ser.data})


class MyBarberCatalogServiceView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        ensure_default_catalog_seeded()
        q = str(request.query_params.get("q", "") or "").strip()
        category = str(request.query_params.get("category", "") or "").strip()
        qs = CatalogService.objects.filter(is_active=True).prefetch_related("categories")
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(description__icontains=q)
                | Q(categories__name__icontains=q)
            ).distinct()
        if category.isdigit():
            qs = qs.filter(categories__id=int(category))
        rows = []
        for idx, item in enumerate(qs.order_by("sort_order", "name", "id")[:200]):
            rows.append(
                {
                    "id": item.id,
                    "name": item.name,
                    "description": item.description,
                    "image_url": item.image_url,
                    "duration_minutes": item.duration_minutes,
                    "category_ids": list(item.categories.values_list("id", flat=True)),
                    "category_names": [c.name for c in item.categories.order_by("order", "name")],
                    "sort_order": item.sort_order,
                    "index": idx,
                }
            )
        return Response(rows)


class MyBarberServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberServiceSerializer

    def get_queryset(self):
        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        return BarberService.objects.filter(profile=prof).order_by("name")

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError

        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        catalog = serializer.validated_data.get("catalog_service")
        if catalog is not None:
            obj = serializer.save(
                profile=prof,
                catalog_service=catalog,
                name=catalog.name,
                duration_minutes=catalog.duration_minutes,
            )
            obj.categories.set(catalog.categories.all())
            return

        name = str(self.request.data.get("name", "") or "").strip()
        try:
            duration = int(self.request.data.get("duration_minutes") or 0)
        except (TypeError, ValueError):
            duration = 0
        if not name:
            raise ValidationError({"catalog_service": "Katalogdan xizmat tanlang."})
        if duration < 5 or duration > 480:
            raise ValidationError({"duration_minutes": "Davomiylik 5 va 480 daqiqa oralig'ida bo'lishi kerak."})
        serializer.save(profile=prof, name=name, duration_minutes=duration)

    def perform_update(self, serializer):
        obj = self.get_object()
        catalog = obj.catalog_service
        if catalog is not None:
            updated = serializer.save(
                profile=obj.profile,
                catalog_service=catalog,
                name=catalog.name,
                duration_minutes=catalog.duration_minutes,
            )
            updated.categories.set(catalog.categories.all())
            return
        serializer.save(profile=obj.profile)


class MyBarberWorkPhotoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberWorkPhotoCreateSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        return BarberWorkPhoto.objects.filter(profile=prof).order_by("sort_order", "id")

    def perform_create(self, serializer):
        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        serializer.save(profile=prof)


class MyBarberInventoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberInventoryItemSerializer

    def get_queryset(self):
        return BarberInventoryItem.objects.filter(barber=self.request.user.barber).order_by("name", "id")

    def perform_create(self, serializer):
        serializer.save(barber=self.request.user.barber)

    @action(detail=True, methods=["post"])
    def adjust(self, request, pk=None):
        item = self.get_object()
        try:
            delta = int(request.data.get("delta", 0))
        except (TypeError, ValueError):
            return Response({"detail": "delta butun son bo'lishi kerak."}, status=400)
        note = str(request.data.get("note", "") or "").strip()
        if delta == 0:
            return Response({"detail": "delta nol bo'lmasligi kerak."}, status=400)
        with transaction.atomic():
            item.stock = max(0, item.stock + delta)
            item.save(update_fields=["stock", "updated_at"])
            BarberInventoryMovement.objects.create(item=item, delta=delta, note=note)
        return Response(BarberInventoryItemSerializer(item).data)


class MyBarberInventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberInventoryMovementSerializer

    def get_queryset(self):
        return BarberInventoryMovement.objects.filter(item__barber=self.request.user.barber).select_related("item")


class MyBarberExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberExpenseSerializer

    def get_queryset(self):
        return BarberExpense.objects.filter(barber=self.request.user.barber).order_by("-spent_on", "-id")

    def perform_create(self, serializer):
        serializer.save(barber=self.request.user.barber)


class MyBarberGoalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberGoalSerializer

    def get_queryset(self):
        return BarberGoal.objects.filter(barber=self.request.user.barber).order_by("done", "deadline", "-id")

    def perform_create(self, serializer):
        serializer.save(barber=self.request.user.barber)


class MyBarberPromoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberPromoSerializer

    def get_queryset(self):
        return BarberPromo.objects.filter(barber=self.request.user.barber).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(barber=self.request.user.barber)

    @action(detail=False, methods=["post"])
    def broadcast(self, request):
        message = str(request.data.get("message", "") or "").strip()
        if not message:
            return Response({"detail": "message required."}, status=400)
        title = str(request.data.get("title", "Barber xabari") or "Barber xabari").strip()
        barber = request.user.barber
        booking_users = (
            Booking.objects.filter(barber=barber)
            .select_related("customer")
            .values_list("customer_id", flat=True)
            .distinct()
        )
        count = 0
        from accounts.models import User

        for uid in booking_users:
            user = User.objects.filter(pk=uid).first()
            if user is None:
                continue
            notify_user(
                user,
                "barber_announcement",
                title,
                message,
                {"barber_id": barber.id},
            )
            count += 1
        return Response({"status": "ok", "sent_count": count})


class MyBarberSettingsView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        obj, _ = BarberSetting.objects.get_or_create(barber=request.user.barber)
        return Response(BarberSettingSerializer(obj).data)

    def patch(self, request):
        obj, _ = BarberSetting.objects.get_or_create(barber=request.user.barber)
        ser = BarberSettingSerializer(instance=obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class MyBarberSupportTicketViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberSupportTicketSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return BarberSupportTicket.objects.filter(barber=self.request.user.barber).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(barber=self.request.user.barber)


class MyBarberFinanceSummaryView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        barber = request.user.barber
        expenses_total = sum(BarberExpense.objects.filter(barber=barber).values_list("amount", flat=True))
        completed = Booking.objects.filter(barber=barber, status=Booking.Status.COMPLETED)
        income_total = sum(completed.values_list("total_price", flat=True))
        transactions = []
        for b in completed.order_by("-start_at")[:100]:
            transactions.append(
                {
                    "id": f"booking-{b.id}",
                    "date": b.start_at.isoformat(),
                    "client": b.customer.full_name or b.customer.email,
                    "service": (b.lines.first().service_name if b.lines.exists() else "Xizmat"),
                    "amount": str(b.total_price),
                    "kind": "booking",
                    "status": "completed",
                }
            )
        for e in BarberExpense.objects.filter(barber=barber).order_by("-spent_on")[:100]:
            transactions.append(
                {
                    "id": f"expense-{e.id}",
                    "date": f"{e.spent_on}T00:00:00",
                    "client": "—",
                    "service": e.description,
                    "amount": str(-e.amount),
                    "kind": "expense",
                    "status": "completed",
                }
            )
        transactions.sort(key=lambda r: r["date"], reverse=True)
        return Response(
            {
                "income_total": str(income_total),
                "expense_total": str(expenses_total),
                "net_total": str(income_total - expenses_total),
                "transactions": transactions[:100],
            }
        )


class MyBarberReviewsView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        barber = request.user.barber
        rows = (
            Review.objects.filter(barber=barber)
            .select_related("author")
            .order_by("-created_at")
        )
        out = []
        for r in rows:
            out.append(
                {
                    "id": r.id,
                    "client": r.author.full_name or r.author.email,
                    "avatar": (request.build_absolute_uri(r.author.avatar.url) if getattr(r.author, "avatar", None) else ""),
                    "rating": r.rating,
                    "text": r.text,
                    "date": r.created_at.isoformat(),
                    "service": (r.booking.lines.first().service_name if r.booking.lines.exists() else "Xizmat"),
                    "barber_reply": r.barber_reply,
                    "barber_replied_at": r.barber_replied_at.isoformat() if r.barber_replied_at else None,
                }
            )
        return Response(out)


class MyBarberWorkingHoursViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberWorkingHoursSerializer

    def get_queryset(self):
        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        return BarberWorkingHours.objects.filter(profile=prof).order_by("weekday")

    def perform_create(self, serializer):
        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        serializer.save(profile=prof)


class MyBarberServiceRecommendationsView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        barber = request.user.barber
        profile, _ = BarberProfile.objects.get_or_create(barber=barber)
        services = list(profile.services.all())
        service_names = {s.name.lower() for s in services}
        avg_price = sum(float(s.price) for s in services) / len(services) if services else 0
        recommendations = []

        catalog = [
            {
                "key": "beard",
                "name": "Soqol parvarishi",
                "trigger": ("hair", "soch", "cut", "qirq"),
                "price": 45000,
                "duration": 30,
                "reason": "Soch xizmati bor, soqol parvarishi bilan paket sotish osonroq.",
            },
            {
                "key": "wash",
                "name": "Soch yuvish va styling",
                "trigger": ("hair", "soch", "cut", "qirq"),
                "price": 35000,
                "duration": 20,
                "reason": "Asosiy xizmatdan keyin tez qo'shiladigan upsell xizmati.",
            },
            {
                "key": "kids",
                "name": "Bolalar soch turmagi",
                "trigger": ("hair", "soch", "cut", "qirq"),
                "price": 40000,
                "duration": 35,
                "reason": "Oilaviy mijozlar uchun alohida xizmat nomi bookingni aniqroq qiladi.",
            },
        ]

        joined_names = " ".join(service_names)
        for item in catalog:
            already_exists = any(item["key"] in name or item["name"].lower() in name for name in service_names)
            triggered = not services or any(token in joined_names for token in item["trigger"])
            if not already_exists and triggered:
                recommendations.append(
                    {
                        "kind": "add_service",
                        "title": item["name"],
                        "description": item["reason"],
                        "action_label": "Qo'shish",
                        "suggested_service": {
                            "name": item["name"],
                            "price": str(item["price"]),
                            "duration_minutes": item["duration"],
                        },
                    }
                )

        if avg_price:
            for service in services:
                price = float(service.price)
                if price < avg_price * 0.55:
                    recommendations.append(
                        {
                            "kind": "adjust_price",
                            "title": f"{service.name} narxini tekshiring",
                            "description": "Bu xizmat narxi sizning o'rtacha narxingizdan ancha past.",
                            "action_label": "Narxni moslash",
                            "service_id": service.id,
                            "suggested_price": str(round(avg_price * 0.85)),
                        }
                    )
                elif price > avg_price * 1.8 and len(services) > 1:
                    recommendations.append(
                        {
                            "kind": "adjust_price",
                            "title": f"{service.name} narxi yuqori ko'rinyapti",
                            "description": "Agar bu premium xizmat bo'lmasa, narxni mijozlar uchun tushunarli qiling.",
                            "action_label": "Ko'rib chiqish",
                            "service_id": service.id,
                            "suggested_price": str(round(avg_price * 1.25)),
                        }
                    )
                if service.duration_minutes < 10 or service.duration_minutes > 180:
                    recommendations.append(
                        {
                            "kind": "adjust_duration",
                            "title": f"{service.name} davomiyligini tekshiring",
                            "description": "Slot algoritmi aniq ishlashi uchun duration real vaqtga yaqin bo'lishi kerak.",
                            "action_label": "Durationni yangilash",
                            "service_id": service.id,
                            "suggested_duration_minutes": min(max(service.duration_minutes, 20), 120),
                        }
                    )

        popular_lines = (
            BookingLine.objects.filter(booking__barber=barber)
            .values("service_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:4]
        )
        for row in popular_lines:
            name = (row["service_name"] or "").strip()
            if not name:
                continue
            recommendations.append(
                {
                    "kind": "popular_service",
                    "title": f"{name} ko'p bron qilingan",
                    "description": f"Oxirgi bookinglarda {row['count']} marta uchradi. Uni alohida ko'rinarli qiling yoki paketga qo'shing.",
                    "action_label": "Paket o'ylash",
                }
            )

        return Response(recommendations[:8])


class BarberSearchView(APIView):
    """Salon egasi boshqa sartaroshni qidirish (taklif uchun)."""

    permission_classes = [IsBarber]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response([])
        qs = (
            Barber.objects.filter(Q(email__icontains=q) | Q(full_name__icontains=q))
            .order_by("email")[:20]
        )
        return Response(
            [
                {
                    "id": b.id,
                    "email": b.email,
                    "full_name": b.full_name,
                    "phone": b.phone,
                }
                for b in qs
            ]
        )


class IndependentAvailabilityView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        barber_id = request.query_params.get("barber")
        date_s = request.query_params.get("date")
        service_ids = request.query_params.get("barber_service_ids", "")
        if not all([barber_id, date_s]):
            return Response(
                {"detail": "barber and date (YYYY-MM-DD) are required."},
                status=400,
            )
        try:
            target_date = datetime.fromisoformat(date_s).date()
        except ValueError:
            return Response({"detail": "Invalid date."}, status=400)

        barber = get_object_or_404(Barber, pk=barber_id)
        from barbers.readiness import barber_is_publicly_visible

        if not barber_is_publicly_visible(barber):
            return Response({"detail": "Topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        forced_region = customer_catalog_region(request)
        if forced_region and (barber.region or "").strip() != forced_region:
            return Response(
                {"detail": "Bu sartarosh boshqa hudud uchun."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prof = get_object_or_404(BarberProfile, barber=barber)

        id_list = parse_id_list(service_ids)
        if not id_list:
            return Response({"detail": "barber_service_ids required (comma-separated)."}, status=400)
        if len(id_list) != len(set(id_list)):
            return Response({"detail": "Duplicate barber_service_ids not allowed."}, status=400)

        services = get_independent_services_for_barber(barber, id_list)
        if len(services) != len(set(id_list)):
            return Response({"detail": "Invalid or inactive barber services."}, status=400)

        return Response(
            build_available_slots(
                barber=barber,
                services=services,
                target_date=target_date,
            )
        )
