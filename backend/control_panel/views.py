from django.db.models import Avg, Q
from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.uz_regions import UzRegion
from barbers.models import Barber
from accounts.permissions import IsAdmin
from bookings.models import Booking, Review
from bookings.serializers import BookingSerializer
from salons.models import Salon

from .serializers import (
    AdminBarberSerializer,
    AdminBarberUpdateSerializer,
    AdminReviewListSerializer,
    AdminSalonSerializer,
    AdminSalonUpdateSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    salon_schedule_summary,
)


def _admin_region_breakdown():
    """Har bir viloyat uchun sartarosh/salon soni va qisqa akkaunt ro‘yxati."""

    def barber_rows(qs):
        return [
            {
                "id": b.id,
                "email": b.email,
                "full_name": b.full_name or "",
                "is_active": b.is_active,
            }
            for b in qs.only("id", "email", "full_name", "is_active").order_by("email")
        ]

    def salon_rows(qs):
        out = []
        for s in qs.select_related("owner_barber").prefetch_related("hours").order_by("name"):
            ob = s.owner_barber
            out.append(
                {
                    "id": s.id,
                    "name": s.name,
                    "slug": s.slug,
                    "owner_email": ob.email if ob else "",
                    "is_published": s.is_published,
                    "schedule_summary": salon_schedule_summary(s),
                }
            )
        return out

    regions_payload = []
    for code, label in UzRegion.choices:
        bqs = Barber.objects.filter(region=code)
        sqs = Salon.objects.filter(owner_barber__region=code)
        regions_payload.append(
            {
                "region": code,
                "label": label,
                "barbers_count": bqs.count(),
                "salons_count": sqs.count(),
                "barbers": barber_rows(bqs),
                "salons": salon_rows(sqs),
            }
        )

    b_unset = Barber.objects.filter(region="")
    s_unset = Salon.objects.filter(
        Q(owner_barber__isnull=True) | Q(owner_barber__region="")
    )
    regions_payload.append(
        {
            "region": "__UNSET__",
            "label": "Viloyat ko‘rsatilmagan",
            "barbers_count": b_unset.count(),
            "salons_count": s_unset.count(),
            "barbers": barber_rows(b_unset),
            "salons": salon_rows(s_unset),
        }
    )
    return regions_payload


class AdminStatsView(APIView):
    """Aggregated numbers for Next.js admin dashboard."""

    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.localdate()

        users_mijoz = User.objects.filter(role=User.Role.USER).count()
        barbers = Barber.objects.count()
        salons_pub = Salon.objects.filter(is_published=True).count()
        salons_pending = Salon.objects.filter(is_published=False).count()
        bookings_today = Booking.objects.filter(start_at__date=today).count()
        bookings_total = Booking.objects.count()
        reviews_total = Review.objects.count()
        reviews_avg = Review.objects.aggregate(a=Avg("rating"))["a"]

        return Response(
            {
                "users_total": User.objects.count(),
                "users_clients": users_mijoz,
                "barbers_total": barbers,
                "salons_published": salons_pub,
                "salons_pending_review": salons_pending,
                "bookings_today": bookings_today,
                "bookings_total": bookings_total,
                "reviews_total": reviews_total,
                "reviews_avg": str(reviews_avg) if reviews_avg is not None else "0",
                "regions": _admin_region_breakdown(),
            }
        )


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by("-date_joined")
        roles_param = self.request.query_params.get("roles")
        if roles_param:
            parts = [r.strip() for r in roles_param.split(",") if r.strip()]
            if parts:
                qs = qs.filter(role__in=parts)
        else:
            role = self.request.query_params.get("role")
            if role:
                qs = qs.filter(role=role)
        region = self.request.query_params.get("region")
        if region:
            qs = qs.filter(region=region)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(full_name__icontains=q)
                | Q(phone__icontains=q)
            )
        return qs


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminUserUpdateSerializer
        return AdminUserSerializer


class AdminSalonListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminSalonSerializer

    def get_queryset(self):
        qs = (
            Salon.objects.select_related("owner_barber")
            .prefetch_related("hours")
            .order_by("-created_at")
        )
        pub = self.request.query_params.get("published")
        if pub == "0":
            qs = qs.filter(is_published=False)
        elif pub == "1":
            qs = qs.filter(is_published=True)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q) | Q(owner_barber__email__icontains=q)
            )
        region = self.request.query_params.get("region", "").strip()
        if region == "__UNSET__":
            qs = qs.filter(Q(owner_barber__isnull=True) | Q(owner_barber__region=""))
        elif region:
            qs = qs.filter(owner_barber__region=region)
        return qs


class AdminSalonDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Salon.objects.select_related("owner_barber").prefetch_related("hours").all()
    serializer_class = AdminSalonSerializer

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminSalonUpdateSerializer
        return AdminSalonSerializer


class AdminBarberListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminBarberSerializer

    def get_queryset(self):
        qs = Barber.objects.select_related("profile", "signup_snapshot").order_by(
            "-date_joined"
        )
        region = self.request.query_params.get("region")
        if region == "__UNSET__":
            qs = qs.filter(region="")
        elif region:
            qs = qs.filter(region=region)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(full_name__icontains=q)
                | Q(phone__icontains=q)
            )
        return qs


class AdminBarberDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Barber.objects.all()
    serializer_class = AdminBarberSerializer

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminBarberUpdateSerializer
        return AdminBarberSerializer


class AdminBookingListView(generics.ListAPIView):
    """Recent bookings for admin overview (read-only list)."""

    permission_classes = [IsAdmin]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return (
            Booking.objects.select_related("customer", "salon", "barber")
            .prefetch_related("lines")
            .order_by("-created_at")
        )


class AdminReviewListView(generics.ListAPIView):
    """Barcha sharhlar (mijoz → sartarosh / salon bronlari)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminReviewListSerializer

    def get_queryset(self):
        qs = Review.objects.select_related("author", "barber")
        barber = self.request.query_params.get("barber")
        if barber and str(barber).isdigit():
            qs = qs.filter(barber_id=int(barber))
        min_r = self.request.query_params.get("min_rating")
        if min_r and str(min_r).isdigit():
            qs = qs.filter(rating__gte=int(min_r))
        df = self.request.query_params.get("date_from")
        dt = self.request.query_params.get("date_to")
        if df:
            try:
                from datetime import datetime

                d0 = datetime.fromisoformat(df).date()
                qs = qs.filter(created_at__date__gte=d0)
            except ValueError:
                pass
        if dt:
            try:
                from datetime import datetime

                d1 = datetime.fromisoformat(dt).date()
                qs = qs.filter(created_at__date__lte=d1)
            except ValueError:
                pass
        return qs.order_by("-created_at")
