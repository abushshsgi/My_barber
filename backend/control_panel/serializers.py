from rest_framework import serializers
from django.db.models import Avg, Count, Max, Q, Sum
from django.db.utils import OperationalError, ProgrammingError

from accounts.models import AdminAccount, User
from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberPromotion, BarberService
from bookings.models import Booking, Review
from salons.models import CatalogService, Category, Salon, SalonMembership, Service

from .models import (
    AuditLog,
    BroadcastCampaign,
    FinanceTransaction,
    Payout,
    SupportReply,
    SupportTicket,
)
from salons.serializers import SalonHoursSerializer

from .barber_segments import segment_for_barber, segment_label

_WEEKDAY_ABBREV = ("Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya")


def _weekday_ranges_abbrev(weekdays: list[int]) -> str:
    wds = sorted(set(int(w) for w in weekdays))
    if not wds:
        return ""
    parts: list[str] = []
    i = 0
    while i < len(wds):
        j = i
        while j + 1 < len(wds) and wds[j + 1] == wds[j] + 1:
            j += 1
        if wds[i] == wds[j]:
            parts.append(_WEEKDAY_ABBREV[wds[i]])
        else:
            parts.append(f"{_WEEKDAY_ABBREV[wds[i]]}–{_WEEKDAY_ABBREV[wds[j]]}")
        i = j + 1
    return ", ".join(parts)


def salon_schedule_summary(obj: Salon) -> str:
    hours = list(obj.hours.order_by("weekday"))
    closed = list(obj.closed_weekdays or [])
    if not hours and not closed:
        return ""
    parts: list[str] = []
    if hours:
        o0, c0 = hours[0].open_time, hours[0].close_time
        same_times = all(h.open_time == o0 and h.close_time == c0 for h in hours)
        t = f"{o0.strftime('%H:%M')}–{c0.strftime('%H:%M')}"
        wnums = [h.weekday for h in hours]
        if same_times:
            parts.append(f"{t} ({_weekday_ranges_abbrev(wnums)})")
        else:
            bits = [
                f"{_WEEKDAY_ABBREV[h.weekday]} {h.open_time.strftime('%H:%M')}–{h.close_time.strftime('%H:%M')}"
                for h in hours
            ]
            parts.append("; ".join(bits))
    if closed:
        # Guard against bad data (e.g. 7/-1) so admin stats never 500s.
        valid_closed = [c for c in sorted(closed) if isinstance(c, int) and 0 <= c < len(_WEEKDAY_ABBREV)]
        if valid_closed:
            cnames = ", ".join(_WEEKDAY_ABBREV[c] for c in valid_closed)
            parts.append(f"dam: {cnames}")
    return " · ".join(parts)


class AdminUserSerializer(serializers.ModelSerializer):
    region = serializers.SerializerMethodField()
    region_label = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    location_city = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()
    display_email = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()
    default_address = serializers.SerializerMethodField()
    family_members_count = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "display_email",
            "email_verified",
            "email_verified_at",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "phone",
            "role",
            "region",
            "region_label",
            "latitude",
            "longitude",
            "location_city",
            "birth_year",
            "age",
            "onboarding_completed",
            "is_active",
            "is_staff",
            "date_joined",
            "bookings_count",
            "default_address",
            "family_members_count",
        )
        read_only_fields = (
            "id",
            "date_joined",
            "username",
            "region",
            "region_label",
            "latitude",
            "longitude",
            "location_city",
            "display_email",
            "email_verified",
            "email_verified_at",
            "default_address",
            "family_members_count",
            "age",
            "onboarding_completed",
        )

    def _location_tuple(self, obj: User) -> tuple[str, str, str]:
        from accounts.location_sync import user_location_region

        cache: dict = self.context.setdefault("_user_loc_cache", {})
        prefer_full = bool(self.context.get("prefer_full_region_resolve"))
        key = (obj.pk, prefer_full)
        if key not in cache:
            cache[key] = user_location_region(obj, prefer_full_resolve=prefer_full)
        return cache[key]

    def get_display_email(self, obj: User) -> str | None:
        from accounts.email_utils import is_internal_email

        if is_internal_email(obj.email):
            return None
        return obj.email

    def get_email_verified(self, obj: User) -> bool:
        from accounts.email_utils import is_internal_email

        if is_internal_email(obj.email):
            return False
        return obj.email_verified_at is not None

    def get_default_address(self, obj: User) -> str:
        from accounts.models import UserAddress

        addr = (
            UserAddress.objects.filter(user=obj, is_default=True)
            .order_by("-updated_at")
            .first()
        )
        if addr is None:
            addr = UserAddress.objects.filter(user=obj).order_by("-updated_at").first()
        return (addr.address_line if addr else "") or ""

    def get_family_members_count(self, obj: User) -> int:
        return int(getattr(obj, "family_members_count", obj.family_members.count()))

    def get_region(self, obj: User) -> str:
        code, _, _ = self._location_tuple(obj)
        return code

    def get_region_label(self, obj: User) -> str:
        _, label, _ = self._location_tuple(obj)
        return label

    def get_latitude(self, obj: User) -> str:
        if obj.latitude is None:
            return ""
        return str(obj.latitude)

    def get_longitude(self, obj: User) -> str:
        if obj.longitude is None:
            return ""
        return str(obj.longitude)

    def get_location_city(self, obj: User) -> str:
        _, _, city = self._location_tuple(obj)
        return city

    def get_bookings_count(self, obj: User) -> int:
        return int(getattr(obj, "bookings_count", obj.customer_bookings.count()))

    def get_age(self, obj: User) -> int | None:
        if obj.birth_year is None:
            return None
        from datetime import date

        age = date.today().year - int(obj.birth_year)
        if age < 10 or age > 120:
            return None
        return age


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Hudud mijoz profilidan olinadi — admin o'zgartira olmaydi."""

    class Meta:
        model = User
        fields = ("role", "is_active", "full_name", "phone")

    def validate_role(self, value):
        allowed = {User.Role.USER}
        if value not in allowed:
            raise serializers.ValidationError("Faqat mijoz roliga ruxsat.")
        return value


class AdminUserDetailSerializer(AdminUserSerializer):
    """Mijoz kartochkasi — bronlar, Morph AI, hamyon (faqat o'qish)."""

    signup_method = serializers.SerializerMethodField()
    bookings_summary = serializers.SerializerMethodField()
    recent_bookings = serializers.SerializerMethodField()
    morph_ai = serializers.SerializerMethodField()
    recent_styles = serializers.SerializerMethodField()
    wallet = serializers.SerializerMethodField()
    family_members = serializers.SerializerMethodField()
    booking_regions = serializers.SerializerMethodField()
    sessions = serializers.SerializerMethodField()
    last_client_kind = serializers.SerializerMethodField()
    has_push_token = serializers.SerializerMethodField()

    class Meta(AdminUserSerializer.Meta):
        fields = AdminUserSerializer.Meta.fields + (
            "signup_method",
            "bookings_summary",
            "recent_bookings",
            "morph_ai",
            "recent_styles",
            "wallet",
            "family_members",
            "booking_regions",
            "sessions",
            "last_client_kind",
            "has_push_token",
        )
        read_only_fields = AdminUserSerializer.Meta.read_only_fields + (
            "signup_method",
            "bookings_summary",
            "recent_bookings",
            "morph_ai",
            "recent_styles",
            "wallet",
            "family_members",
            "booking_regions",
            "sessions",
            "last_client_kind",
            "has_push_token",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.context["prefer_full_region_resolve"] = True

    def get_signup_method(self, obj: User) -> str:
        from control_panel.user_signups import detect_signup_method

        return detect_signup_method(obj)

    def get_bookings_summary(self, obj: User):
        qs = Booking.objects.filter(customer=obj)
        total = qs.count()
        by_status = dict(qs.values("status").annotate(c=Count("id")).values_list("status", "c"))
        spent = (
            qs.filter(status=Booking.Status.COMPLETED)
            .aggregate(s=Sum("total_price"))
            .get("s")
        )
        return {
            "total": total,
            "by_status": by_status,
            "spent_completed_uzs": str(spent or 0),
        }

    def get_recent_bookings(self, obj: User):
        rows = (
            Booking.objects.filter(customer=obj)
            .select_related("barber", "salon")
            .prefetch_related("lines")
            .order_by("-created_at")[:20]
        )
        region_labels = dict(UzRegion.choices)
        out = []
        for bk in rows:
            line_list = list(bk.lines.all())[:8]
            svc = ", ".join(el.service_name for el in line_list) if line_list else "—"
            barber = bk.barber
            bname = ""
            bregion = ""
            if barber is not None:
                bname = (barber.full_name or "").strip() or (barber.email or "")
                bregion = region_labels.get(barber.region or "", barber.region or "")
            out.append(
                {
                    "id": bk.id,
                    "barber_name": bname or "—",
                    "salon_name": bk.salon.name if bk.salon_id else "—",
                    "region": getattr(barber, "region", "") or "",
                    "region_label": bregion or "",
                    "start_at": bk.start_at,
                    "status": bk.status,
                    "total_price": str(bk.total_price),
                    "services_preview": svc[:400],
                    "customer_phone": bk.customer_phone or "",
                    "created_at": bk.created_at,
                }
            )
        return out

    def get_booking_regions(self, obj: User):
        """Mijoz bron qilgan hududlar (sartarosh region bo'yicha)."""
        region_labels = dict(UzRegion.choices)
        rows = (
            Booking.objects.filter(customer=obj)
            .exclude(barber__region="")
            .values("barber__region")
            .annotate(c=Count("id"))
            .order_by("-c")
        )
        return [
            {
                "region": r["barber__region"],
                "label": region_labels.get(r["barber__region"], r["barber__region"]),
                "bookings": r["c"],
            }
            for r in rows
            if r["barber__region"]
        ]

    def get_morph_ai(self, obj: User):
        empty = {
            "generations": 0,
            "tryon": 0,
            "analyze": 0,
            "face_check": 0,
            "studio": 0,
            "success": 0,
            "failed": 0,
            "total_tokens": 0,
            "prompt_tokens": 0,
            "candidates_tokens": 0,
            "cost_usd": "0",
            "last_at": None,
        }
        try:
            from ai.models import AiGenerationUsage
        except Exception:
            return empty
        agg = AiGenerationUsage.objects.filter(user=obj).aggregate(
            generations=Count("id"),
            tryon=Count("id", filter=Q(kind=AiGenerationUsage.Kind.TRYON)),
            analyze=Count("id", filter=Q(kind=AiGenerationUsage.Kind.ANALYZE)),
            face_check=Count("id", filter=Q(kind=AiGenerationUsage.Kind.FACE_CHECK)),
            studio=Count("id", filter=Q(kind=AiGenerationUsage.Kind.STUDIO)),
            success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
            failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
            total_tokens=Sum("total_tokens"),
            prompt_tokens=Sum("prompt_tokens"),
            candidates_tokens=Sum("candidates_tokens"),
            cost=Sum("cost_usd"),
            last_at=Max("created_at"),
        )
        return {
            "generations": int(agg["generations"] or 0),
            "tryon": int(agg["tryon"] or 0),
            "analyze": int(agg["analyze"] or 0),
            "face_check": int(agg["face_check"] or 0),
            "studio": int(agg["studio"] or 0),
            "success": int(agg["success"] or 0),
            "failed": int(agg["failed"] or 0),
            "total_tokens": int(agg["total_tokens"] or 0),
            "prompt_tokens": int(agg["prompt_tokens"] or 0),
            "candidates_tokens": int(agg["candidates_tokens"] or 0),
            "cost_usd": str(agg["cost"] or 0),
            "last_at": agg["last_at"],
        }

    def get_recent_styles(self, obj: User):
        out = []
        try:
            from ai.models import AiGenerationUsage, AiStyleHistoryEntry
        except Exception:
            return out

        for row in AiGenerationUsage.objects.filter(user=obj).order_by("-created_at")[:25]:
            out.append(
                {
                    "kind": row.kind,
                    "style_id": row.style_id,
                    "style_title": row.style_title or row.style_id or row.kind,
                    "status": row.status,
                    "created_at": row.created_at,
                    "source": "generation",
                    "total_tokens": row.total_tokens,
                    "prompt_tokens": row.prompt_tokens,
                    "candidates_tokens": row.candidates_tokens,
                    "cost_usd": str(row.cost_usd),
                    "model": row.model,
                    "provider": row.provider,
                    "latency_ms": row.latency_ms,
                    "error_detail": row.error_detail,
                }
            )
        if len(out) < 8:
            for row in AiStyleHistoryEntry.objects.filter(user=obj).order_by("-created_at")[:8]:
                out.append(
                    {
                        "kind": "history",
                        "style_id": row.face_shape_key or "",
                        "style_title": f"{row.face_shape_key or '—'} / {row.hair_type_key or '—'}",
                        "status": "success",
                        "created_at": row.created_at,
                        "source": row.source,
                        "total_tokens": 0,
                        "prompt_tokens": 0,
                        "candidates_tokens": 0,
                        "cost_usd": "0",
                        "model": "",
                        "provider": "",
                        "latency_ms": 0,
                        "error_detail": "",
                    }
                )
        return out[:30]

    def get_wallet(self, obj: User):
        try:
            from wallet.models import LedgerEntry, Wallet
        except Exception:
            return None
        wallet = Wallet.objects.filter(user=obj).first()
        if wallet is None:
            return None
        entries = list(
            LedgerEntry.objects.filter(wallet=wallet).order_by("-created_at")[:10]
        )
        return {
            "wallet_number": wallet.wallet_number,
            "balance": str(wallet.balance),
            "recent_entries": [
                {
                    "id": str(e.id),
                    "entry_type": e.entry_type,
                    "amount": str(e.amount),
                    "balance_after": str(e.balance_after),
                    "created_at": e.created_at,
                }
                for e in entries
            ],
        }

    def get_family_members(self, obj: User):
        from accounts.models import FamilyMember

        return [
            {
                "id": m.id,
                "full_name": m.name or "",
                "relation": m.relation or "",
                "relation_label": m.get_relation_display(),
                "phone": m.phone or "",
            }
            for m in FamilyMember.objects.filter(user=obj).order_by("sort_order", "name", "id")[
                :30
            ]
        ]

    def get_sessions(self, obj: User):
        from accounts.models import UserSession

        rows = UserSession.objects.filter(user=obj).order_by("-last_seen_at", "-id")[:20]
        out = []
        for s in rows:
            out.append(
                {
                    "id": s.id,
                    "device_name": s.device_name or "Noma'lum qurilma",
                    "platform": s.platform or "unknown",
                    "client_kind": s.client_kind or "web",
                    "app_version": s.app_version or "",
                    "ip_address": s.ip_address,
                    "last_seen_at": s.last_seen_at,
                    "created_at": s.created_at,
                    "revoked": bool(s.revoked_at),
                }
            )
        return out

    def get_last_client_kind(self, obj: User) -> str:
        from accounts.models import UserSession

        latest = (
            UserSession.objects.filter(user=obj)
            .order_by("-last_seen_at", "-id")
            .values_list("client_kind", flat=True)
            .first()
        )
        return (latest or "").strip() or "unknown"

    def get_has_push_token(self, obj: User) -> bool:
        try:
            from notifications.models import UserPushToken
        except Exception:
            return False
        return UserPushToken.objects.filter(user=obj).exists()


class AdminSalonListSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner_barber.email", read_only=True)
    owner_name = serializers.CharField(source="owner_barber.full_name", read_only=True)
    owner_phone = serializers.CharField(source="owner_barber.phone", read_only=True, allow_null=True)
    region = serializers.SerializerMethodField()
    region_label = serializers.SerializerMethodField()
    hours = SalonHoursSerializer(many=True, read_only=True)
    schedule_summary = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    barbers_count = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()
    completed_bookings_count = serializers.SerializerMethodField()
    revenue_uzs = serializers.SerializerMethodField()
    favorites_count = serializers.SerializerMethodField()

    class Meta:
        model = Salon
        fields = (
            "id",
            "name",
            "slug",
            "owner_barber",
            "owner_email",
            "owner_name",
            "owner_phone",
            "region",
            "region_label",
            "address",
            "phone",
            "is_published",
            "premium",
            "business_kind",
            "latitude",
            "longitude",
            "created_at",
            "closed_weekdays",
            "hours",
            "schedule_summary",
            "reviews_count",
            "rating",
            "barbers_count",
            "bookings_count",
            "completed_bookings_count",
            "revenue_uzs",
            "favorites_count",
        )
        read_only_fields = (
            "id",
            "slug",
            "owner_barber",
            "created_at",
            "reviews_count",
            "rating",
            "barbers_count",
            "bookings_count",
            "completed_bookings_count",
            "revenue_uzs",
            "favorites_count",
        )

    def get_region(self, obj: Salon) -> str:
        ob = getattr(obj, "owner_barber", None)
        return ob.region if ob and ob.region else ""

    def get_region_label(self, obj: Salon) -> str:
        ob = getattr(obj, "owner_barber", None)
        if not ob or not ob.region:
            return ""
        return dict(UzRegion.choices).get(ob.region, ob.region)

    def get_schedule_summary(self, obj: Salon) -> str:
        return salon_schedule_summary(obj)

    def get_reviews_count(self, obj: Salon) -> int:
        v = getattr(obj, "_reviews_count", None)
        if v is not None:
            return int(v)
        return int(obj.reviews.count())

    def get_rating(self, obj: Salon) -> float:
        v = getattr(obj, "_reviews_avg", None)
        if v is not None:
            return float(v) if v is not None else 0.0
        x = obj.reviews.aggregate(a=Avg("rating")).get("a")
        return float(x) if x is not None else 0.0

    def get_barbers_count(self, obj: Salon) -> int:
        return len(_salon_distinct_barber_ids(obj))

    def get_bookings_count(self, obj: Salon) -> int:
        v = getattr(obj, "_bookings_count", None)
        if v is not None:
            return int(v)
        return int(obj.bookings.count())

    def get_completed_bookings_count(self, obj: Salon) -> int:
        v = getattr(obj, "_completed_bookings_count", None)
        if v is not None:
            return int(v)
        from bookings.models import Booking

        return int(obj.bookings.filter(status=Booking.Status.COMPLETED).count())

    def get_revenue_uzs(self, obj: Salon) -> float:
        v = getattr(obj, "_revenue_uzs", None)
        if v is not None:
            return float(v or 0)
        from bookings.models import Booking
        from django.db.models import Sum

        total = obj.bookings.filter(status=Booking.Status.COMPLETED).aggregate(
            t=Sum("total_price")
        ).get("t")
        return float(total or 0)

    def get_favorites_count(self, obj: Salon) -> int:
        v = getattr(obj, "_favorites_count", None)
        if v is not None:
            return int(v)
        return int(obj.favorited_by.count())


def _salon_distinct_barber_ids(obj: Salon) -> set[int]:
    ids: set[int] = set()
    if obj.owner_barber_id:
        ids.add(obj.owner_barber_id)
    mems = getattr(obj, "_admin_active_memberships", None)
    if mems is not None:
        for m in mems:
            if m.barber_id:
                ids.add(m.barber_id)
        return ids
    for m in obj.memberships.filter(invite_state=SalonMembership.InviteState.ACTIVE).only("barber_id"):
        if m.barber_id:
            ids.add(m.barber_id)
    return ids


class AdminSalonDetailSerializer(AdminSalonListSerializer):
    staff_barbers = serializers.SerializerMethodField()

    class Meta(AdminSalonListSerializer.Meta):
        fields = AdminSalonListSerializer.Meta.fields + ("staff_barbers",)
        read_only_fields = AdminSalonListSerializer.Meta.read_only_fields + ("staff_barbers",)

    def get_staff_barbers(self, obj: Salon) -> list[dict]:
        rows: list[dict] = []
        seen: set[int] = set()
        ob = getattr(obj, "owner_barber", None)
        if ob is not None:
            rows.append(
                {
                    "id": ob.id,
                    "full_name": ob.full_name or "",
                    "email": ob.email,
                    "phone": ob.phone or "",
                    "role": SalonMembership.Role.OWNER,
                    "invite_state": SalonMembership.InviteState.ACTIVE,
                }
            )
            seen.add(ob.id)
        mems = getattr(obj, "_admin_active_memberships", None)
        if mems is None:
            mems = list(
                obj.memberships.filter(invite_state=SalonMembership.InviteState.ACTIVE).select_related(
                    "barber"
                )
            )
        for m in mems:
            if not m.barber_id or m.barber_id in seen:
                continue
            b = m.barber
            if b is None:
                continue
            seen.add(b.id)
            rows.append(
                {
                    "id": b.id,
                    "full_name": b.full_name or "",
                    "email": b.email,
                    "phone": b.phone or "",
                    "role": m.role,
                    "invite_state": m.invite_state,
                }
            )
        return rows


# Back-compat import name
AdminSalonSerializer = AdminSalonListSerializer


class AdminSalonUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salon
        fields = ("is_published", "premium", "name", "address", "phone")


def _active_membership_for_barber(obj: Barber):
    """Prefer prefetched `_admin_memberships_ordered`; else one DB hit."""
    mems = getattr(obj, "_admin_memberships_ordered", None)
    if mems is not None:
        for m in mems:
            if m.invite_state == SalonMembership.InviteState.ACTIVE:
                return m
        return None
    return (
        SalonMembership.objects.filter(
            barber=obj, invite_state=SalonMembership.InviteState.ACTIVE
        )
        .select_related("salon")
        .order_by("-activated_at", "-id")
        .first()
    )


class AdminBarberSerializer(serializers.ModelSerializer):
    region_label = serializers.SerializerMethodField()
    owned_salons_count = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    signup_snapshot = serializers.SerializerMethodField()
    salon_id = serializers.SerializerMethodField()
    salon_name = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    account_segment = serializers.SerializerMethodField()
    account_segment_label = serializers.SerializerMethodField()
    business_kind_label = serializers.SerializerMethodField()

    class Meta:
        model = Barber
        fields = (
            "id",
            "email",
            "username",
            "full_name",
            "phone",
            "region",
            "region_label",
            "latitude",
            "longitude",
            "is_active",
            "date_joined",
            "owned_salons_count",
            "salon_id",
            "salon_name",
            "rating",
            "reviews_count",
            "avatar",
            "work_mode",
            "onboarding_flow",
            "business_kind",
            "business_kind_label",
            "onboarding_completed_at",
            "email_verified_at",
            "signup_snapshot",
            "account_segment",
            "account_segment_label",
        )
        read_only_fields = (
            "id",
            "email",
            "username",
            "date_joined",
            "region_label",
            "latitude",
            "longitude",
            "owned_salons_count",
            "salon_id",
            "salon_name",
            "rating",
            "reviews_count",
            "avatar",
            "work_mode",
            "onboarding_flow",
            "business_kind",
            "business_kind_label",
            "onboarding_completed_at",
            "email_verified_at",
            "signup_snapshot",
            "account_segment",
            "account_segment_label",
        )

    def get_region_label(self, obj: Barber) -> str:
        if not obj.region:
            return ""
        return dict(UzRegion.choices).get(obj.region, obj.region)

    def get_account_segment(self, obj: Barber) -> str:
        return segment_for_barber(obj)

    def get_account_segment_label(self, obj: Barber) -> str:
        return segment_label(segment_for_barber(obj))

    def get_business_kind_label(self, obj: Barber) -> str:
        kind = (obj.business_kind or "").strip()
        return dict(Barber.BusinessKind.choices).get(kind, "") or "Belgilanmagan"

    def get_latitude(self, obj: Barber) -> str:
        p = getattr(obj, "profile", None)
        if p is None or p.latitude is None:
            return ""
        return str(p.latitude)

    def get_longitude(self, obj: Barber) -> str:
        p = getattr(obj, "profile", None)
        if p is None or p.longitude is None:
            return ""
        return str(p.longitude)

    def get_owned_salons_count(self, obj: Barber) -> int:
        return obj.owned_salons.count()

    def get_salon_id(self, obj: Barber):
        sid = getattr(obj, "salon_id", None)
        if sid is not None:
            return sid
        first = obj.owned_salons.only("id").first()
        if first:
            return first.id
        m = _active_membership_for_barber(obj)
        return m.salon_id if m else None

    def get_salon_name(self, obj: Barber):
        sname = getattr(obj, "salon_name", None)
        if sname is not None:
            return sname
        first = obj.owned_salons.only("name").first()
        if first:
            return first.name
        m = _active_membership_for_barber(obj)
        return m.salon.name if m and m.salon else None

    def get_rating(self, obj: Barber) -> float:
        r = getattr(obj, "rating", None)
        if r is not None:
            return float(r)
        val = Review.objects.filter(barber=obj).aggregate(v=Avg("rating")).get("v")
        return float(val or 0.0)

    def get_reviews_count(self, obj: Barber) -> int:
        c = getattr(obj, "reviews_count", None)
        if c is not None:
            return int(c)
        return Review.objects.filter(barber=obj).count()

    def get_avatar(self, obj: Barber) -> str:
        if not obj.avatar:
            return ""
        try:
            return obj.avatar.url
        except Exception:
            return ""

    def get_signup_snapshot(self, obj: Barber):
        snap = getattr(obj, "signup_snapshot", None)
        if not snap:
            return None
        # Keep it simple and explicit; raw_payload is still available.
        return {
            "has_salon": bool(getattr(snap, "has_salon", False)),
            "shop_name": getattr(snap, "shop_name", "") or "",
            "age": getattr(snap, "age", None),
            "address": getattr(snap, "address", "") or "",
            "staff_count_at_signup": getattr(snap, "staff_count_at_signup", None),
            "raw_payload": getattr(snap, "raw_payload", {}) or {},
            "created_at": getattr(snap, "created_at", None),
            "updated_at": getattr(snap, "updated_at", None),
        }


class AdminBarberUpdateSerializer(serializers.ModelSerializer):
    """Hudud sartarosh profilidan olinadi — admin o'zgartira olmaydi."""

    class Meta:
        model = Barber
        fields = ("full_name", "phone", "is_active")


class AdminBarberDetailSerializer(AdminBarberSerializer):
    """Full barber row for admin detail GET (profile, memberships, services)."""

    location_text = serializers.SerializerMethodField()
    spoken_languages = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()
    salon_services = serializers.SerializerMethodField()
    independent_services = serializers.SerializerMethodField()
    owned_salons = serializers.SerializerMethodField()
    bookings_summary = serializers.SerializerMethodField()
    recent_bookings = serializers.SerializerMethodField()
    recent_reviews = serializers.SerializerMethodField()

    class Meta(AdminBarberSerializer.Meta):
        fields = AdminBarberSerializer.Meta.fields + (
            "last_login",
            "location_text",
            "spoken_languages",
            "memberships",
            "salon_services",
            "independent_services",
            "owned_salons",
            "bookings_summary",
            "recent_bookings",
            "recent_reviews",
        )
        read_only_fields = AdminBarberSerializer.Meta.read_only_fields + (
            "last_login",
            "location_text",
            "spoken_languages",
            "memberships",
            "salon_services",
            "independent_services",
            "owned_salons",
            "bookings_summary",
            "recent_bookings",
            "recent_reviews",
        )

    def get_location_text(self, obj: Barber) -> str:
        p = getattr(obj, "profile", None)
        return (p.location_text or "") if p else ""

    def get_spoken_languages(self, obj: Barber):
        p = getattr(obj, "profile", None)
        if not p:
            return []
        return list(p.spoken_languages or [])

    def get_memberships(self, obj: Barber):
        mems = getattr(obj, "_admin_memberships_ordered", None)
        if mems is None:
            mems = list(
                SalonMembership.objects.filter(barber=obj)
                .select_related("salon")
                .order_by("-activated_at", "-id")[:50]
            )
        out = []
        for m in mems[:50]:
            sn = m.salon.name if m.salon else ""
            out.append(
                {
                    "id": m.id,
                    "salon_id": m.salon_id,
                    "salon_name": sn,
                    "role": m.role,
                    "invite_state": m.invite_state,
                    "owner_approved": m.owner_approved,
                    "experience_years": m.experience_years,
                    "activated_at": m.activated_at,
                    "invited_at": m.invited_at,
                }
            )
        return out

    def get_owned_salons(self, obj: Barber):
        out = []
        for s in obj.owned_salons.all():
            out.append(
                {
                    "id": s.id,
                    "name": s.name,
                    "slug": s.slug or "",
                    "address": (s.address or "")[:800],
                    "phone": s.phone or "",
                    "is_published": s.is_published,
                    "latitude": str(s.latitude),
                    "longitude": str(s.longitude),
                }
            )
        return out

    def get_bookings_summary(self, obj: Barber):
        qs = Booking.objects.filter(barber=obj)
        total = qs.count()
        by_status = dict(qs.values("status").annotate(c=Count("id")).values_list("status", "c"))
        rev = (
            qs.filter(status=Booking.Status.COMPLETED)
            .aggregate(s=Sum("total_price"))
            .get("s")
        )
        return {
            "total": total,
            "by_status": by_status,
            "revenue_completed_uzs": str(rev or 0),
        }

    def get_recent_bookings(self, obj: Barber):
        rows = (
            Booking.objects.filter(barber=obj)
            .select_related("customer", "salon")
            .prefetch_related("lines")
            .order_by("-created_at")[:15]
        )
        out = []
        for bk in rows:
            line_list = list(bk.lines.all())[:6]
            svc = ", ".join(el.service_name for el in line_list) if line_list else "—"
            cust = bk.customer
            cname = ""
            if cust is not None:
                cname = (getattr(cust, "full_name", None) or "").strip() or getattr(cust, "email", "") or ""
            out.append(
                {
                    "id": bk.id,
                    "customer_name": cname or "—",
                    "customer_phone": bk.customer_phone or "",
                    "salon_name": bk.salon.name if bk.salon_id else "—",
                    "start_at": bk.start_at,
                    "status": bk.status,
                    "total_price": str(bk.total_price),
                    "services_preview": svc[:400],
                    "created_at": bk.created_at,
                }
            )
        return out

    def get_recent_reviews(self, obj: Barber):
        rows = (
            Review.objects.filter(barber=obj)
            .select_related("author")
            .order_by("-created_at")[:12]
        )
        out = []
        for r in rows:
            auth = r.author
            out.append(
                {
                    "id": r.id,
                    "rating": r.rating,
                    "text": (r.text or "")[:1200],
                    "author_email": auth.email if auth else "",
                    "barber_reply": (r.barber_reply or "")[:500],
                    "barber_replied_at": r.barber_replied_at,
                    "created_at": r.created_at,
                }
            )
        return out

    def get_salon_services(self, obj: Barber):
        salon_ids: set[int] = set()
        for s in obj.owned_salons.all():
            salon_ids.add(s.id)
        mems = getattr(obj, "_admin_memberships_ordered", None)
        if mems is not None:
            for m in mems:
                salon_ids.add(m.salon_id)
        else:
            salon_ids.update(
                SalonMembership.objects.filter(barber=obj).values_list("salon_id", flat=True)
            )
        if not salon_ids:
            return []
        rows = (
            Service.objects.filter(salon_id__in=salon_ids)
            .select_related("salon")
            .order_by("salon_id", "name")
        )
        return [
            {
                "id": svc.id,
                "salon_id": svc.salon_id,
                "salon_name": svc.salon.name if svc.salon else "",
                "name": svc.name,
                "price": str(svc.price),
                "duration_minutes": svc.duration_minutes,
                "is_active": svc.is_active,
                "barber_id": svc.barber_id,
            }
            for svc in rows
        ]

    def get_independent_services(self, obj: Barber):
        p = getattr(obj, "profile", None)
        if not p:
            return []
        return [
            {
                "id": s.id,
                "name": s.name,
                "price": str(s.price),
                "duration_minutes": s.duration_minutes,
                "is_active": s.is_active,
            }
            for s in BarberService.objects.filter(profile=p).order_by("name")
        ]


class AdminReviewListSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)
    barber_email = serializers.EmailField(source="barber.email", read_only=True)
    barber_id = serializers.IntegerField(source="barber.id", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "booking",
            "rating",
            "text",
            "photo",
            "created_at",
            "author_email",
            "barber_email",
            "barber_id",
        )


class AdminCategorySerializer(serializers.ModelSerializer):
    services_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "icon",
            "order",
            "is_active",
            "for_barbershop",
            "for_beauty_salon",
            "services_count",
        )

    def get_services_count(self, obj: Category) -> int:
        try:
            return obj.services.count() + obj.barber_services.count() + obj.catalog_services.count()
        except (OperationalError, ProgrammingError):
            return 0


class AdminCategoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("name", "icon", "order", "is_active", "for_barbershop", "for_beauty_salon")


class AdminCatalogServiceSerializer(serializers.ModelSerializer):
    category_ids = serializers.SerializerMethodField()
    category_names = serializers.SerializerMethodField()
    linked_rows_count = serializers.SerializerMethodField()

    class Meta:
        model = CatalogService
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "image_url",
            "duration_minutes",
            "is_active",
            "sort_order",
            "for_barbershop",
            "for_beauty_salon",
            "category_ids",
            "category_names",
            "linked_rows_count",
        )

    def get_category_ids(self, obj: CatalogService) -> list[int]:
        try:
            return list(obj.categories.values_list("id", flat=True))
        except (OperationalError, ProgrammingError):
            return []

    def get_category_names(self, obj: CatalogService) -> list[str]:
        try:
            return list(obj.categories.order_by("order", "name").values_list("name", flat=True))
        except (OperationalError, ProgrammingError):
            return []

    def get_linked_rows_count(self, obj: CatalogService) -> int:
        try:
            return obj.assigned_salon_services.count() + obj.assigned_barber_services.count()
        except (OperationalError, ProgrammingError):
            return 0


class AdminCatalogServiceWriteSerializer(serializers.ModelSerializer):
    category_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        write_only=True,
    )

    class Meta:
        model = CatalogService
        fields = (
            "name",
            "description",
            "image_url",
            "duration_minutes",
            "is_active",
            "sort_order",
            "for_barbershop",
            "for_beauty_salon",
            "category_ids",
        )

    def validate_name(self, value):
        name = str(value or "").strip()
        if not name:
            raise serializers.ValidationError("Xizmat nomi majburiy.")
        return name

    def validate_duration_minutes(self, value):
        if value < 5 or value > 480:
            raise serializers.ValidationError("Davomiylik 5 va 480 daqiqa oralig'ida bo'lishi kerak.")
        return value


class AdminServiceListSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.CharField()
    name = serializers.CharField()
    category_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    category_names = serializers.CharField()
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    duration_min = serializers.IntegerField()
    bookings_count = serializers.IntegerField()
    is_active = serializers.BooleanField()


class AdminAuditLogSerializer(serializers.ModelSerializer):
    admin = serializers.CharField(source="admin.email", read_only=True)
    admin_name = serializers.SerializerMethodField()
    admin_avatar = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "admin",
            "admin_name",
            "action",
            "target_type",
            "target_id",
            "target_name",
            "before_json",
            "after_json",
            "ip",
            "user_agent",
            "created_at",
            "admin_avatar",
        )

    def get_admin_name(self, obj: AuditLog) -> str:
        admin = getattr(obj, "admin", None)
        if not admin:
            return ""
        return (getattr(admin, "email", None) or "")[:120]

    def get_admin_avatar(self, obj: AuditLog) -> str:
        return ""


class AdminFinanceTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceTransaction
        fields = ("id", "type", "status", "amount", "related_name", "created_at")


class AdminPayoutSerializer(serializers.ModelSerializer):
    barber_id = serializers.IntegerField(read_only=True)
    barber_name = serializers.SerializerMethodField()
    barber_phone = serializers.CharField(source="barber.phone", read_only=True, allow_null=True)
    barber_avatar = serializers.SerializerMethodField()
    payout_holder_name = serializers.SerializerMethodField()
    payout_bank_name = serializers.SerializerMethodField()
    payout_account_last4 = serializers.SerializerMethodField()

    class Meta:
        model = Payout
        fields = (
            "id",
            "barber_id",
            "barber_name",
            "barber_phone",
            "barber_avatar",
            "period",
            "amount",
            "status",
            "reference",
            "payout_holder_name",
            "payout_bank_name",
            "payout_account_last4",
            "created_at",
            "paid_at",
        )

    def get_barber_name(self, obj: Payout) -> str:
        b = obj.barber
        return (b.full_name or b.phone or b.email or str(b.pk)).strip()

    def get_barber_avatar(self, obj: Payout) -> str:
        b = obj.barber
        if not b.avatar:
            return ""
        try:
            return b.avatar.url
        except Exception:
            return ""

    def _settings(self, obj: Payout):
        try:
            return obj.barber.settings
        except Exception:
            return None

    def get_payout_holder_name(self, obj: Payout) -> str:
        s = self._settings(obj)
        return (s.payout_holder_name if s else "") or ""

    def get_payout_bank_name(self, obj: Payout) -> str:
        s = self._settings(obj)
        return (s.payout_bank_name if s else "") or ""

    def get_payout_account_last4(self, obj: Payout) -> str:
        s = self._settings(obj)
        return (s.payout_account_last4 if s else "") or ""


class AdminBarberPromotionSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source="barber.full_name", read_only=True)
    barber_email = serializers.CharField(source="barber.email", read_only=True)
    barber_avatar = serializers.SerializerMethodField()
    package_label = serializers.SerializerMethodField()

    class Meta:
        model = BarberPromotion
        fields = (
            "id",
            "barber_name",
            "barber_email",
            "barber_avatar",
            "promotion_type",
            "status",
            "starts_at",
            "ends_at",
            "amount_paid",
            "region",
            "notes",
            "package_label",
            "created_at",
        )

    def get_barber_avatar(self, obj: BarberPromotion) -> str:
        b = obj.barber
        if not b.avatar:
            return ""
        try:
            return b.avatar.url
        except Exception:
            return ""

    def get_package_label(self, obj: BarberPromotion) -> str:
        notes = (obj.notes or "").strip()
        if notes.startswith("package="):
            key = notes.split("=", 1)[-1]
            return {"week": "1 hafta TOP", "month": "1 oy TOP"}.get(key, key)
        return "TOP listing"


class AdminSupportTicketSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.SerializerMethodField()
    assignee = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "subject",
            "status",
            "priority",
            "category",
            "related_type",
            "related_id",
            "unread",
            "user_name",
            "user_avatar",
            "assignee",
            "updated_at",
        )

    def get_user_name(self, obj: SupportTicket) -> str:
        if obj.created_by_user:
            return obj.created_by_user.full_name or obj.created_by_user.email
        if obj.created_by_barber:
            return obj.created_by_barber.full_name or obj.created_by_barber.email
        return "—"

    def get_user_avatar(self, obj: SupportTicket) -> str:
        who = obj.created_by_user or obj.created_by_barber
        if not who or not getattr(who, "avatar", None):
            return ""
        try:
            return who.avatar.url
        except Exception:
            return ""

    def get_assignee(self, obj: SupportTicket) -> str:
        return obj.assignee.email if obj.assignee else ""


class AdminSupportTicketDetailSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "subject",
            "body",
            "category",
            "status",
            "priority",
            "related_type",
            "related_id",
            "assignee",
            "user_name",
            "created_at",
            "updated_at",
        )

    def get_user_name(self, obj: SupportTicket) -> str:
        if obj.created_by_user:
            return obj.created_by_user.full_name or obj.created_by_user.email
        if obj.created_by_barber:
            return obj.created_by_barber.full_name or obj.created_by_barber.email
        return "—"


class AdminSupportReplySerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author_name", read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = SupportReply
        fields = ("id", "author_role", "author", "avatar", "body", "created_at")

    def get_avatar(self, obj: SupportReply) -> str:
        return ""


class AdminBroadcastCampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = BroadcastCampaign
        fields = (
            "id",
            "audience",
            "channel",
            "title",
            "body",
            "sent_count",
            "read_count",
            "created_at",
        )


class AdminAccountSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = AdminAccount
        fields = ("id", "name", "email", "role", "is_active", "created_at", "last_login", "avatar")

    def get_avatar(self, obj: AdminAccount) -> str:
        return ""

    def get_name(self, obj: AdminAccount) -> str:
        return obj.email.split("@")[0]

    def get_role(self, obj: AdminAccount) -> str:
        return "superadmin"


class AdminAccountWriteSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = AdminAccount
        fields = ("email", "password", "is_active")

    def create(self, validated_data):
        pw = validated_data.pop("password")
        obj = AdminAccount(**validated_data)
        obj.set_password(pw)
        obj.save()
        return obj
