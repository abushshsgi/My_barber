import math
from datetime import datetime, timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import SalonSearchThrottle
from bookings.models import Booking, BookingLine
from notifications.utils import notify_user

from .models import Barber, BarberProfile, BarberService, BarberWorkPhoto, BarberWorkingHours
from .permissions import IsBarber
from .serializers import (
    BarberProfileUpsertSerializer,
    BarberPublicDetailSerializer,
    BarberPublicListSerializer,
    BarberServiceSerializer,
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


class BarberPublicViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    queryset = BarberProfile.objects.select_related("barber").prefetch_related("services", "work_photos")

    def get_serializer_class(self):
        if self.action == "list":
            return BarberPublicListSerializer
        return BarberPublicDetailSerializer

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
            if not overlap:
                slots.append(t.strftime("%H:%M"))
            t += timedelta(minutes=slot_step)

        return Response({"slots": slots, "total_minutes": total_minutes})
