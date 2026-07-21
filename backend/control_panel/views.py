from django.db.models import Avg, Count, Prefetch, Q, Sum
from django.db.utils import OperationalError, ProgrammingError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework import status as http_status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated

from accounts.models import AdminAccount, LaunchInterest, User
from accounts.uz_regions import UzRegion
from accounts.permissions import IsAdmin
from barbers.models import Barber, BarberPromotion, BarberService, BarberSupportTicket
from bookings.models import Booking, BookingLine, Review
from bookings.serializers import BookingSerializer
from salons.catalog_bootstrap import ensure_default_catalog_seeded
from salons.catalog_visuals import build_catalog_service_image
from salons.models import CatalogService, Category, Salon, SalonMembership, Service

from .serializers import (
    AdminAccountSerializer,
    AdminAccountWriteSerializer,
    AdminBarberDetailSerializer,
    AdminBarberSerializer,
    AdminBarberUpdateSerializer,
    AdminBroadcastCampaignSerializer,
    AdminCatalogServiceSerializer,
    AdminCatalogServiceWriteSerializer,
    AdminCategorySerializer,
    AdminCategoryWriteSerializer,
    AdminFinanceTransactionSerializer,
    AdminPayoutSerializer,
    AdminBarberPromotionSerializer,
    AdminReviewListSerializer,
    AdminSalonDetailSerializer,
    AdminSalonListSerializer,
    AdminSalonUpdateSerializer,
    AdminSupportReplySerializer,
    AdminSupportTicketDetailSerializer,
    AdminSupportTicketSerializer,
    AdminUserSerializer,
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
    AdminAuditLogSerializer,
    salon_schedule_summary,
)

from .user_signups import build_user_signup_analytics
from .salon_growth import build_salon_platform_analytics
from .barber_growth import build_barber_platform_analytics
from .models import (
    AuditLog,
    BroadcastCampaign,
    FinanceTransaction,
    Payout,
    SupportReply,
    SupportTicket,
)


def _map_barber_ticket_status(status_value: str) -> str:
    if status_value == BarberSupportTicket.Status.CLOSED:
        return SupportTicket.Status.CLOSED
    if status_value == BarberSupportTicket.Status.IN_PROGRESS:
        return SupportTicket.Status.PENDING
    return SupportTicket.Status.OPEN


def _sync_barber_support_tickets():
    """
    Make barber tickets visible in admin's canonical SupportTicket stream.
    """
    for bt in BarberSupportTicket.objects.select_related("barber").all():
        category = f"barber_support:{bt.id}"
        SupportTicket.objects.update_or_create(
            category=category,
            defaults={
                "subject": bt.subject,
                "body": bt.message,
                "status": _map_barber_ticket_status(bt.status),
                "priority": SupportTicket.Priority.NORMAL,
                "created_by_barber": bt.barber,
            },
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
        interest_count = LaunchInterest.objects.filter(region=code).count()
        bookings_count = Booking.objects.filter(barber__region=code).count()
        regions_payload.append(
            {
                "region": code,
                "label": label,
                "barbers_count": bqs.count(),
                "salons_count": sqs.count(),
                "bookings_count": bookings_count,
                "launch_interest_count": interest_count,
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
            "bookings_count": Booking.objects.filter(
                Q(barber__region="") | Q(barber__isnull=True)
            ).count(),
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
        completed = Booking.objects.filter(status=Booking.Status.COMPLETED)
        revenue_total = completed.aggregate(s=Sum("total_price"))["s"] or 0
        week_start = today - timezone.timedelta(days=6)
        bookings_week = Booking.objects.filter(
            start_at__date__gte=week_start,
            start_at__date__lte=today,
        ).count()

        return Response(
            {
                "users_total": User.objects.count(),
                "users_clients": users_mijoz,
                "barbers_total": barbers,
                "salons_published": salons_pub,
                "salons_pending_review": salons_pending,
                "bookings_today": bookings_today,
                "bookings_week": bookings_week,
                "bookings_total": bookings_total,
                "revenue_total": str(revenue_total),
                "reviews_total": reviews_total,
                "reviews_avg": str(reviews_avg) if reviews_avg is not None else "0",
                "launch_interest_total": LaunchInterest.objects.count(),
                "regions": _admin_region_breakdown(),
            }
        )


class AdminPageNumberPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 5000


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminUserSerializer
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        qs = (
            User.objects.annotate(
                bookings_count=Count("customer_bookings"),
                family_members_count=Count("family_members"),
            )
            .all()
            .order_by("-date_joined")
        )
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

    def list(self, request, *args, **kwargs):
        from accounts.location_sync import sync_user_region_from_gps

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        users = page if page is not None else list(queryset)
        for user in users:
            if user.latitude is not None and user.longitude is not None:
                sync_user_region_from_gps(user, persist=True, full_resolve=False)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdmin]
    queryset = User.objects.annotate(
        bookings_count=Count("customer_bookings"),
        family_members_count=Count("family_members"),
    )
    serializer_class = AdminUserDetailSerializer

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminUserUpdateSerializer
        return AdminUserDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        from accounts.location_sync import sync_user_region_from_gps

        instance = self.get_object()
        # GPS bor bo'lsa profil viloyatini joylashuvga moslab to'ldiramiz/yangilaymiz.
        sync_user_region_from_gps(instance, persist=True, full_resolve=True)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        obj = self.get_object()
        before = {
            "full_name": obj.full_name,
            "phone": obj.phone,
            "is_active": obj.is_active,
        }
        updated = serializer.save()
        after = {
            "full_name": updated.full_name,
            "phone": updated.phone,
            "is_active": updated.is_active,
        }
        _audit(self.request, "update", "user", updated.id, updated.email, before=before, after=after)


class AdminUserSignupAnalyticsView(APIView):
    """GET — mijoz ro'yxatdan o'tish (telefon / Google) real vaqt analitikasi."""

    permission_classes = [IsAdmin]

    def get(self, request):
        limit_raw = request.query_params.get("limit", "100")
        try:
            limit = max(1, min(500, int(limit_raw)))
        except (TypeError, ValueError):
            limit = 100
        return Response(
            {
                **build_user_signup_analytics(recent_limit=limit),
                "salons": build_salon_platform_analytics(recent_limit=limit),
                "barbers": build_barber_platform_analytics(recent_limit=limit),
            }
        )


def _admin_salon_queryset():
    from django.db.models import DecimalField, IntegerField, OuterRef, Subquery, Value
    from django.db.models.functions import Coalesce

    active_members = SalonMembership.objects.filter(
        invite_state=SalonMembership.InviteState.ACTIVE
    ).select_related("barber")

    bookings_sq = (
        Booking.objects.filter(salon_id=OuterRef("pk"))
        .order_by()
        .values("salon_id")
        .annotate(c=Count("id"))
        .values("c")[:1]
    )
    completed_sq = (
        Booking.objects.filter(salon_id=OuterRef("pk"), status=Booking.Status.COMPLETED)
        .order_by()
        .values("salon_id")
        .annotate(c=Count("id"))
        .values("c")[:1]
    )
    revenue_sq = (
        Booking.objects.filter(salon_id=OuterRef("pk"), status=Booking.Status.COMPLETED)
        .order_by()
        .values("salon_id")
        .annotate(t=Sum("total_price"))
        .values("t")[:1]
    )
    from salons.models import FavoriteSalon

    favorites_sq = (
        FavoriteSalon.objects.filter(salon_id=OuterRef("pk"))
        .order_by()
        .values("salon_id")
        .annotate(c=Count("id"))
        .values("c")[:1]
    )

    return (
        Salon.objects.select_related("owner_barber")
        .prefetch_related(
            "hours",
            Prefetch("memberships", queryset=active_members, to_attr="_admin_active_memberships"),
        )
        .annotate(
            _reviews_count=Count("reviews", distinct=True),
            _reviews_avg=Avg("reviews__rating"),
            _bookings_count=Coalesce(Subquery(bookings_sq, output_field=IntegerField()), Value(0)),
            _completed_bookings_count=Coalesce(
                Subquery(completed_sq, output_field=IntegerField()), Value(0)
            ),
            _revenue_uzs=Coalesce(
                Subquery(revenue_sq, output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0),
            ),
            _favorites_count=Coalesce(Subquery(favorites_sq, output_field=IntegerField()), Value(0)),
        )
        .order_by("-created_at")
    )


class AdminSalonListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminSalonListSerializer
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        qs = _admin_salon_queryset()
        pub = self.request.query_params.get("published")
        if pub == "0":
            qs = qs.filter(is_published=False)
        elif pub == "1":
            qs = qs.filter(is_published=True)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(owner_barber__email__icontains=q)
                | Q(owner_barber__full_name__icontains=q)
                | Q(owner_barber__phone__icontains=q)
                | Q(phone__icontains=q)
                | Q(address__icontains=q)
            )
        region = self.request.query_params.get("region", "").strip()
        if region == "__UNSET__":
            qs = qs.filter(Q(owner_barber__isnull=True) | Q(owner_barber__region=""))
        elif region:
            qs = qs.filter(owner_barber__region=region)
        return qs


class AdminSalonDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return _admin_salon_queryset()

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminSalonUpdateSerializer
        return AdminSalonDetailSerializer

    def perform_update(self, serializer):
        obj = self.get_object()
        before = {"name": obj.name, "address": obj.address, "phone": obj.phone, "is_published": obj.is_published, "premium": obj.premium}
        updated = serializer.save()
        after = {"name": updated.name, "address": updated.address, "phone": updated.phone, "is_published": updated.is_published, "premium": updated.premium}
        _audit(self.request, "update", "salon", updated.id, updated.name, before=before, after=after)

    def perform_destroy(self, instance):
        before = {"name": instance.name}
        _audit(self.request, "delete", "salon", instance.id, instance.name, before=before, after={})
        instance.delete()


class AdminSalonAnalyticsView(APIView):
    """Admin: bitta salon uchun bron / daromad analitikasi."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        from bookings.views import _analytics_response_for_bookings, _parse_analytics_datetime
        from bookings.earnings import completed_bookings_qs, filter_bookings_by_earnings_period

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if not all([start, end]):
            return Response({"detail": "start, end (ISO dates) required."}, status=400)
        try:
            start_dt = _parse_analytics_datetime(start, is_end=False)
            end_dt = _parse_analytics_datetime(end, is_end=True)
        except ValueError:
            return Response({"detail": "Invalid dates."}, status=400)

        salon = get_object_or_404(Salon, pk=pk)
        range_base = Booking.objects.filter(
            salon=salon,
            start_at__gte=start_dt,
            start_at__lte=end_dt,
        )
        bookings = filter_bookings_by_earnings_period(
            completed_bookings_qs(Booking.objects.filter(salon=salon)),
            start_dt,
            end_dt,
        )
        cancelled_count = range_base.filter(status=Booking.Status.CANCELLED).count()

        def prior_for_customer(cid):
            return Booking.objects.filter(salon=salon, customer_id=cid, start_at__lt=start_dt)

        return Response(
            _analytics_response_for_bookings(
                bookings,
                cancelled_count=cancelled_count,
                prior_bookings_for_customer=prior_for_customer,
            )
        )


def _admin_barber_queryset():
    from control_panel.barber_segments import annotate_barber_segment_fields

    return annotate_barber_segment_fields(
        Barber.objects.select_related("profile", "signup_snapshot")
        .prefetch_related(
            Prefetch("owned_salons", queryset=Salon.objects.only("id", "name")),
            Prefetch(
                "salon_memberships",
                queryset=SalonMembership.objects.select_related("salon").order_by(
                    "-activated_at", "-id"
                ),
                to_attr="_admin_memberships_ordered",
            ),
        )
        .annotate(
            reviews_count=Count("reviews_about", distinct=True),
            rating=Avg("reviews_about__rating"),
        )
        .order_by("-date_joined")
    )


class AdminBarberListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminBarberSerializer
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        from control_panel.barber_segments import apply_segment_filter

        qs = _admin_barber_queryset()
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
        seg = self.request.query_params.get("segment", "").strip()
        qs = apply_segment_filter(qs, seg)
        kind = self.request.query_params.get("business_kind", "").strip()
        if kind in (Barber.BusinessKind.BARBERSHOP, Barber.BusinessKind.BEAUTY_SALON):
            qs = qs.filter(business_kind=kind)
        elif kind == "unset":
            qs = qs.filter(business_kind="")
        return qs


class AdminBarberSegmentStatsView(APIView):
    """Sartaroshlar segmentlari bo‘yicha sonlar (admin barbers filter bilan mos)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from control_panel.barber_segments import barber_segment_counts

        return Response(barber_segment_counts())


class AdminBarberDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminBarberSerializer

    def get_queryset(self):
        return _admin_barber_queryset()

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminBarberUpdateSerializer
        if self.request.method == "GET":
            return AdminBarberDetailSerializer
        return AdminBarberSerializer

    def perform_update(self, serializer):
        obj = self.get_object()
        before = {"full_name": obj.full_name, "phone": obj.phone, "is_active": obj.is_active}
        updated = serializer.save()
        after = {
            "full_name": updated.full_name,
            "phone": updated.phone,
            "is_active": updated.is_active,
        }
        _audit(self.request, "update", "barber", updated.id, updated.email, before=before, after=after)

    def perform_destroy(self, instance):
        before = {"email": instance.email, "full_name": instance.full_name}
        _audit(self.request, "delete", "barber", instance.id, instance.email, before=before, after={})
        instance.delete()


class AdminBarberAnalyticsView(APIView):
    """Admin: bitta sartarosh uchun barber kabinetidagi kabi analitika."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        from bookings.views import _analytics_response_for_bookings, _parse_analytics_datetime
        from bookings.earnings import completed_bookings_qs, filter_bookings_by_earnings_period

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if not all([start, end]):
            return Response({"detail": "start, end (ISO dates) required."}, status=400)
        try:
            start_dt = _parse_analytics_datetime(start, is_end=False)
            end_dt = _parse_analytics_datetime(end, is_end=True)
        except ValueError:
            return Response({"detail": "Invalid dates."}, status=400)

        barber = get_object_or_404(Barber, pk=pk)
        range_base = Booking.objects.filter(
            barber=barber,
            start_at__gte=start_dt,
            start_at__lte=end_dt,
        )
        bookings = filter_bookings_by_earnings_period(
            completed_bookings_qs(Booking.objects.filter(barber=barber)),
            start_dt,
            end_dt,
        )
        cancelled_count = range_base.filter(status=Booking.Status.CANCELLED).count()

        def prior_for_customer(cid):
            return Booking.objects.filter(barber=barber, customer_id=cid, start_at__lt=start_dt)

        return Response(
            _analytics_response_for_bookings(
                bookings,
                cancelled_count=cancelled_count,
                prior_bookings_for_customer=prior_for_customer,
            )
        )


class AdminBookingListView(generics.ListAPIView):
    """Recent bookings for admin overview (read-only list)."""

    permission_classes = [IsAdmin]
    serializer_class = BookingSerializer
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        qs = (
            Booking.objects.select_related("customer", "salon", "barber")
            .prefetch_related("lines")
            .order_by("-created_at")
        )
        status_value = self.request.query_params.get("status", "").strip()
        if status_value:
            qs = qs.filter(status=status_value)
        barber_raw = self.request.query_params.get("barber", "").strip()
        if barber_raw.isdigit():
            qs = qs.filter(barber_id=int(barber_raw))
        search = self.request.query_params.get("search", "").strip()
        if search:
            cond = Q(order_number__icontains=search) | Q(
                customer__full_name__icontains=search
            ) | Q(customer__email__icontains=search)
            if search.isdigit():
                cond |= Q(id=int(search))
            qs = qs.filter(cond)
        return qs


class AdminBookingDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdmin]
    serializer_class = BookingSerializer

    def get_queryset(self):
        return (
            Booking.objects.select_related("customer", "salon", "barber")
            .prefetch_related("lines")
            .order_by("-created_at")
        )


class UserSupportTicketListCreateView(APIView):
    """Mijoz yordam murojaatlari."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SupportTicket.objects.filter(created_by_user=request.user).order_by("-updated_at")[:50]
        return Response(
            [
                {
                    "id": t.id,
                    "subject": t.subject,
                    "body": t.body,
                    "status": t.status,
                    "created_at": t.created_at.isoformat(),
                    "updated_at": t.updated_at.isoformat(),
                }
                for t in qs
            ]
        )

    def post(self, request):
        subject = str(request.data.get("subject", "")).strip()
        body = str(request.data.get("body", "")).strip()
        if not subject:
            return Response({"detail": "subject is required."}, status=http_status.HTTP_400_BAD_REQUEST)
        ticket = SupportTicket.objects.create(
            subject=subject[:255],
            body=body,
            category="user_support",
            created_by_user=request.user,
        )
        return Response(
            {
                "id": ticket.id,
                "subject": ticket.subject,
                "status": ticket.status,
                "created_at": ticket.created_at.isoformat(),
            },
            status=http_status.HTTP_201_CREATED,
        )


class AdminReviewListView(generics.ListAPIView):
    """Barcha sharhlar (mijoz → sartarosh / salon bronlari)."""

    permission_classes = [IsAdmin]
    serializer_class = AdminReviewListSerializer
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        qs = Review.objects.select_related("author", "barber")
        barber = self.request.query_params.get("barber")
        if barber:
            if str(barber).isdigit():
                qs = qs.filter(barber_id=int(barber))
            else:
                qs = qs.filter(Q(barber__email__icontains=barber) | Q(barber__full_name__icontains=barber))
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


def _audit(request, action: str, target_type: str, target_id: str = "", target_name: str = "", before=None, after=None):
    try:
        admin = getattr(request, "user", None)
        admin_id = getattr(admin, "admin_id", None) or getattr(admin, "id", None)
        if not admin_id:
            return
        AuditLog.objects.create(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id or ""),
            target_name=target_name or "",
            before_json=before or {},
            after_json=after or {},
            ip=request.META.get("REMOTE_ADDR", "")[:64],
            user_agent=(request.META.get("HTTP_USER_AGENT", "") or "")[:255],
        )
    except Exception:
        return


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = Category.objects.all().order_by("order", "name")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminCategoryWriteSerializer
        return AdminCategorySerializer

    def list(self, request, *args, **kwargs):
        try:
            ensure_default_catalog_seeded()
            return super().list(request, *args, **kwargs)
        except (OperationalError, ProgrammingError):
            # Deploy paytida catalog jadvallari hali migrate bo'lmagan bo'lsa admin sahifa 500 bo'lmasin.
            return Response([])

    def perform_create(self, serializer):
        obj = serializer.save()
        _audit(self.request, "create", "category", obj.id, obj.name, before={}, after={"name": obj.name})


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdmin]
    queryset = Category.objects.all()

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminCategoryWriteSerializer
        return AdminCategorySerializer

    def perform_update(self, serializer):
        obj = self.get_object()
        before = {"name": obj.name, "icon": obj.icon, "order": obj.order, "is_active": obj.is_active}
        updated = serializer.save()
        after = {"name": updated.name, "icon": updated.icon, "order": updated.order, "is_active": updated.is_active}
        _audit(self.request, "update", "category", updated.id, updated.name, before=before, after=after)

    def perform_destroy(self, instance):
        before = {"name": instance.name}
        _audit(self.request, "delete", "category", instance.id, instance.name, before=before, after={})
        instance.delete()


class AdminServicesView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            ensure_default_catalog_seeded()
            q = request.query_params.get("q", "").strip()
            cat = request.query_params.get("category")
            qs = CatalogService.objects.prefetch_related("categories")
            if q:
                qs = qs.filter(
                    Q(name__icontains=q)
                    | Q(description__icontains=q)
                    | Q(categories__name__icontains=q)
                ).distinct()
            if cat and str(cat).isdigit():
                qs = qs.filter(categories__id=int(cat))
            kind = request.query_params.get("business_kind", "").strip()
            if kind == "barbershop":
                qs = qs.filter(for_barbershop=True)
            elif kind == "beauty_salon":
                qs = qs.filter(for_beauty_salon=True)
            return Response(
                AdminCatalogServiceSerializer(qs.order_by("sort_order", "name")[:500], many=True).data
            )
        except (OperationalError, ProgrammingError):
            # Catalog migratsiyasi to'liq tugamagan deploylarda sahifani bo'sh holatda ochib qo'yamiz.
            return Response([])

    def post(self, request):
        serializer = AdminCatalogServiceWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category_ids = serializer.validated_data.pop("category_ids", [])
        if not serializer.validated_data.get("image_url"):
            serializer.validated_data["image_url"] = build_catalog_service_image(
                serializer.validated_data["name"],
            )
        obj = serializer.save()
        obj.categories.set(Category.objects.filter(id__in=category_ids))
        _sync_catalog_service_assignments(obj)
        _audit(request, "create", "catalog_service", obj.id, obj.name, before={}, after={"name": obj.name})
        return Response(AdminCatalogServiceSerializer(obj).data, status=http_status.HTTP_201_CREATED)


class AdminServiceDetailView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk: str):
        obj = CatalogService.objects.filter(pk=pk).prefetch_related("categories").first()
        if not obj:
            raise NotFound()
        before = {
            "name": obj.name,
            "description": obj.description,
            "image_url": obj.image_url,
            "duration_minutes": obj.duration_minutes,
            "is_active": obj.is_active,
            "sort_order": obj.sort_order,
            "category_ids": list(obj.categories.values_list("id", flat=True)),
        }
        serializer = AdminCatalogServiceWriteSerializer(instance=obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        category_ids = serializer.validated_data.pop("category_ids", None)
        if "image_url" in serializer.validated_data and not serializer.validated_data["image_url"]:
            serializer.validated_data["image_url"] = build_catalog_service_image(
                serializer.validated_data.get("name", obj.name),
                index=obj.sort_order,
            )
        updated = serializer.save()
        if category_ids is not None:
            updated.categories.set(Category.objects.filter(id__in=category_ids))
        _sync_catalog_service_assignments(updated)
        after = {
            "name": updated.name,
            "description": updated.description,
            "image_url": updated.image_url,
            "duration_minutes": updated.duration_minutes,
            "is_active": updated.is_active,
            "sort_order": updated.sort_order,
            "category_ids": list(updated.categories.values_list("id", flat=True)),
        }
        _audit(request, "update", "catalog_service", updated.id, updated.name, before=before, after=after)
        return Response(AdminCatalogServiceSerializer(updated).data)

    def delete(self, request, pk: str):
        obj = CatalogService.objects.filter(pk=pk).first()
        if not obj:
            raise NotFound()
        before = {"name": obj.name}
        _audit(request, "delete", "catalog_service", obj.id, obj.name, before=before, after={})
        obj.delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)


def _service_line_stats(kind: str, obj_id: int) -> dict[str, object]:
    if kind == "independent":
        qs = BookingLine.objects.filter(barber_service_id=obj_id)
    else:
        qs = BookingLine.objects.filter(service_id=obj_id)
    return {
        "total_bookings": qs.count(),
        "completed_bookings": qs.filter(booking__status=Booking.Status.COMPLETED).count(),
        "cancelled_bookings": qs.filter(booking__status=Booking.Status.CANCELLED).count(),
        "barber_ids": set(qs.values_list("booking__barber_id", flat=True).distinct()),
    }


def _sync_catalog_service_assignments(catalog: CatalogService) -> None:
    categories = list(catalog.categories.all())
    for row in Service.objects.filter(catalog_service=catalog):
        row.name = catalog.name
        row.duration_minutes = catalog.duration_minutes
        row.save(update_fields=["name", "duration_minutes"])
        row.categories.set(categories)
    for row in BarberService.objects.filter(catalog_service=catalog):
        row.name = catalog.name
        row.duration_minutes = catalog.duration_minutes
        row.save(update_fields=["name", "duration_minutes"])
        row.categories.set(categories)


class AdminServiceUsageView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        try:
            ensure_default_catalog_seeded()
            q = request.query_params.get("q", "").strip()
            cat = request.query_params.get("category")
            catalog_qs = CatalogService.objects.prefetch_related("categories")
            if q:
                catalog_qs = catalog_qs.filter(
                    Q(name__icontains=q)
                    | Q(description__icontains=q)
                    | Q(categories__name__icontains=q)
                ).distinct()
            if cat and str(cat).isdigit():
                catalog_qs = catalog_qs.filter(categories__id=int(cat))

            rows = []
            for catalog in catalog_qs.order_by("sort_order", "name")[:500]:
                item_rows = []
                used_barber_ids: set[int] = set()
                total_bookings = 0
                completed_bookings = 0
                cancelled_bookings = 0

                for service in Service.objects.filter(catalog_service=catalog).select_related("salon", "barber"):
                    stats = _service_line_stats("salon", service.id)
                    used_barber_ids.update(stats["barber_ids"])
                    if service.barber_id:
                        used_barber_ids.add(service.barber_id)
                    total_bookings += int(stats["total_bookings"])
                    completed_bookings += int(stats["completed_bookings"])
                    cancelled_bookings += int(stats["cancelled_bookings"])
                    item_rows.append(
                        {
                            "id": str(service.id),
                            "type": "salon",
                            "catalog_service_id": str(catalog.id),
                            "service_name": catalog.name,
                            "price": float(service.price),
                            "duration_minutes": service.duration_minutes,
                            "is_active": service.is_active,
                            "salon_id": str(service.salon_id),
                            "salon_name": getattr(service.salon, "name", "") or "",
                            "barber_id": str(service.barber_id or ""),
                            "barber_name": (getattr(service.barber, "full_name", "") or getattr(service.barber, "email", "") or "").strip(),
                            "bookings_total": int(stats["total_bookings"]),
                            "bookings_completed": int(stats["completed_bookings"]),
                            "bookings_cancelled": int(stats["cancelled_bookings"]),
                        }
                    )

                for service in BarberService.objects.filter(catalog_service=catalog).select_related("profile__barber"):
                    stats = _service_line_stats("independent", service.id)
                    used_barber_ids.update(stats["barber_ids"])
                    total_bookings += int(stats["total_bookings"])
                    completed_bookings += int(stats["completed_bookings"])
                    cancelled_bookings += int(stats["cancelled_bookings"])
                    barber = getattr(service.profile, "barber", None)
                    if barber is not None and getattr(barber, "id", None):
                        used_barber_ids.add(barber.id)
                    item_rows.append(
                        {
                            "id": str(service.id),
                            "type": "independent",
                            "catalog_service_id": str(catalog.id),
                            "service_name": catalog.name,
                            "price": float(service.price),
                            "duration_minutes": service.duration_minutes,
                            "is_active": service.is_active,
                            "salon_id": "",
                            "salon_name": "",
                            "barber_id": str(getattr(barber, "id", "") or ""),
                            "barber_name": (getattr(barber, "full_name", "") or getattr(barber, "email", "") or "").strip(),
                            "bookings_total": int(stats["total_bookings"]),
                            "bookings_completed": int(stats["completed_bookings"]),
                            "bookings_cancelled": int(stats["cancelled_bookings"]),
                        }
                    )

                rows.append(
                    {
                        "id": str(catalog.id),
                        "name": catalog.name,
                        "description": catalog.description,
                        "image_url": catalog.image_url,
                        "duration_minutes": catalog.duration_minutes,
                        "is_active": catalog.is_active,
                        "category_names": list(
                            catalog.categories.order_by("order", "name").values_list("name", flat=True)
                        ),
                        "barbers_count": len([bid for bid in used_barber_ids if bid]),
                        "bookings_total": total_bookings,
                        "bookings_completed": completed_bookings,
                        "bookings_cancelled": cancelled_bookings,
                        "cancellation_rate": round((cancelled_bookings / total_bookings) * 100, 1)
                        if total_bookings
                        else 0,
                        "rows": item_rows,
                    }
                )
            return Response(rows)
        except (OperationalError, ProgrammingError):
            return Response([])


class AdminRuntimeServiceDetailView(APIView):
    permission_classes = [IsAdmin]

    def _get_object(self, kind: str, pk: int):
        if kind == "independent":
            return BarberService.objects.select_related("catalog_service", "profile__barber").filter(pk=pk).first()
        return Service.objects.select_related("catalog_service", "salon", "barber").filter(pk=pk).first()

    def patch(self, request, kind: str, pk: int):
        obj = self._get_object(kind, pk)
        if obj is None:
            raise NotFound()
        before = {
            "price": str(obj.price),
            "is_active": obj.is_active,
        }
        if "price" in request.data:
            obj.price = request.data.get("price") or obj.price
        if "is_active" in request.data:
            obj.is_active = bool(request.data.get("is_active"))
        if obj.catalog_service_id and obj.catalog_service:
            obj.name = obj.catalog_service.name
            obj.duration_minutes = obj.catalog_service.duration_minutes
        obj.save()
        after = {
            "price": str(obj.price),
            "is_active": obj.is_active,
        }
        _audit(request, "update", "service_assignment", obj.id, obj.name, before=before, after=after)
        return Response({"ok": True})

    def delete(self, request, kind: str, pk: int):
        obj = self._get_object(kind, pk)
        if obj is None:
            raise NotFound()
        before = {"name": obj.name}
        _audit(request, "delete", "service_assignment", obj.id, obj.name, before=before, after={})
        obj.delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)


class AdminFinanceOverviewView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from config.api_cache import cached_json

        def _build():
            completed = Booking.objects.filter(status="completed")
            revenue_total = completed.aggregate(s=Sum("total_price"))["s"] or 0
            today = timezone.localdate()
            weekly = []
            for i in range(6, -1, -1):
                d = today - timezone.timedelta(days=i)
                s = completed.filter(start_at__date=d).aggregate(s=Sum("total_price"))["s"] or 0
                weekly.append({"day": d.strftime("%a"), "revenue": float(s)})
            top_barbers = (
                completed.values("barber_id", "barber__full_name", "barber__email", "barber__avatar")
                .annotate(rev=Sum("total_price"))
                .order_by("-rev")[:5]
            )
            trows = []
            for r in top_barbers:
                avatar = ""
                raw_avatar = r.get("barber__avatar")
                if raw_avatar:
                    try:
                        avatar = request.build_absolute_uri(f"/media/{raw_avatar}")
                    except Exception:
                        avatar = f"/media/{raw_avatar}"
                trows.append(
                    {
                        "id": str(r["barber_id"] or ""),
                        "name": r["barber__full_name"] or r["barber__email"] or "—",
                        "avatar": avatar,
                        "revenue": float(r["rev"] or 0),
                    }
                )
            return {
                "revenue_total": float(revenue_total),
                "revenue_week": float(sum(w["revenue"] for w in weekly)),
                "commission_total": 0,
                "pending_payouts": float(
                    Payout.objects.filter(status=Payout.Status.PENDING).aggregate(s=Sum("amount"))["s"]
                    or 0
                ),
                "weekly": weekly,
                "top_barbers": trows,
            }

        payload = cached_json(
            prefix="admin:finance:overview",
            parts={"day": str(timezone.localdate())},
            producer=_build,
            ttl=8,
        )
        return Response(payload)


class AdminReportExportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, report_type: str):
        if report_type == "stats":
            payload = {
                "users_total": User.objects.count(),
                "barbers_total": Barber.objects.count(),
                "salons_total": Salon.objects.count(),
                "bookings_total": Booking.objects.count(),
                "generated_at": timezone.now(),
            }
            return Response(payload)
        if report_type == "finance":
            completed = Booking.objects.filter(status="completed")
            payload = {
                "revenue_total": float(completed.aggregate(s=Sum("total_price"))["s"] or 0),
                "bookings_completed": completed.count(),
                "pending_payouts": float(
                    Payout.objects.filter(status=Payout.Status.PENDING).aggregate(s=Sum("amount"))["s"] or 0
                ),
                "generated_at": timezone.now(),
            }
            return Response(payload)
        return Response({"detail": "Unknown report type"}, status=http_status.HTTP_404_NOT_FOUND)


class AdminFinanceTransactionsView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminFinanceTransactionSerializer
    queryset = FinanceTransaction.objects.all()


class AdminPayoutsView(APIView):
    """Sartarosh yechish so'rovlari — summary + to'liq ro'yxat."""

    permission_classes = [IsAdmin]

    def get(self, request):
        qs = (
            Payout.objects.select_related("barber", "barber__settings")
            .all()
            .order_by("-created_at")
        )
        status_f = (request.query_params.get("status") or "").strip()
        if status_f and status_f != "all":
            qs = qs.filter(status=status_f)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(barber__full_name__icontains=q)
                | Q(barber__phone__icontains=q)
                | Q(barber__email__icontains=q)
                | Q(reference__icontains=q)
                | Q(period__icontains=q)
            )

        # Summary — filtrdan oldin (barcha payoutlar)
        all_qs = Payout.objects.all()
        summary = {
            "pending_total": float(
                all_qs.filter(status=Payout.Status.PENDING).aggregate(s=Sum("amount"))["s"] or 0
            ),
            "pending_count": all_qs.filter(status=Payout.Status.PENDING).count(),
            "paid_total": float(
                all_qs.filter(status=Payout.Status.PAID).aggregate(s=Sum("amount"))["s"] or 0
            ),
            "paid_count": all_qs.filter(status=Payout.Status.PAID).count(),
            "failed_total": float(
                all_qs.filter(status=Payout.Status.FAILED).aggregate(s=Sum("amount"))["s"] or 0
            ),
            "failed_count": all_qs.filter(status=Payout.Status.FAILED).count(),
            "all_total": float(all_qs.aggregate(s=Sum("amount"))["s"] or 0),
            "all_count": all_qs.count(),
        }

        paginator = AdminPageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        data = AdminPayoutSerializer(page, many=True, context={"request": request}).data
        response = paginator.get_paginated_response(data)
        response.data["summary"] = summary
        response.data["page"] = paginator.page.number
        response.data["page_size"] = paginator.get_page_size(request)
        return response


class AdminPayoutMarkPaidView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk: int):
        p = Payout.objects.select_related("barber").filter(id=pk).first()
        if not p:
            raise NotFound()
        before = {"status": p.status, "amount": str(p.amount)}
        p.status = Payout.Status.PAID
        p.paid_at = timezone.now()
        p.save(update_fields=["status", "paid_at"])
        _audit(request, "update", "payout", p.id, p.period, before=before, after={"status": p.status})
        try:
            from notifications.utils import notify_barber

            notify_barber(
                p.barber,
                "payout_paid",
                "To'lov amalga oshirildi",
                f"{p.amount} so'm hisobingizga o'tkazildi.",
                {"payout_id": p.id},
            )
        except Exception:
            pass
        return Response({"ok": True})


class AdminPayoutRejectView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk: int):
        p = Payout.objects.select_related("barber").filter(id=pk).first()
        if not p:
            raise NotFound()
        if p.status != Payout.Status.PENDING:
            return Response({"detail": "Faqat kutilayotgan so'rovni rad etish mumkin."}, status=400)
        before = {"status": p.status}
        p.status = Payout.Status.FAILED
        p.save(update_fields=["status"])
        _audit(
            request,
            "update",
            "payout",
            p.id,
            p.period,
            before=before,
            after={"status": p.status},
        )
        try:
            from notifications.utils import notify_barber

            notify_barber(
                p.barber,
                "payout_rejected",
                "Yechish so'rovi rad etildi",
                f"{p.amount} so'm so'rovi rad etildi. Balans qayta ochiq.",
                {"payout_id": p.id},
            )
        except Exception:
            pass
        return Response({"ok": True})


class AdminBarberPromotionListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminBarberPromotionSerializer

    def get_queryset(self):
        qs = BarberPromotion.objects.select_related("barber").order_by("-created_at")
        status = (self.request.query_params.get("status") or "").strip()
        if status:
            qs = qs.filter(status=status)
        return qs


class AdminBarberPromotionApproveView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk: int):
        promo = BarberPromotion.objects.select_related("barber").filter(pk=pk).first()
        if not promo:
            raise NotFound()
        if promo.status != BarberPromotion.Status.PENDING:
            return Response({"detail": "Faqat kutilayotgan so'rov tasdiqlanadi."}, status=400)
        before = {"status": promo.status}
        promo.status = BarberPromotion.Status.ACTIVE
        promo.save(update_fields=["status"])
        _audit(
            request,
            "update",
            "barber_promotion",
            promo.id,
            promo.barber.full_name or promo.barber.email,
            before=before,
            after={"status": promo.status},
        )
        try:
            from notifications.utils import notify_barber

            notify_barber(
                promo.barber,
                "promotion_active",
                "TOP reklama faollashdi",
                f"Reklamangiz {promo.ends_at.date()} gacha faol.",
                {"promotion_id": promo.id},
            )
        except Exception:
            pass
        return Response(AdminBarberPromotionSerializer(promo).data)


class AdminBarberPromotionRejectView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk: int):
        promo = BarberPromotion.objects.select_related("barber").filter(pk=pk).first()
        if not promo:
            raise NotFound()
        if promo.status != BarberPromotion.Status.PENDING:
            return Response({"detail": "Faqat kutilayotgan so'rov rad etiladi."}, status=400)
        before = {"status": promo.status}
        promo.status = BarberPromotion.Status.CANCELLED
        promo.save(update_fields=["status"])
        _audit(
            request,
            "update",
            "barber_promotion",
            promo.id,
            promo.barber.full_name or promo.barber.email,
            before=before,
            after={"status": promo.status},
        )
        try:
            from notifications.utils import notify_barber

            notify_barber(
                promo.barber,
                "promotion_rejected",
                "TOP so'rovi rad etildi",
                "Admin bilan bog'laning yoki qayta urinib ko'ring.",
                {"promotion_id": promo.id},
            )
        except Exception:
            pass
        return Response(AdminBarberPromotionSerializer(promo).data)


class AdminAuditLogListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminAuditLogSerializer
    queryset = AuditLog.objects.select_related("admin").all()


class AdminSupportTicketListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminSupportTicketSerializer

    def get_queryset(self):
        _sync_barber_support_tickets()
        qs = SupportTicket.objects.select_related("assignee", "created_by_user", "created_by_barber").all()
        st = self.request.query_params.get("status")
        if st and st != "all":
            qs = qs.filter(status=st)
        return qs


class AdminSupportTicketDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdmin]
    queryset = SupportTicket.objects.select_related("assignee", "created_by_user", "created_by_barber").all()
    serializer_class = AdminSupportTicketDetailSerializer

    def get_object(self):
        _sync_barber_support_tickets()
        return super().get_object()

    def perform_update(self, serializer):
        obj = self.get_object()
        before = {"status": obj.status, "priority": obj.priority, "assignee": obj.assignee_id}
        updated = serializer.save()
        if updated.category.startswith("barber_support:"):
            source_id = updated.category.split(":", 1)[1]
            bt = BarberSupportTicket.objects.filter(id=source_id).first()
            if bt:
                if updated.status == SupportTicket.Status.CLOSED:
                    bt.status = BarberSupportTicket.Status.CLOSED
                elif updated.status == SupportTicket.Status.PENDING:
                    bt.status = BarberSupportTicket.Status.IN_PROGRESS
                else:
                    bt.status = BarberSupportTicket.Status.OPEN
                bt.save(update_fields=["status", "updated_at"])
        after = {"status": updated.status, "priority": updated.priority, "assignee": updated.assignee_id}
        _audit(self.request, "update", "ticket", updated.id, updated.subject, before=before, after=after)


class AdminSupportTicketRepliesView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk: int):
        _sync_barber_support_tickets()
        t = SupportTicket.objects.filter(id=pk).first()
        if not t:
            raise NotFound()
        qs = t.replies.all()
        ser = AdminSupportReplySerializer(qs, many=True)
        return Response(ser.data)

    def post(self, request, pk: int):
        _sync_barber_support_tickets()
        t = SupportTicket.objects.filter(id=pk).first()
        if not t:
            raise NotFound()
        body = str((request.data or {}).get("body", "")).strip()
        if not body:
            return Response({"detail": "body kerak"}, status=http_status.HTTP_400_BAD_REQUEST)
        admin = getattr(request, "user", None)
        account = getattr(admin, "admin_account", None)
        name = getattr(account, "email", "") or getattr(admin, "email", "admin")
        r = SupportReply.objects.create(ticket=t, author_role=SupportReply.AuthorRole.ADMIN, author_name=name, body=body)
        t.unread = 0
        t.save(update_fields=["unread", "updated_at"])
        if t.category.startswith("barber_support:"):
            source_id = t.category.split(":", 1)[1]
            BarberSupportTicket.objects.filter(id=source_id).update(
                status=BarberSupportTicket.Status.IN_PROGRESS
            )
        _audit(request, "create", "ticket_reply", r.id, t.subject, before={}, after={"ticket": t.id})
        return Response({"ok": True})


class AdminBroadcastListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminBroadcastCampaignSerializer
    queryset = BroadcastCampaign.objects.select_related("created_by").all()

    def create(self, request, *args, **kwargs):
        data = request.data or {}
        title = str(data.get("title", "")).strip()
        body = str(data.get("body", "")).strip()
        if not title or not body:
            return Response({"detail": "title/body kerak"}, status=http_status.HTTP_400_BAD_REQUEST)
        audience = str(data.get("audience", "all"))
        channel = str(data.get("channel", "push"))
        region = str(data.get("region", "") or "")
        admin = getattr(request, "user", None)
        admin_id = getattr(admin, "admin_id", None) or getattr(admin, "id", None)
        camp = BroadcastCampaign.objects.create(
            created_by_id=admin_id,
            audience=audience,
            channel=channel,
            region=region,
            title=title,
            body=body,
            payload=data.get("payload") or {},
        )
        # Dispatch minimal: create Notification rows if needed (future). For now mark counts 0.
        _audit(request, "create", "broadcast", camp.id, camp.title, before={}, after={"audience": audience})
        ser = self.get_serializer(camp)
        return Response(ser.data, status=http_status.HTTP_201_CREATED)


class AdminAdminAccountListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    queryset = AdminAccount.objects.all()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminAccountWriteSerializer
        return AdminAccountSerializer


class AdminAdminAccountDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdmin]
    queryset = AdminAccount.objects.all()
    serializer_class = AdminAccountSerializer

    def patch(self, request, *args, **kwargs):
        obj = self.get_object()
        before = {"is_active": obj.is_active}
        if "is_active" in request.data:
            obj.is_active = bool(request.data.get("is_active"))
        obj.save(update_fields=["is_active"])
        _audit(request, "update", "admin_account", obj.id, obj.email, before=before, after={"is_active": obj.is_active})
        return Response(AdminAccountSerializer(obj).data)


class AdminPlatformIncomeView(APIView):
    """Platforma sof daromadi — faqat platforma olgan pul (aylanma emas)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from config.api_cache import cached_json

        from .platform_analytics import build_platform_income, resolve_range

        start_dt, end_dt = resolve_range(
            request.query_params.get("start"),
            request.query_params.get("end"),
        )
        payload = cached_json(
            prefix="admin:finance:platform-income",
            parts={"start": start_dt.isoformat(), "end": end_dt.isoformat()},
            producer=lambda: build_platform_income(start_dt, end_dt),
            ttl=5,
        )
        return Response(payload)


class AdminPlatformTurnoverView(APIView):
    """Platforma aylanmasi — bronlar va mijoz pul oqimi."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from config.api_cache import cached_json

        from .platform_analytics import build_platform_turnover, resolve_range

        start_dt, end_dt = resolve_range(
            request.query_params.get("start"),
            request.query_params.get("end"),
        )
        payload = cached_json(
            prefix="admin:finance:platform-turnover",
            parts={"start": start_dt.isoformat(), "end": end_dt.isoformat()},
            producer=lambda: build_platform_turnover(start_dt, end_dt),
            ttl=5,
        )
        return Response(payload)


class AdminGiftTransferListView(APIView):
    """Sovg'a kartalar — kim kimga, qachon, qancha, qaysi dizayn."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from wallet.models import GiftTransfer

        from .platform_analytics import (
            build_gifts_summary,
            resolve_range,
            serialize_gift_transfer,
        )

        qs = GiftTransfer.objects.select_related(
            "sender_wallet__user",
            "recipient_wallet__user",
        ).order_by("-created_at")

        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(sender_wallet__user__full_name__icontains=q)
                | Q(sender_wallet__user__phone__icontains=q)
                | Q(recipient_wallet__user__full_name__icontains=q)
                | Q(recipient_wallet__user__phone__icontains=q)
                | Q(design_id__icontains=q)
                | Q(message__icontains=q)
            )

        design_id = (request.query_params.get("design_id") or "").strip()
        if design_id and design_id != "all":
            qs = qs.filter(design_id=design_id)

        status_f = (request.query_params.get("status") or "").strip()
        if status_f and status_f != "all":
            qs = qs.filter(status=status_f)

        start_raw = request.query_params.get("start")
        end_raw = request.query_params.get("end")
        start_dt = end_dt = None
        if start_raw or end_raw:
            start_dt, end_dt = resolve_range(start_raw, end_raw)
            qs = qs.filter(created_at__gte=start_dt, created_at__lte=end_dt)

        paginator = AdminPageNumberPagination()
        page = paginator.paginate_queryset(qs, request)
        results = [serialize_gift_transfer(g) for g in page]
        summary = build_gifts_summary(start_dt, end_dt)
        response = paginator.get_paginated_response(results)
        response.data["summary"] = summary
        response.data["page"] = paginator.page.number
        response.data["page_size"] = paginator.get_page_size(request)
        return response
