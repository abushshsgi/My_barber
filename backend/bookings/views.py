from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Exists, OuterRef, Q, Sum
from django.db.models.functions import TruncDate
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_utils import customer_catalog_region, is_platform_admin, request_barber
from accounts.models import User
from barbers.activation_permissions import IsAuthenticatedBarberAware
from barbers.barber_auth import BarberPrincipal
from barbers.models import Barber
from bookings.availability import (
    build_available_slots,
    build_month_availability,
    default_salon_barber_and_service,
    default_service_ids_for_barber,
    get_salon_services_for_barber,
    parse_id_list,
)
from bookings.db_compat import (
    bookings_has_check_in_token_column,
    bookings_has_checked_in_column,
    bookings_has_family_member_column,
    booking_queryset_compat,
)
from bookings.datetime_utils import parse_range_datetime
from bookings.models import Booking, BookingCompletion, BookingLine, Review
from bookings.earnings import (
    annotate_earnings_day,
    completed_bookings_qs,
    filter_bookings_by_earnings_period,
    payment_breakdown,
    platform_earnings_qs,
)


def _parse_analytics_datetime(raw: str, *, is_end: bool = False):
    return parse_range_datetime(raw, is_end=is_end)


def _rollup_analytics_periods(daily):
    """Kunlik qatorlardan haftalik/oylik agregat — qo'shimcha DB so'rovisiz."""
    weekly: dict[str, dict] = {}
    monthly: dict[str, dict] = {}

    for row in daily:
        date_str = (row.get("date") or "")[:10]
        if len(date_str) < 10:
            continue
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            continue

        revenue = float(row.get("revenue") or 0)
        cash = float(row.get("cash_revenue") or 0)
        online = float(row.get("online_revenue") or 0)
        bookings = int(row.get("bookings") or 0)
        clients = int(row.get("clients") or 0)

        week_start = dt - timedelta(days=dt.weekday())
        week_key = week_start.isoformat()
        month_key = date_str[:7]

        for bucket, key in ((weekly, week_key), (monthly, month_key)):
            if key not in bucket:
                bucket[key] = {
                    "revenue": 0.0,
                    "cash_revenue": 0.0,
                    "online_revenue": 0.0,
                    "bookings": 0,
                    "clients": 0,
                }
            bucket[key]["revenue"] += revenue
            bucket[key]["cash_revenue"] += cash
            bucket[key]["online_revenue"] += online
            bucket[key]["bookings"] += bookings
            bucket[key]["clients"] += clients

    weekly_out = [
        {
            "week": key,
            "revenue": str(round(values["revenue"], 2)),
            "cash_revenue": str(round(values["cash_revenue"], 2)),
            "online_revenue": str(round(values["online_revenue"], 2)),
            "bookings": values["bookings"],
            "clients": values["clients"],
        }
        for key, values in sorted(weekly.items())
    ]
    monthly_out = [
        {
            "month": key,
            "revenue": str(round(values["revenue"], 2)),
            "cash_revenue": str(round(values["cash_revenue"], 2)),
            "online_revenue": str(round(values["online_revenue"], 2)),
            "bookings": values["bookings"],
            "clients": values["clients"],
        }
        for key, values in sorted(monthly.items())
    ]
    return weekly_out, monthly_out


def _analytics_response_for_bookings(
    bookings,
    *,
    cancelled_count: int,
    prior_bookings_for_customer,
):
    """Barber/salon analitika uchun umumiy javob."""
    revenue = bookings.aggregate(t=Sum("total_price"))["t"] or 0
    clients = bookings.values("customer").distinct().count()

    new_customers = 0
    returning = 0
    for cid in set(bookings.values_list("customer_id", flat=True)):
        prior_count = completed_bookings_qs(prior_bookings_for_customer(cid)).count()
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
        annotate_earnings_day(bookings)
        .values("day")
        .annotate(
            rev=Sum("total_price"),
            cash_rev=Sum(
                "total_price",
                filter=Q(payment_method=Booking.PaymentMethod.CASH),
            ),
            online_rev=Sum(
                "total_price",
                filter=Q(
                    payment_method=Booking.PaymentMethod.ONLINE,
                    payment_status=Booking.PaymentStatus.PAID,
                ),
            ),
            bookings=Count("id"),
            clients=Count("customer", distinct=True),
        )
        .order_by("day")
    )
    daily = [
        {
            "date": row["day"].isoformat() if row["day"] else "",
            "revenue": str(row["rev"] or 0),
            "cash_revenue": str(row["cash_rev"] or 0),
            "online_revenue": str(row["online_rev"] or 0),
            "bookings": row["bookings"] or 0,
            "clients": row["clients"] or 0,
        }
        for row in daily_rows
    ]
    weekly, monthly = _rollup_analytics_periods(daily)
    breakdown = payment_breakdown(bookings)
    return {
        "revenue": str(revenue),
        "cash_total": str(breakdown["cash_total"]),
        "online_total": str(breakdown["online_total"]),
        "total_income": str(breakdown["total_income"]),
        "cash_count": breakdown["cash_count"],
        "online_count": breakdown["online_count"],
        "unique_clients": clients,
        "new_clients": new_customers,
        "returning_clients": returning,
        "top_services": top_services,
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly,
        "completed_count": bookings.count(),
        "cancelled_count": cancelled_count,
    }
from bookings.ws_broadcast import broadcast_booking_updated
from notifications.serializers import NotificationSerializer
from notifications.utils import notify_barber, notify_user
from salons.models import Salon, SalonMembership

from .serializers import (
    BookingCreateSerializer,
    BookingListSerializer,
    BookingSerializer,
    ReviewSerializer,
)


class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedBarberAware]

    def _barber_can_manage_booking(self, request, booking):
        bp = request_barber(request)
        if bp is None:
            return False
        return booking.barber_id == bp.id

    def _booking_data(self, booking, request):
        return BookingSerializer(booking, context={"request": request}).data

    def get_queryset(self):
        action = getattr(self, "action", None)
        if action == "list":
            related = ["customer", "salon", "barber"]
            if bookings_has_family_member_column():
                related.append("family_member")
            base = Booking.objects.select_related(*related).prefetch_related("lines")
            base = booking_queryset_compat(base)
            base = base.annotate(
                _has_review=Exists(Review.objects.filter(booking_id=OuterRef("pk")))
            )
        else:
            related = ["customer", "salon", "barber", "barber__profile", "completion"]
            if bookings_has_family_member_column():
                related.append("family_member")
            base = Booking.objects.select_related(*related).prefetch_related("lines")
            base = booking_queryset_compat(base)
        st = self.request.query_params.get("status")
        if st:
            base = base.filter(status=st)
        if is_platform_admin(self.request):
            return base
        bp = request_barber(self.request)
        if bp is not None:
            return base.filter(barber=bp)
        return base.filter(customer=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return BookingCreateSerializer
        if self.action == "list":
            return BookingListSerializer
        return BookingSerializer

    def create(self, request, *args, **kwargs):
        if isinstance(request.user, BarberPrincipal):
            return Response(
                {"detail": "Bron qilish uchun mijoz ilovasidan (User akkaunt) kiring."},
                status=status.HTTP_403_FORBIDDEN,
            )
        ser = BookingCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        try:
            booking = ser.save()
        except Exception as exc:
            from django.db.utils import ProgrammingError

            if not isinstance(exc, ProgrammingError):
                raise
            from django.core.management import call_command

            from bookings.db_compat import clear_booking_schema_cache

            clear_booking_schema_cache()
            call_command("ensure_booking_checkin_schema", verbosity=0)
            clear_booking_schema_cache()
            booking = ser.save()
        phone = booking.customer_phone or getattr(booking.customer, "phone", None) or ""
        place = (
            booking.salon.name
            if booking.salon_id
            else (booking.barber.full_name or booking.barber.email)
        )
        notify_user(
            booking.customer,
            "booking_pending",
            "Bron so‘rovi yuborildi",
            f"{place}: bron so‘rovingiz sartarosh tasdig‘ini kutmoqda.",
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
        broadcast_booking_updated(booking=booking)
        return Response(
            self._booking_data(booking, request), status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Booking statusini faqat lifecycle actionlar orqali o‘zgartiring."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        booking = self.get_object()
        if not isinstance(request.user, BarberPrincipal):
            try:
                from bookings.checkin_tokens import maybe_issue_check_in_token

                # GET so'rovida migrate chaqirmaymiz — faqat ustun mavjud bo'lsa token beriladi.
                maybe_issue_check_in_token(booking, allow_schema_ensure=False)
            except Exception:
                pass
        return super().retrieve(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {"detail": "Bookingni o‘chirish mumkin emas; bekor qilish actionidan foydalaning."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        booking = self.get_object()
        if not self._barber_can_manage_booking(request, booking):
            return Response(status=403)
        if booking.status != Booking.Status.PENDING:
            return Response({"detail": "Invalid status."}, status=400)
        booking.status = Booking.Status.ACCEPTED
        update_fields = ["status", "updated_at"]
        from bookings.checkin_tokens import checkin_token_update_fields, maybe_issue_check_in_token

        try:
            if maybe_issue_check_in_token(
                booking, persist=False, allow_schema_ensure=True
            ):
                update_fields += checkin_token_update_fields()
        except Exception:
            pass
        booking.save(update_fields=update_fields)
        notify_user(
            booking.customer,
            "booking_accepted",
            "Bron tasdiqlandi",
            f"{booking.salon.name if booking.salon_id else (booking.barber.full_name or booking.barber.email)} broningiz tasdiqlandi.",
            {"booking_id": booking.id},
            send_email=True,
        )
        broadcast_booking_updated(booking=booking)
        return Response(self._booking_data(booking, request))

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        booking = self.get_object()
        if not self._barber_can_manage_booking(request, booking):
            return Response(status=403)
        if booking.status != Booking.Status.PENDING:
            return Response({"detail": "Faqat kutilayotgan bronni rad etish mumkin."}, status=400)
        from bookings.payments import maybe_refund_booking

        maybe_refund_booking(booking)
        booking.status = Booking.Status.REJECTED
        booking.save(update_fields=["status", "updated_at"])
        notify_user(
            booking.customer,
            "booking_rejected",
            "Bron rad etildi",
            "Sartarosh bu bronni rad etdi. Boshqa vaqt yoki sartarosh tanlashingiz mumkin.",
            {"booking_id": booking.id},
        )
        broadcast_booking_updated(booking=booking)
        return Response(self._booking_data(booking, request))

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        is_customer = not isinstance(request.user, BarberPrincipal) and booking.customer_id == request.user.id
        is_barber = self._barber_can_manage_booking(request, booking)
        if not (is_customer or is_barber or is_platform_admin(request)):
            return Response(status=403)
        if booking.status in (Booking.Status.COMPLETED, Booking.Status.CANCELLED, Booking.Status.REJECTED):
            return Response({"detail": "Bu bronni bekor qilib bo‘lmaydi."}, status=400)
        from bookings.payments import maybe_refund_booking

        maybe_refund_booking(booking)
        booking.status = Booking.Status.CANCELLED
        cancel_update_fields = ["status", "updated_at"]
        if bookings_has_check_in_token_column() and booking.check_in_token:
            from bookings.checkin_tokens import clear_check_in_token

            clear_check_in_token(booking)
            cancel_update_fields += ["check_in_token", "check_in_short_code"]
        booking.save(update_fields=cancel_update_fields)
        payload = {"booking_id": booking.id}
        if is_customer:
            notify_barber(
                booking.barber,
                "booking_cancelled",
                "Bron bekor qilindi",
                f"{booking.customer.full_name or booking.customer.email} bronni bekor qildi.",
                payload,
            )
        else:
            notify_user(
                booking.customer,
                "booking_cancelled",
                "Bron bekor qilindi",
                "Bron sartarosh tomonidan bekor qilindi.",
                payload,
            )
        broadcast_booking_updated(booking=booking)
        return Response(self._booking_data(booking, request))

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        booking = self.get_object()
        if not self._barber_can_manage_booking(request, booking):
            return Response(status=403)
        if booking.status != Booking.Status.ACCEPTED:
            return Response({"detail": "Must be accepted."}, status=400)
        if bookings_has_checked_in_column() and not booking.checked_in_at:
            return Response(
                {"detail": "Avval mijoz QR yoki kodini tasdiqlang."},
                status=409,
            )
        now = timezone.now()
        booking.status = Booking.Status.IN_PROGRESS
        booking.started_at = now
        booking.save(update_fields=["status", "started_at", "updated_at"])
        notify_user(
            booking.customer,
            "booking_started",
            "Xizmat boshlandi",
            "Sartarosh booking xizmatini boshladi.",
            {"booking_id": booking.id},
        )
        broadcast_booking_updated(booking=booking)
        return Response(self._booking_data(booking, request))

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        booking = self.get_object()
        if not self._barber_can_manage_booking(request, booking):
            return Response(status=403)
        if booking.status == Booking.Status.ACCEPTED:
            # Check-in qilingan bo'lsagina avtomatik boshlash mumkin (firibgarlik oldini olish).
            if bookings_has_checked_in_column() and not booking.checked_in_at:
                return Response(
                    {"detail": "Avval mijoz QR yoki kodini tasdiqlang."},
                    status=409,
                )
            now = timezone.now()
            booking.status = Booking.Status.IN_PROGRESS
            booking.started_at = now
            booking.save(update_fields=["status", "started_at", "updated_at"])
        if booking.status != Booking.Status.IN_PROGRESS:
            return Response({"detail": "Xizmatni tugatishdan oldin boshlash kerak."}, status=400)
        portfolio_allowed = str(request.data.get("portfolio_allowed", "")).lower() in ("1", "true", "yes")
        if booking.portfolio_consent is True:
            portfolio_allowed = True
        elif booking.portfolio_consent is False:
            portfolio_allowed = False
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
        from bookings.earnings import booking_counts_for_platform_earnings

        if booking_counts_for_platform_earnings(booking):
            try:
                from control_panel.models import FinanceTransaction

                FinanceTransaction.objects.get_or_create(
                    booking=booking,
                    type=FinanceTransaction.Type.BOOKING,
                    defaults={
                        "status": FinanceTransaction.Status.COMPLETED,
                        "amount": booking.total_price,
                        "barber": booking.barber,
                        "related_name": f"Booking #{booking.id}",
                    },
                )
            except Exception:
                pass
        notify_user(
            booking.customer,
            "booking_done",
            "Xizmat yakunlandi",
            "Iltimos, sharh qoldiring.",
            {"booking_id": booking.id},
        )
        broadcast_booking_updated(booking=booking)
        return Response(self._booking_data(booking, request))

    def _mark_checked_in(self, booking):
        """Check-in qiladi va bir martalik tokenni ishlatilgan deb belgilaydi."""
        now = timezone.now()
        booking.checked_in_at = now
        update_fields = ["checked_in_at", "updated_at"]
        if bookings_has_check_in_token_column() and booking.check_in_token:
            from bookings.checkin_tokens import clear_check_in_token

            booking.check_in_token_used_at = now
            clear_check_in_token(booking)
            update_fields += [
                "check_in_token",
                "check_in_short_code",
                "check_in_token_used_at",
            ]
        booking.save(update_fields=update_fields)
        notify_user(
            booking.customer,
            "booking_checked_in",
            "Siz qabul qilindingiz",
            "Sartarosh sizning kelganingizni qayd etdi.",
            {"booking_id": booking.id},
        )
        broadcast_booking_updated(booking=booking)

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        # Qo'lda check-in o'chirildi: firibgarlikni oldini olish uchun faqat mijoz
        # QR kodi yoki bir martalik qisqa kodi orqali check-in qilinadi.
        return Response(
            {
                "detail": "Qo'lda check-in o'chirilgan. Mijoz QR kodi yoki qisqa kodini skaner qiling.",
            },
            status=405,
        )

    @action(detail=False, methods=["post"], url_path="check-in-by-token")
    def check_in_by_token(self, request):
        """Sartarosh QR token yoki qisqa kod orqali mijozni check-in qiladi."""
        bp = request_barber(request)
        if bp is None:
            return Response(
                {"detail": "Faqat sartarosh check-in qila oladi."}, status=403
            )
        if not bookings_has_check_in_token_column():
            return Response(
                {"detail": "Check-in vaqtincha mavjud emas. Birozdan keyin qayta urinib ko'ring."},
                status=503,
            )
        token = (request.data.get("token") or "").strip()
        short_code = (request.data.get("short_code") or "").strip().upper()
        if not token and not short_code:
            return Response(
                {"detail": "QR token yoki qisqa kod kiriting."}, status=400
            )

        qs = Booking.objects.select_related("customer", "salon", "barber")
        if token:
            booking = qs.filter(check_in_token=token).first()
        else:
            booking = qs.filter(
                check_in_short_code=short_code,
                check_in_token__isnull=False,
            ).first()
        if booking is None:
            return Response(
                {"detail": "Kod topilmadi yoki allaqachon ishlatilgan."}, status=404
            )
        if booking.barber_id != bp.id:
            return Response(
                {"detail": "Bu buyurtma sizga tegishli emas."}, status=403
            )
        if booking.check_in_token_used_at or booking.checked_in_at:
            return Response(
                {"detail": "Bu kod allaqachon ishlatilgan."}, status=410
            )
        if booking.status != Booking.Status.ACCEPTED:
            return Response(
                {"detail": "Faqat tasdiqlangan bron uchun check-in."}, status=400
            )
        self._mark_checked_in(booking)
        return Response(self._booking_data(booking, request))

    @action(detail=True, methods=["post"])
    def portfolio_consent(self, request, pk=None):
        booking = self.get_object()
        is_customer = not isinstance(request.user, BarberPrincipal) and booking.customer_id == request.user.id
        if not is_customer:
            return Response(status=403)
        raw = request.data.get("consent")
        if raw is None:
            return Response({"detail": "consent (true/false) majburiy."}, status=400)
        consent = str(raw).lower() in ("1", "true", "yes")
        booking.portfolio_consent = consent
        booking.save(update_fields=["portfolio_consent", "updated_at"])
        notify_barber(
            booking.barber,
            "portfolio_consent",
            "Portfolio ruxsati",
            f"Mijoz portfolio uchun rasmga {'ruxsat berdi' if consent else 'rad etdi'}.",
            {"booking_id": booking.id, "consent": consent},
        )
        broadcast_booking_updated(booking=booking)
        return Response(self._booking_data(booking, request))

    @action(detail=True, methods=["post"], url_path="portfolio_photo")
    def portfolio_photo(self, request, pk=None):
        """Natija rasmini yuklash — sartarosh yoki (ruxsat bergan) mijoz."""
        booking = self.get_object()
        is_barber = isinstance(request.user, BarberPrincipal)
        is_customer = not is_barber and booking.customer_id == request.user.id
        if is_barber:
            if not self._barber_can_manage_booking(request, booking):
                return Response(status=403)
        elif is_customer:
            if booking.portfolio_consent is not True:
                return Response(
                    {"detail": "Avval portfolio uchun ruxsat bering."}, status=400
                )
        else:
            return Response(status=403)
        if booking.status != Booking.Status.COMPLETED:
            return Response(
                {"detail": "Faqat yakunlangan xizmat uchun rasm yuklash mumkin."},
                status=400,
            )
        image = request.FILES.get("image") or request.FILES.get("result_image")
        if image is None:
            return Response({"detail": "Rasm (image) majburiy."}, status=400)
        comp, _ = BookingCompletion.objects.get_or_create(booking=booking)
        comp.result_image = image
        if is_customer:
            comp.portfolio_allowed = True
        comp.save(update_fields=["result_image", "portfolio_allowed"])
        broadcast_booking_updated(booking=booking)
        return Response(self._booking_data(booking, request))


class SalonPortfolioView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, salon_id):
        salon = get_object_or_404(
            Salon.objects.select_related("owner_barber"),
            pk=salon_id,
            is_published=True,
        )
        reg = customer_catalog_region(request)
        if reg:
            ob = salon.owner_barber
            if ob is not None and (ob.region or "").strip() != reg:
                raise Http404()
        comps = (
            BookingCompletion.objects.filter(
                booking__salon_id=salon_id,
                portfolio_allowed=True,
            )
            .exclude(result_image__isnull=True)
            .exclude(result_image="")
            .values("booking_id", "result_image")
        )
        out = []
        for c in comps:
            path = c.get("result_image") or ""
            url = None
            if path:
                from django.core.files.storage import default_storage

                url = request.build_absolute_uri(default_storage.url(path))
            out.append({"image": url, "booking_id": c["booking_id"]})
        return Response(out)


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedBarberAware]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        if self.request.query_params.get("mine") == "1":
            if not self.request.user.is_authenticated:
                return Review.objects.none()
            return Review.objects.filter(author=self.request.user).select_related(
                "author"
            )
        salon = self.request.query_params.get("salon")
        bp = request_barber(self.request)
        if salon and bp is not None:
            # Barber panel: unpublished salon reviews ham ko‘rinsin, lekin faqat
            # owner yoki ACTIVE membership bo‘lsa.
            allowed = (
                Salon.objects.filter(pk=salon, owner_barber=bp).exists()
                or SalonMembership.objects.filter(
                    salon_id=salon,
                    barber=bp,
                    invite_state=SalonMembership.InviteState.ACTIVE,
                ).exists()
            )
            if allowed:
                return (
                    Review.objects.filter(salon_id=salon)
                    .select_related("author", "barber")
                    .order_by("-created_at")
                )

        qs = Review.objects.filter(
            Q(salon__isnull=True) | Q(salon__is_published=True)
        ).select_related("author", "barber")
        if salon:
            qs = qs.filter(salon_id=salon)
        barber = self.request.query_params.get("barber")
        if barber:
            qs = qs.filter(barber_id=barber)
        return qs

    def perform_create(self, serializer):
        review = serializer.save()
        notify_barber(
            review.barber,
            "review_created",
            "Yangi sharh",
            f"{review.author.full_name or review.author.email} {review.rating} yulduzli sharh qoldirdi.",
            {"review_id": review.id, "booking_id": review.booking_id},
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def reply(self, request, pk=None):
        review = self.get_object()
        bp = request_barber(request)
        if bp is None:
            return Response({"detail": "Faqat sartarosh javob bera oladi."}, status=403)
        allowed = review.barber_id == bp.id or (
            review.salon_id and review.salon.owner_barber_id == bp.id
        )
        if not allowed:
            return Response(status=403)
        text = str(request.data.get("reply", "") or "").strip()
        if not text:
            return Response({"detail": "reply majburiy."}, status=400)
        review.barber_reply = text
        review.barber_replied_at = timezone.now()
        review.save(update_fields=["barber_reply", "barber_replied_at"])
        notify_user(
            review.author,
            "review_reply",
            "Sharhingizga javob keldi",
            f"{bp.full_name or bp.email} sharhingizga javob berdi.",
            {"review_id": review.id, "booking_id": review.booking_id},
        )
        return Response(ReviewSerializer(review, context={"request": request}).data)


class SalonClientsView(APIView):
    """Aggregated clients for a salon (completed bookings) with NEW / RETURNING tags."""

    permission_classes = [IsAuthenticatedBarberAware]

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

        def _avatar_url(user):
            if not user.avatar:
                return ""
            url = user.avatar.url
            return request.build_absolute_uri(url)

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
                    "avatar": _avatar_url(u),
                    "completed_bookings": cnt,
                    "total_spent": str(r["spent"] or Decimal("0")),
                    "classification": "new" if cnt == 1 else "returning",
                }
            )
        return Response(out)


class IndependentClientsView(APIView):
    """Aggregated clients for an independent barber (completed bookings where salon is null)."""

    permission_classes = [IsAuthenticatedBarberAware]

    def get(self, request):
        bp = request_barber(request)
        if bp is None:
            return Response(status=403)

        rows = (
            Booking.objects.filter(
                salon__isnull=True,
                barber=bp,
                status=Booking.Status.COMPLETED,
            )
            .values("customer_id")
            .annotate(cnt=Count("id"), spent=Sum("total_price"))
            .order_by("-spent")
        )
        ids = [r["customer_id"] for r in rows]
        users = {u.id: u for u in User.objects.filter(id__in=ids)}

        def _avatar_url(user):
            if not user.avatar:
                return ""
            url = user.avatar.url
            return request.build_absolute_uri(url)

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
                    "avatar": _avatar_url(u),
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
        from barbers.readiness import barber_is_publicly_visible

        if not barber_is_publicly_visible(barber):
            return Response({"slots": [], "detail": "Barber not available."})

        if not SalonMembership.objects.filter(
            barber=barber,
            salon=salon,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).exists():
            return Response({"slots": [], "detail": "Barber not active in this salon."})

        id_list = parse_id_list(service_ids)
        if not id_list:
            return Response({"detail": "service_ids required (comma-separated)."}, status=400)
        if len(id_list) != len(set(id_list)):
            return Response({"detail": "Duplicate service_ids not allowed."}, status=400)

        services = get_salon_services_for_barber(salon, barber, id_list)
        if len(services) != len(set(id_list)):
            return Response(
                {"detail": "Invalid, inactive, or barber-restricted services."},
                status=400,
            )

        return Response(
            build_available_slots(
                barber=barber,
                salon=salon,
                services=services,
                target_date=target_date,
            )
        )


class BookingAvailabilityMonthView(APIView):
    """
    Oylik bandlik kalendari: har bir kun uchun available + slot_count.
    barber yoki service_ids berilmasa — birinchi faol staff va eng qisqa xizmat.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        salon_id = request.query_params.get("salon")
        year_s = request.query_params.get("year")
        month_s = request.query_params.get("month")
        barber_id = request.query_params.get("barber")
        service_ids_raw = request.query_params.get("service_ids", "")

        if not all([salon_id, year_s, month_s]):
            return Response(
                {"detail": "salon, year, and month are required."},
                status=400,
            )
        try:
            year = int(year_s)
            month = int(month_s)
            if month < 1 or month > 12:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"detail": "Invalid year or month."}, status=400)

        salon = get_object_or_404(Salon, pk=salon_id, is_published=True)

        id_list = parse_id_list(service_ids_raw)
        barber = None
        if barber_id:
            barber = get_object_or_404(Barber, pk=barber_id)
            from barbers.readiness import barber_is_publicly_visible

            if not barber_is_publicly_visible(barber):
                return Response({"days": []})
            if not SalonMembership.objects.filter(
                barber=barber,
                salon=salon,
                invite_state=SalonMembership.InviteState.ACTIVE,
            ).exists():
                return Response({"days": []})
            if not id_list:
                id_list = default_service_ids_for_barber(salon, barber)
                if not id_list:
                    return Response({"year": year, "month": month, "days": []})
        else:
            barber, _svc, default_ids = default_salon_barber_and_service(salon)
            if barber is None or not default_ids:
                return Response({"year": year, "month": month, "days": []})
            id_list = default_ids

        payload = build_month_availability(
            salon=salon,
            barber=barber,
            service_ids=id_list,
            year=year,
            month=month,
        )
        if payload is None:
            return Response({"detail": "Invalid or inactive services."}, status=400)
        return Response(payload)


class AnalyticsView(APIView):
    permission_classes = [IsAuthenticatedBarberAware]

    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if not all([start, end]):
            return Response(
                {"detail": "start, end (ISO dates) required."},
                status=400,
            )
        try:
            start_dt = _parse_analytics_datetime(start, is_end=False)
            end_dt = _parse_analytics_datetime(end, is_end=True)
        except ValueError:
            return Response({"detail": "Invalid dates."}, status=400)

        bp = request_barber(request)
        barber_me = (request.query_params.get("barber") or "").lower() in (
            "1",
            "true",
            "yes",
            "me",
        )

        if barber_me:
            if not bp:
                return Response(
                    {"detail": "Barber analitikasi faqat sartarosh JWT bilan."},
                    status=403,
                )
            range_base = Booking.objects.filter(
                barber=bp,
                start_at__gte=start_dt,
                start_at__lte=end_dt,
            )
            bookings = filter_bookings_by_earnings_period(
                completed_bookings_qs(Booking.objects.filter(barber=bp)),
                start_dt,
                end_dt,
            )
            cancelled_count = range_base.filter(status=Booking.Status.CANCELLED).count()

            def prior_for_customer(cid):
                return Booking.objects.filter(
                    barber=bp,
                    customer_id=cid,
                    start_at__lt=start_dt,
                )

            return Response(
                _analytics_response_for_bookings(
                    bookings,
                    cancelled_count=cancelled_count,
                    prior_bookings_for_customer=prior_for_customer,
                )
            )

        independent = (request.query_params.get("independent") or "").lower() in (
            "1",
            "true",
            "yes",
        )

        if independent:
            if not bp:
                return Response(
                    {"detail": "Mustaqil analitika faqat sartarosh JWT bilan."},
                    status=403,
                )
            range_base = Booking.objects.filter(
                barber=bp,
                salon__isnull=True,
                start_at__gte=start_dt,
                start_at__lte=end_dt,
            )
            bookings = completed_bookings_qs(range_base)
            cancelled_count = range_base.filter(status=Booking.Status.CANCELLED).count()

            def prior_for_customer(cid):
                return Booking.objects.filter(
                    barber=bp,
                    salon__isnull=True,
                    customer_id=cid,
                    start_at__lt=start_dt,
                )

            return Response(
                _analytics_response_for_bookings(
                    bookings,
                    cancelled_count=cancelled_count,
                    prior_bookings_for_customer=prior_for_customer,
                )
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

        salon_base = Booking.objects.filter(
            salon_id=salon_id,
            start_at__gte=start_dt,
            start_at__lte=end_dt,
        )
        if bp is not None and bp.id != salon.owner_barber_id:
            salon_base = salon_base.filter(barber=bp)

        bookings = completed_bookings_qs(salon_base)
        cancelled_count = salon_base.filter(status=Booking.Status.CANCELLED).count()

        def prior_for_customer(cid):
            prior_prior = Booking.objects.filter(
                salon_id=salon_id,
                customer_id=cid,
                start_at__lt=start_dt,
            )
            if bp is not None and bp.id != salon.owner_barber_id:
                prior_prior = prior_prior.filter(barber=bp)
            return prior_prior

        return Response(
            _analytics_response_for_bookings(
                bookings,
                cancelled_count=cancelled_count,
                prior_bookings_for_customer=prior_for_customer,
            )
        )


class NotificationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticatedBarberAware]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        from notifications.models import Notification

        u = self.request.user
        if isinstance(u, BarberPrincipal):
            return Notification.objects.filter(barber=u.barber).order_by("-created_at")[:100]
        return Notification.objects.filter(user=u).order_by("-created_at")[:100]


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticatedBarberAware]

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


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticatedBarberAware]

    def post(self, request):
        from notifications.models import Notification

        u = request.user
        now = timezone.now()
        if isinstance(u, BarberPrincipal):
            Notification.objects.filter(barber=u.barber, read_at__isnull=True).update(read_at=now)
        else:
            Notification.objects.filter(user=u, read_at__isnull=True).update(read_at=now)
        return Response({"status": "ok"})
