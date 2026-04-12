from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_utils import is_platform_admin, request_barber
from accounts.models import User
from barbers.barber_auth import BarberPrincipal
from barbers.models import Barber
from bookings.models import Booking, BookingCompletion, BookingLine, Review
from notifications.serializers import NotificationSerializer
from notifications.utils import notify_barber, notify_user
from salons.models import BarberWorkingHours, Salon, SalonHours, SalonMembership, Service

from .serializers import (
    BookingCreateSerializer,
    BookingSerializer,
    ReviewSerializer,
)


class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        base = Booking.objects.select_related("customer", "salon", "barber").prefetch_related(
            "lines"
        )
        st = self.request.query_params.get("status")
        if st:
            base = base.filter(status=st)
        if is_platform_admin(self.request):
            return base
        bp = request_barber(self.request)
        if bp is not None:
            return base.filter(Q(barber=bp) | Q(salon__owner_barber=bp))
        return base.filter(customer=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        return BookingSerializer

    def create(self, request, *args, **kwargs):
        if isinstance(request.user, BarberPrincipal):
            return Response(
                {"detail": "Bron qilish uchun mijoz ilovasidan (User akkaunt) kiring."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = BookingCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        booking = ser.save()
        phone = booking.customer_phone or getattr(booking.customer, "phone", None) or ""
        place = (
            booking.salon.name
            if booking.salon_id
            else (booking.barber.full_name or booking.barber.email)
        )
        notify_user(
            booking.customer,
            "booking_accepted",
            "Bron tasdiqlandi",
            f"{place}: broningiz darhol tasdiqlandi.",
            {"booking_id": booking.id},
            send_email=False,
        )
        notify_barber(
            booking.barber,
            "new_booking",
            "Yangi bron",
            f"{booking.customer.full_name or booking.customer.email} bron qildi. Tel: {phone or '—'}",
            {"booking_id": booking.id, "customer_phone": phone},
        )
        return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        booking = self.get_object()
        bp = request_barber(request)
        if bp is None:
            return Response(status=403)
        if booking.barber_id != bp.id and booking.salon_id and booking.salon.owner_barber_id != bp.id:
            return Response(status=403)
        if booking.status != Booking.Status.PENDING:
            return Response({"detail": "Invalid status."}, status=400)
        booking.status = Booking.Status.ACCEPTED
        booking.save(update_fields=["status", "updated_at"])
        notify_user(
            booking.customer,
            "booking_accepted",
            "Bron tasdiqlandi",
            f"{booking.salon.name if booking.salon_id else (booking.barber.full_name or booking.barber.email)} broningiz tasdiqlandi.",
            send_email=True,
        )
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        booking = self.get_object()
        bp = request_barber(request)
        if bp is None:
            return Response(status=403)
        if booking.barber_id != bp.id and booking.salon_id and booking.salon.owner_barber_id != bp.id:
            return Response(status=403)
        booking.status = Booking.Status.REJECTED
        booking.save(update_fields=["status", "updated_at"])
        notify_user(booking.customer, "booking_rejected", "Bron rad etildi", "")
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        booking = self.get_object()
        bp = request_barber(request)
        if bp is None or booking.barber_id != bp.id:
            return Response(status=403)
        if booking.status != Booking.Status.ACCEPTED:
            return Response({"detail": "Must be accepted."}, status=400)
        now = timezone.now()
        booking.status = Booking.Status.IN_PROGRESS
        booking.started_at = now
        booking.save(update_fields=["status", "started_at", "updated_at"])
        return Response(BookingSerializer(booking).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        booking = self.get_object()
        bp = request_barber(request)
        if bp is None or booking.barber_id != bp.id:
            return Response(status=403)
        if booking.status not in (
            Booking.Status.ACCEPTED,
            Booking.Status.IN_PROGRESS,
        ):
            return Response({"detail": "Invalid status."}, status=400)
        portfolio_allowed = request.data.get("portfolio_allowed", False)
        early_finish = str(request.data.get("early_finish", "")).lower() in ("1", "true", "yes")
        actual_end = timezone.now()
        if not early_finish:
            actual_end = booking.end_at
        comp_defaults = {
            "portfolio_allowed": bool(portfolio_allowed),
            "actual_end_at": actual_end,
        }
        if request.FILES.get("result_image"):
            comp_defaults["result_image"] = request.FILES["result_image"]
        booking.status = Booking.Status.COMPLETED
        if early_finish:
            booking.end_at = actual_end
        booking.save(update_fields=["status", "end_at", "updated_at"])
        BookingCompletion.objects.update_or_create(booking=booking, defaults=comp_defaults)
        notify_user(
            booking.customer,
            "booking_done",
            "Xizmat yakunlandi",
            "Iltimos, sharh qoldiring.",
            {"booking_id": booking.id},
        )
        return Response(BookingSerializer(booking).data)


class SalonPortfolioView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, salon_id):
        salon = get_object_or_404(Salon, pk=salon_id, is_published=True)
        comps = BookingCompletion.objects.filter(
            booking__salon=salon,
            portfolio_allowed=True,
            result_image__isnull=False,
        ).select_related("booking")
        out = []
        for c in comps:
            url = None
            if c.result_image:
                url = request.build_absolute_uri(c.result_image.url)
            out.append({"image": url, "booking_id": c.booking_id})
        return Response(out)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.query_params.get("mine") == "1":
            if not self.request.user.is_authenticated:
                return Review.objects.none()
            return Review.objects.filter(author=self.request.user).select_related(
                "author"
            )
        qs = Review.objects.filter(
            Q(salon__isnull=True) | Q(salon__is_published=True)
        ).select_related("author", "barber")
        salon = self.request.query_params.get("salon")
        if salon:
            qs = qs.filter(salon_id=salon)
        barber = self.request.query_params.get("barber")
        if barber:
            qs = qs.filter(barber_id=barber)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return super().get_permissions()


class SalonClientsView(APIView):
    """Aggregated clients for a salon (completed bookings) with NEW / RETURNING tags."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        salon_id = request.query_params.get("salon")
        if not salon_id:
            return Response({"detail": "salon query parameter required."}, status=400)
        salon = get_object_or_404(Salon, pk=salon_id)
        bp = request_barber(request)
        if is_platform_admin(request):
            pass
        elif bp is not None and bp.id == salon.owner_barber_id:
            pass
        elif bp is not None and SalonMembership.objects.filter(
            barber=bp,
            salon=salon,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).exists():
            pass
        else:
            return Response(status=403)

        rows = (
            Booking.objects.filter(salon=salon, status=Booking.Status.COMPLETED)
            .values("customer_id")
            .annotate(cnt=Count("id"), spent=Sum("total_price"))
            .order_by("-spent")
        )
        ids = [r["customer_id"] for r in rows]
        users = {u.id: u for u in User.objects.filter(id__in=ids)}
        out = []
        for r in rows:
            cid = r["customer_id"]
            u = users.get(cid)
            if not u:
                continue
            cnt = r["cnt"]
            out.append(
                {
                    "id": cid,
                    "full_name": u.full_name or u.email,
                    "email": u.email,
                    "phone": u.phone or "",
                    "completed_bookings": cnt,
                    "total_spent": str(r["spent"] or Decimal("0")),
                    "classification": "new" if cnt == 1 else "returning",
                }
            )
        return Response(out)


class BookingAvailabilityView(APIView):
    """
    Available start times for a barber at a salon on a given date.
    Respects salon hours, barber working hours, closed days, and existing bookings.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        salon_id = request.query_params.get("salon")
        barber_id = request.query_params.get("barber")
        date_s = request.query_params.get("date")
        service_ids = request.query_params.get("service_ids", "")
        if not all([salon_id, barber_id, date_s]):
            return Response(
                {"detail": "salon, barber, and date (YYYY-MM-DD) are required."},
                status=400,
            )
        try:
            target_date = datetime.fromisoformat(date_s).date()
        except ValueError:
            return Response({"detail": "Invalid date."}, status=400)

        salon = get_object_or_404(Salon, pk=salon_id, is_published=True)
        barber = get_object_or_404(Barber, pk=barber_id)

        if not SalonMembership.objects.filter(
            barber=barber,
            salon=salon,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).exists():
            return Response({"slots": [], "detail": "Barber not active in this salon."})

        id_list = [int(x) for x in service_ids.split(",") if x.strip().isdigit()]
        if not id_list:
            return Response({"detail": "service_ids required (comma-separated)."}, status=400)
        if len(id_list) != len(set(id_list)):
            return Response({"detail": "Duplicate service_ids not allowed."}, status=400)

        services = list(
            Service.objects.filter(id__in=id_list, salon=salon, is_active=True)
        )
        if len(services) != len(set(id_list)):
            return Response({"detail": "Invalid or inactive services."}, status=400)

        total_minutes = sum(s.duration_minutes for s in services)
        weekday = target_date.weekday()
        closed = salon.closed_weekdays or []
        if isinstance(closed, list) and weekday in closed:
            return Response({"slots": []})

        sh = SalonHours.objects.filter(salon=salon, weekday=weekday).first()
        if not sh:
            return Response({"slots": []})

        mem = SalonMembership.objects.filter(
            barber=barber,
            salon=salon,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).first()
        open_t = sh.open_time
        close_t = sh.close_time
        if mem:
            bh = BarberWorkingHours.objects.filter(
                membership=mem, weekday=weekday
            ).first()
            if bh and bh.is_day_off:
                return Response({"slots": []})
            if bh:
                open_t = max(open_t, bh.open_time)
                close_t = min(close_t, bh.close_time)
        if open_t >= close_t:
            return Response({"slots": []})

        tz = timezone.get_current_timezone()
        slot_step = 15
        slots = []
        day_start = timezone.make_aware(datetime.combine(target_date, open_t), tz)
        day_end = timezone.make_aware(datetime.combine(target_date, close_t), tz)

        t = day_start
        now = timezone.now()
        while t + timedelta(minutes=total_minutes) <= day_end:
            if t < now:
                t += timedelta(minutes=slot_step)
                continue
            end_slot = t + timedelta(minutes=total_minutes)
            overlap = Booking.objects.filter(
                barber=barber,
                status__in=[
                    Booking.Status.PENDING,
                    Booking.Status.ACCEPTED,
                    Booking.Status.IN_PROGRESS,
                ],
                start_at__lt=end_slot,
                end_at__gt=t,
            ).exists()
            if not overlap:
                slots.append(t.strftime("%H:%M"))
            t += timedelta(minutes=slot_step)

        return Response({"slots": slots, "total_minutes": total_minutes})


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if not all([start, end]):
            return Response(
                {"detail": "start, end (ISO dates) required."},
                status=400,
            )
        try:
            start_dt = timezone.datetime.fromisoformat(start.replace("Z", "+00:00"))
            end_dt = timezone.datetime.fromisoformat(end.replace("Z", "+00:00"))
            if timezone.is_naive(start_dt):
                start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())
            if timezone.is_naive(end_dt):
                end_dt = timezone.make_aware(end_dt, timezone.get_current_timezone())
        except ValueError:
            return Response({"detail": "Invalid dates."}, status=400)

        independent = (request.query_params.get("independent") or "").lower() in (
            "1",
            "true",
            "yes",
        )
        bp = request_barber(request)

        if independent:
            if not bp:
                return Response(
                    {"detail": "Mustaqil analitika faqat sartarosh JWT bilan."},
                    status=403,
                )
            bookings = Booking.objects.filter(
                barber=bp,
                salon__isnull=True,
                status=Booking.Status.COMPLETED,
                start_at__gte=start_dt,
                start_at__lte=end_dt,
            )
            revenue = bookings.aggregate(t=Sum("total_price"))["t"] or 0
            clients = bookings.values("customer").distinct().count()

            new_customers = 0
            returning = 0
            for cid in set(bookings.values_list("customer_id", flat=True)):
                prior_count = Booking.objects.filter(
                    barber=bp,
                    salon__isnull=True,
                    customer_id=cid,
                    status=Booking.Status.COMPLETED,
                    start_at__lt=start_dt,
                ).count()
                if prior_count == 0:
                    new_customers += 1
                else:
                    returning += 1

            top_services = list(
                BookingLine.objects.filter(booking__in=bookings)
                .values("service_name")
                .annotate(cnt=Count("id"))
                .order_by("-cnt")[:5]
            )

            daily_rows = (
                bookings.annotate(day=TruncDate("start_at"))
                .values("day")
                .annotate(rev=Sum("total_price"))
                .order_by("day")
            )
            daily = [
                {
                    "date": row["day"].isoformat() if row["day"] else "",
                    "revenue": str(row["rev"] or 0),
                }
                for row in daily_rows
            ]

            return Response(
                {
                    "revenue": str(revenue),
                    "unique_clients": clients,
                    "new_clients": new_customers,
                    "returning_clients": returning,
                    "top_services": top_services,
                    "daily": daily,
                }
            )

        salon_id = request.query_params.get("salon")
        if not salon_id:
            return Response(
                {"detail": "salon, start, end (ISO dates) required."},
                status=400,
            )

        salon = Salon.objects.filter(pk=salon_id).first()
        if not salon:
            return Response(status=404)
        if is_platform_admin(request):
            allowed = True
        elif bp is not None and bp.id == salon.owner_barber_id:
            allowed = True
        elif bp is not None and SalonMembership.objects.filter(
            barber=bp,
            salon=salon,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).exists():
            allowed = True
        else:
            allowed = False
        if not allowed:
            return Response(status=403)

        bookings = Booking.objects.filter(
            salon_id=salon_id,
            status=Booking.Status.COMPLETED,
            start_at__gte=start_dt,
            start_at__lte=end_dt,
        )
        revenue = bookings.aggregate(t=Sum("total_price"))["t"] or 0
        clients = bookings.values("customer").distinct().count()

        new_customers = 0
        returning = 0
        for cid in set(bookings.values_list("customer_id", flat=True)):
            prior_count = Booking.objects.filter(
                salon_id=salon_id,
                customer_id=cid,
                status=Booking.Status.COMPLETED,
                start_at__lt=start_dt,
            ).count()
            if prior_count == 0:
                new_customers += 1
            else:
                returning += 1

        top_services = list(
            BookingLine.objects.filter(booking__in=bookings)
            .values("service_name")
            .annotate(cnt=Count("id"))
            .order_by("-cnt")[:5]
        )

        daily_rows = (
            bookings.annotate(day=TruncDate("start_at"))
            .values("day")
            .annotate(rev=Sum("total_price"))
            .order_by("day")
        )
        daily = [
            {
                "date": row["day"].isoformat() if row["day"] else "",
                "revenue": str(row["rev"] or 0),
            }
            for row in daily_rows
        ]

        return Response(
            {
                "revenue": str(revenue),
                "unique_clients": clients,
                "new_clients": new_customers,
                "returning_clients": returning,
                "top_services": top_services,
                "daily": daily,
            }
        )


class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        from notifications.models import Notification

        u = self.request.user
        if isinstance(u, BarberPrincipal):
            return Notification.objects.filter(barber=u.barber).order_by("-created_at")[:100]
        return Notification.objects.filter(user=u).order_by("-created_at")[:100]


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from notifications.models import Notification

        u = request.user
        if isinstance(u, BarberPrincipal):
            n = get_object_or_404(Notification, pk=pk, barber=u.barber)
        else:
            n = get_object_or_404(Notification, pk=pk, user=u)
        n.read_at = timezone.now()
        n.save(update_fields=["read_at"])
        return Response({"status": "ok"})
