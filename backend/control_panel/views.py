from django.db.models import Avg, Count, Prefetch, Q, Sum
from django.utils import timezone
from rest_framework import generics
from rest_framework import status as http_status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound

from accounts.models import AdminAccount, User
from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberService, BarberSupportTicket
from accounts.permissions import IsAdmin
from bookings.models import Booking, BookingLine, Review
from bookings.serializers import BookingSerializer
from salons.models import Category, Salon, SalonMembership, Service

from .serializers import (
    AdminAccountSerializer,
    AdminAccountWriteSerializer,
    AdminBarberDetailSerializer,
    AdminBarberSerializer,
    AdminBarberUpdateSerializer,
    AdminBroadcastCampaignSerializer,
    AdminCategorySerializer,
    AdminCategoryWriteSerializer,
    AdminFinanceTransactionSerializer,
    AdminPayoutSerializer,
    AdminReviewListSerializer,
    AdminSalonDetailSerializer,
    AdminSalonListSerializer,
    AdminSalonUpdateSerializer,
    AdminSupportReplySerializer,
    AdminSupportTicketDetailSerializer,
    AdminSupportTicketSerializer,
    AdminUserSerializer,
    AdminUserUpdateSerializer,
    AdminAuditLogSerializer,
    salon_schedule_summary,
)

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


class AdminPageNumberPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 5000


class AdminUserListView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminUserSerializer
    pagination_class = AdminPageNumberPagination

    def get_queryset(self):
        qs = User.objects.annotate(bookings_count=Count("customer_bookings")).all().order_by("-date_joined")
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

    def perform_update(self, serializer):
        obj = self.get_object()
        before = {
            "full_name": obj.full_name,
            "phone": obj.phone,
            "region": obj.region,
            "is_active": obj.is_active,
        }
        updated = serializer.save()
        after = {
            "full_name": updated.full_name,
            "phone": updated.phone,
            "region": updated.region,
            "is_active": updated.is_active,
        }
        _audit(self.request, "update", "user", updated.id, updated.email, before=before, after=after)


def _admin_salon_queryset():
    active_members = SalonMembership.objects.filter(
        invite_state=SalonMembership.InviteState.ACTIVE
    ).select_related("barber")
    return (
        Salon.objects.select_related("owner_barber")
        .prefetch_related(
            "hours",
            Prefetch("memberships", queryset=active_members, to_attr="_admin_active_memberships"),
        )
        .annotate(
            _reviews_count=Count("reviews", distinct=True),
            _reviews_avg=Avg("reviews__rating"),
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
        return apply_segment_filter(qs, seg)


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
        before = {"full_name": obj.full_name, "phone": obj.phone, "region": obj.region, "is_active": obj.is_active}
        updated = serializer.save()
        after = {"full_name": updated.full_name, "phone": updated.phone, "region": updated.region, "is_active": updated.is_active}
        _audit(self.request, "update", "barber", updated.id, updated.email, before=before, after=after)

    def perform_destroy(self, instance):
        before = {"email": instance.email, "full_name": instance.full_name}
        _audit(self.request, "delete", "barber", instance.id, instance.email, before=before, after={})
        instance.delete()


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
        return qs


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
        kind = request.query_params.get("type", "").strip().lower()
        q = request.query_params.get("q", "").strip()
        cat = request.query_params.get("category")

        out = []

        def category_payload(obj):
            """
            Productionda legacy DB sxemasi (m2m jadval hali yo'q) bo'lsa ham endpoint 500 bermasin.
            """
            try:
                ids = list(obj.categories.values_list("id", flat=True))
                names = list(obj.categories.order_by("order", "name").values_list("name", flat=True))
                return ids, ", ".join(names)
            except Exception:
                return [], ""

        if kind in ("", "salon", "both"):
            qs = Service.objects.select_related("salon").all()
            if q:
                qs = qs.filter(Q(name__icontains=q) | Q(salon__name__icontains=q))
            if cat and str(cat).isdigit():
                try:
                    qs = qs.filter(categories__id=int(cat))
                except Exception:
                    # Legacy schema: categories m2m not ready yet, skip category filter.
                    pass
            for s in qs.order_by("name")[:2000]:
                cat_ids, cat_names = category_payload(s)
                out.append(
                    {
                        "id": str(s.id),
                        "type": "salon",
                        "name": s.name,
                        "category_ids": cat_ids,
                        "category_names": cat_names,
                        "price": s.price,
                        "duration_min": s.duration_minutes,
                        "bookings_count": BookingLine.objects.filter(salon_service_id=s.id).count(),
                        "is_active": s.is_active,
                    }
                )

        if kind in ("", "independent", "both"):
            qs = BarberService.objects.select_related("profile", "profile__barber").all()
            if q:
                qs = qs.filter(Q(name__icontains=q) | Q(profile__barber__email__icontains=q) | Q(profile__barber__full_name__icontains=q))
            if cat and str(cat).isdigit():
                try:
                    qs = qs.filter(categories__id=int(cat))
                except Exception:
                    # Legacy schema: categories m2m not ready yet, skip category filter.
                    pass
            for s in qs.order_by("name")[:2000]:
                cat_ids, cat_names = category_payload(s)
                out.append(
                    {
                        "id": str(s.id),
                        "type": "independent",
                        "name": s.name,
                        "category_ids": cat_ids,
                        "category_names": cat_names,
                        "price": s.price,
                        "duration_min": s.duration_minutes,
                        "bookings_count": BookingLine.objects.filter(barber_service_id=s.id).count(),
                        "is_active": s.is_active,
                    }
                )

        return Response(out)

    def post(self, request):
        data = request.data or {}
        kind = str(data.get("type", "salon")).strip().lower()
        name = str(data.get("name", "")).strip()
        if not name:
            return Response({"detail": "name kerak"}, status=http_status.HTTP_400_BAD_REQUEST)
        price = data.get("price", 0)
        duration = int(data.get("duration_min") or 30)
        is_active = bool(data.get("is_active", True))
        category_ids = data.get("category_ids") or []

        if kind == "salon":
            salon_id = data.get("salon_id")
            if not salon_id:
                return Response({"detail": "salon_id kerak"}, status=http_status.HTTP_400_BAD_REQUEST)
            salon = Salon.objects.filter(id=salon_id).first()
            if not salon:
                return Response({"detail": "Salon topilmadi"}, status=http_status.HTTP_404_NOT_FOUND)
            obj = Service.objects.create(salon=salon, name=name, price=price, duration_minutes=duration, is_active=is_active)
        else:
            barber_id = data.get("barber_id")
            if not barber_id:
                return Response({"detail": "barber_id kerak"}, status=http_status.HTTP_400_BAD_REQUEST)
            barber = Barber.objects.filter(id=barber_id).first()
            if not barber or not getattr(barber, "profile", None):
                return Response({"detail": "Barber/profile topilmadi"}, status=http_status.HTTP_404_NOT_FOUND)
            obj = BarberService.objects.create(profile=barber.profile, name=name, price=price, duration_minutes=duration, is_active=is_active)

        if category_ids:
            obj.categories.set(Category.objects.filter(id__in=category_ids))

        _audit(request, "create", "service", obj.id, name, before={}, after={"name": name, "type": kind})
        return Response({"ok": True, "id": str(obj.id)})


class AdminServiceDetailView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk: str):
        kind = request.query_params.get("type", "").strip().lower()
        data = request.data or {}
        category_ids = data.get("category_ids")

        if kind == "independent":
            obj = BarberService.objects.filter(id=pk).first()
        else:
            obj = Service.objects.filter(id=pk).first()

        if not obj:
            raise NotFound()

        before = {
            "name": obj.name,
            "price": str(obj.price),
            "duration_minutes": getattr(obj, "duration_minutes", getattr(obj, "duration_minutes", None)),
            "is_active": obj.is_active,
            "category_ids": list(obj.categories.values_list("id", flat=True)),
        }

        if "name" in data:
            obj.name = str(data.get("name") or "").strip() or obj.name
        if "price" in data:
            obj.price = data.get("price") or obj.price
        if "duration_min" in data:
            obj.duration_minutes = int(data.get("duration_min") or obj.duration_minutes)
        if "is_active" in data:
            obj.is_active = bool(data.get("is_active"))
        obj.save()

        if category_ids is not None:
            obj.categories.set(Category.objects.filter(id__in=category_ids))

        after = {
            "name": obj.name,
            "price": str(obj.price),
            "duration_minutes": obj.duration_minutes,
            "is_active": obj.is_active,
            "category_ids": list(obj.categories.values_list("id", flat=True)),
        }
        _audit(request, "update", "service", obj.id, obj.name, before=before, after=after)
        return Response({"ok": True})

    def delete(self, request, pk: str):
        kind = request.query_params.get("type", "").strip().lower()
        if kind == "independent":
            obj = BarberService.objects.filter(id=pk).first()
        else:
            obj = Service.objects.filter(id=pk).first()
        if not obj:
            raise NotFound()
        before = {"name": obj.name}
        _audit(request, "delete", "service", obj.id, obj.name, before=before, after={})
        obj.delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)


class AdminFinanceOverviewView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        # MVP: derive from bookings + transactions table
        completed = Booking.objects.filter(status="completed")
        revenue_total = completed.aggregate(s=Sum("total_price"))["s"] or 0
        # Last 7 days buckets
        today = timezone.localdate()
        weekly = []
        for i in range(6, -1, -1):
            d = today - timezone.timedelta(days=i)
            s = completed.filter(start_at__date=d).aggregate(s=Sum("total_price"))["s"] or 0
            weekly.append({"day": d.strftime("%a"), "revenue": float(s)})
        # Top barbers by completed bookings revenue
        top_barbers = (
            completed.values("barber_id", "barber__full_name", "barber__email", "barber__avatar")
            .annotate(rev=Sum("total_price"))
            .order_by("-rev")[:5]
        )
        trows = []
        for r in top_barbers:
            trows.append(
                {
                    "id": str(r["barber_id"] or ""),
                    "name": r["barber__full_name"] or r["barber__email"] or "—",
                    "avatar": "",
                    "revenue": float(r["rev"] or 0),
                }
            )
        return Response(
            {
                "revenue_total": float(revenue_total),
                "revenue_week": float(sum(w["revenue"] for w in weekly)),
                "commission_total": 0,
                "pending_payouts": float(Payout.objects.filter(status=Payout.Status.PENDING).aggregate(s=Sum("amount"))["s"] or 0),
                "weekly": weekly,
                "top_barbers": trows,
            }
        )


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


class AdminPayoutsView(generics.ListAPIView):
    permission_classes = [IsAdmin]
    serializer_class = AdminPayoutSerializer
    queryset = Payout.objects.select_related("barber").all()


class AdminPayoutMarkPaidView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk: int):
        p = Payout.objects.filter(id=pk).first()
        if not p:
            raise NotFound()
        before = {"status": p.status, "amount": str(p.amount)}
        p.status = Payout.Status.PAID
        p.paid_at = timezone.now()
        p.save(update_fields=["status", "paid_at"])
        _audit(request, "update", "payout", p.id, p.period, before=before, after={"status": p.status})
        return Response({"ok": True})


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
