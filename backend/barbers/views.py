import math
from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Avg, Count, Q
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_utils import customer_catalog_region
from accounts.throttles import SalonSearchThrottle
from accounts.uz_regions import UzRegion
from bookings.models import Booking, BookingLine, Review
from notifications.utils import notify_user

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


def _slot_overlaps_breaks(t_aware, end_aware, breaks_list, tz):
    """breaks_list: [{"start": "12:00", "end": "13:00"}, ...]"""
    for br in breaks_list or []:
        if not isinstance(br, dict):
            continue
        try:
            st = datetime.strptime(str(br.get("start", "")), "%H:%M").time()
            et = datetime.strptime(str(br.get("end", "")), "%H:%M").time()
        except (ValueError, TypeError):
            continue
        if st >= et:
            continue
        bs = timezone.make_aware(datetime.combine(t_aware.date(), st), tz)
        be = timezone.make_aware(datetime.combine(t_aware.date(), et), tz)
        if bs < end_aware and be > t_aware:
            return True
    return False


class BarberPublicViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    queryset = BarberProfile.objects.select_related("barber").prefetch_related("services", "work_photos")

    def get_queryset(self):
        qs = (
            BarberProfile.objects.select_related("barber")
            .prefetch_related("services", "work_photos", "working_hours")
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
            pq = Q(services__is_active=True)
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
            qs = qs.filter(services__is_active=True, services__name__icontains=service_q).distinct()
        if available_date:
            try:
                wd = datetime.fromisoformat(available_date).date().weekday()
                qs = qs.filter(working_hours__weekday=wd, working_hours__is_day_off=False).distinct()
            except ValueError:
                pass

        return qs

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
        """Mustaqil barberlar — joylashuvi bor profillar, radius ichida."""
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
            radius = float(request.query_params.get("radius_km", 3))
        except (KeyError, ValueError, TypeError):
            return Response(
                {"detail": "lat, lng required; radius_km optional."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = BarberProfile.objects.select_related("barber").filter(
            latitude__isnull=False,
            longitude__isnull=False,
        )
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
            d = _haversine_km(lat, lng, float(p.latitude), float(p.longitude))
            if d <= radius:
                ser = BarberPublicListSerializer(p, context={"request": request})
                row = dict(ser.data)
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


class MyBarberServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsBarber]
    serializer_class = BarberServiceSerializer

    def get_queryset(self):
        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        return BarberService.objects.filter(profile=prof).order_by("name")

    def perform_create(self, serializer):
        b = self.request.user.barber
        prof, _ = BarberProfile.objects.get_or_create(barber=b)
        serializer.save(profile=prof)


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
        forced_region = customer_catalog_region(request)
        if forced_region and (barber.region or "").strip() != forced_region:
            return Response(
                {"detail": "Bu sartarosh boshqa hudud uchun."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prof = get_object_or_404(BarberProfile, barber=barber)

        id_list = [int(x) for x in service_ids.split(",") if x.strip().isdigit()]
        if not id_list:
            return Response({"detail": "barber_service_ids required (comma-separated)."}, status=400)
        if len(id_list) != len(set(id_list)):
            return Response({"detail": "Duplicate barber_service_ids not allowed."}, status=400)

        services = list(BarberService.objects.filter(profile=prof, id__in=id_list, is_active=True))
        if len(services) != len(set(id_list)):
            return Response({"detail": "Invalid or inactive barber services."}, status=400)

        total_minutes = sum(s.duration_minutes for s in services)
        weekday = target_date.weekday()

        wh = BarberWorkingHours.objects.filter(profile=prof, weekday=weekday).first()
        if wh and wh.is_day_off:
            return Response({"slots": [], "total_minutes": total_minutes})

        # Default hours if not configured
        open_t = wh.open_time if wh else datetime.strptime("09:00", "%H:%M").time()
        close_t = wh.close_time if wh else datetime.strptime("18:00", "%H:%M").time()
        breaks_list = list(wh.breaks) if wh else []
        if open_t >= close_t:
            return Response({"slots": [], "total_minutes": total_minutes})

        tz = timezone.get_current_timezone()
        slot_step = 15
        day_start = timezone.make_aware(datetime.combine(target_date, open_t), tz)
        day_end = timezone.make_aware(datetime.combine(target_date, close_t), tz)

        slots = []
        t = day_start
        now = timezone.now()
        while t + timedelta(minutes=total_minutes) <= day_end:
            if t < now:
                t += timedelta(minutes=slot_step)
                continue
            end_slot = t + timedelta(minutes=total_minutes)
            overlap = Booking.objects.filter(
                barber=barber,
                status__in=[Booking.Status.PENDING, Booking.Status.ACCEPTED, Booking.Status.IN_PROGRESS],
                start_at__lt=end_slot,
                end_at__gt=t,
            ).exists()
            if not overlap and not _slot_overlaps_breaks(t, end_slot, breaks_list, tz):
                slots.append(t.strftime("%H:%M"))
            t += timedelta(minutes=slot_step)

        return Response({"slots": slots, "total_minutes": total_minutes})
