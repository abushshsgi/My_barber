from rest_framework import serializers

from accounts.models import User
from accounts.uz_regions import UzRegion
from barbers.models import Barber
from bookings.models import Review
from salons.models import Salon
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
        cnames = ", ".join(_WEEKDAY_ABBREV[c] for c in sorted(closed))
        parts.append(f"dam: {cnames}")
    return " · ".join(parts)


class AdminUserSerializer(serializers.ModelSerializer):
    region_label = serializers.SerializerMethodField()

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
        )
        read_only_fields = ("id", "date_joined", "username", "region_label")

    def get_region_label(self, obj: User) -> str:
        if not obj.region:
            return ""
        return dict(UzRegion.choices).get(obj.region, obj.region)


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
        )
