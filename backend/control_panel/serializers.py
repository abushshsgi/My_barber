from rest_framework import serializers
from django.db.models import Avg, Count, Sum

from accounts.models import AdminAccount, User
from accounts.uz_regions import UzRegion
from barbers.models import Barber, BarberService
from bookings.models import Booking, Review
from salons.models import Category, Salon, SalonMembership, Service

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
    region_label = serializers.SerializerMethodField()
    bookings_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "full_name",
            "phone",
            "role",
            "region",
            "region_label",
            "is_active",
            "is_staff",
            "date_joined",
            "bookings_count",
        )
        read_only_fields = ("id", "date_joined", "username", "region_label")

    def get_region_label(self, obj: User) -> str:
        if not obj.region:
            return ""
        return dict(UzRegion.choices).get(obj.region, obj.region)

    def get_bookings_count(self, obj: User) -> int:
        return int(getattr(obj, "bookings_count", obj.customer_bookings.count()))


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("role", "is_active", "full_name", "phone", "region")

    def validate_role(self, value):
        allowed = {User.Role.USER}
        if value not in allowed:
            raise serializers.ValidationError("Faqat mijoz roliga ruxsat.")
        return value

    def validate_region(self, value):
        if value in (None, ""):
            return ""
        allowed = {c[0] for c in UzRegion.choices}
        if value not in allowed:
            raise serializers.ValidationError("Noto'g'ri viloyat.")
        return value


class AdminSalonListSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner_barber.email", read_only=True)
    owner_name = serializers.CharField(source="owner_barber.full_name", read_only=True)
    region = serializers.SerializerMethodField()
    region_label = serializers.SerializerMethodField()
    hours = SalonHoursSerializer(many=True, read_only=True)
    schedule_summary = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    barbers_count = serializers.SerializerMethodField()

    class Meta:
        model = Salon
        fields = (
            "id",
            "name",
            "slug",
            "owner_barber",
            "owner_email",
            "owner_name",
            "region",
            "region_label",
            "address",
            "phone",
            "is_published",
            "premium",
            "latitude",
            "longitude",
            "created_at",
            "closed_weekdays",
            "hours",
            "schedule_summary",
            "reviews_count",
            "rating",
            "barbers_count",
        )
        read_only_fields = (
            "id",
            "slug",
            "owner_barber",
            "created_at",
            "reviews_count",
            "rating",
            "barbers_count",
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
    class Meta:
        model = Barber
        fields = ("full_name", "phone", "region", "is_active")

    def validate_region(self, value):
        if value in (None, ""):
            return ""
        allowed = {c[0] for c in UzRegion.choices}
        if value not in allowed:
            raise serializers.ValidationError("Noto'g'ri viloyat.")
        return value


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
        fields = ("id", "name", "icon", "order", "is_active", "services_count")

    def get_services_count(self, obj: Category) -> int:
        return obj.services.count() + obj.barber_services.count()


class AdminCategoryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("name", "icon", "order", "is_active")


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
    admin_avatar = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "admin",
            "action",
            "target_type",
            "target_id",
            "target_name",
            "ip",
            "created_at",
            "admin_avatar",
        )

    def get_admin_avatar(self, obj: AuditLog) -> str:
        return ""


class AdminFinanceTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceTransaction
        fields = ("id", "type", "status", "amount", "related_name", "created_at")


class AdminPayoutSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source="barber.full_name", read_only=True)
    barber_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Payout
        fields = ("id", "barber_name", "barber_avatar", "period", "amount", "status", "created_at")

    def get_barber_avatar(self, obj: Payout) -> str:
        b = obj.barber
        if not b.avatar:
            return ""
        try:
            return b.avatar.url
        except Exception:
            return ""


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
