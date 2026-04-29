from rest_framework import serializers
from django.db.models import Avg

from accounts.models import AdminAccount, User
from accounts.uz_regions import UzRegion
from barbers.models import Barber
from bookings.models import Review
from salons.models import Category, Salon, Service

from .models import (
    AuditLog,
    BroadcastCampaign,
    FinanceTransaction,
    Payout,
    SupportReply,
    SupportTicket,
)
from salons.serializers import SalonHoursSerializer

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


class AdminSalonSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner_barber.email", read_only=True)
    owner_name = serializers.CharField(source="owner_barber.full_name", read_only=True)
    region = serializers.SerializerMethodField()
    region_label = serializers.SerializerMethodField()
    hours = SalonHoursSerializer(many=True, read_only=True)
    schedule_summary = serializers.SerializerMethodField()

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
        )
        read_only_fields = ("id", "slug", "owner_barber", "created_at")

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


class AdminSalonUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salon
        fields = ("is_published", "premium", "name", "address", "phone")


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
            "signup_snapshot",
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
            "signup_snapshot",
        )

    def get_region_label(self, obj: Barber) -> str:
        if not obj.region:
            return ""
        return dict(UzRegion.choices).get(obj.region, obj.region)

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
        return first.id if first else None

    def get_salon_name(self, obj: Barber):
        sname = getattr(obj, "salon_name", None)
        if sname is not None:
            return sname
        first = obj.owned_salons.only("name").first()
        return first.name if first else None

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
