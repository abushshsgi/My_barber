from datetime import datetime

from django.db.models import Q
from rest_framework import serializers

from salons.models import CatalogService

from .models import (
    BarberExpense,
    BarberGoal,
    BarberInventoryItem,
    BarberInventoryMovement,
    BarberProfile,
    BarberPromo,
    BarberScheduleException,
    BarberService,
    BarberSetting,
    BarberSupportTicket,
    BarberWorkPhoto,
    BarberWorkingHours,
)


def validate_break_list(value):
    """[{"start":"HH:MM","end":"HH:MM"}, ...] tekshiruvi — ish vaqti tanaffuslari."""
    if not isinstance(value, list):
        raise serializers.ValidationError("breaks must be a list.")
    for item in value:
        if not isinstance(item, dict):
            raise serializers.ValidationError("Each break must be an object with start/end.")
        if "start" not in item or "end" not in item:
            raise serializers.ValidationError("Each break needs start and end (HH:MM).")
        try:
            st = datetime.strptime(str(item["start"]), "%H:%M").time()
            et = datetime.strptime(str(item["end"]), "%H:%M").time()
        except (TypeError, ValueError):
            raise serializers.ValidationError("Break start/end must be HH:MM.")
        if st >= et:
            raise serializers.ValidationError("Break start must be before end.")
    return value


def _public_avatar_url(obj, request):
    """Railway’da fayl yo‘qolgan bo‘lsa ImageField.url 500 bermasin."""
    b = obj.barber
    f = getattr(b, "avatar", None)
    if not f or not getattr(f, "name", None):
        return None
    try:
        path = f.url
    except (ValueError, OSError):
        return None
    if request:
        return request.build_absolute_uri(path)
    return path


class BarberWorkPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberWorkPhoto
        fields = ("id", "image", "title", "service_name", "likes", "sort_order", "created_at")


class BarberServiceSerializer(serializers.ModelSerializer):
    catalog_service = serializers.PrimaryKeyRelatedField(
        queryset=CatalogService.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    barber = serializers.IntegerField(source="profile.barber_id", read_only=True)
    name = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = BarberService
        fields = ("id", "barber", "catalog_service", "name", "price", "duration_minutes", "is_active", "image_url")
        read_only_fields = ("id", "barber", "name", "duration_minutes", "image_url")

    def validate_price(self, value):
        from .pricing import MIN_SERVICE_PRICE_ERROR, MIN_SERVICE_PRICE_UZS

        if value <= 0:
            raise serializers.ValidationError("Narx 0 dan katta bo'lishi kerak.")
        if value < MIN_SERVICE_PRICE_UZS:
            raise serializers.ValidationError(MIN_SERVICE_PRICE_ERROR)
        return value

    def get_name(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.name
        return obj.name

    def get_duration_minutes(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.duration_minutes
        return obj.duration_minutes

    def get_image_url(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.image_url
        return ""


class BarberWorkingHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberWorkingHours
        fields = ("id", "weekday", "open_time", "close_time", "is_day_off", "breaks")

    def validate_breaks(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("breaks must be a list.")
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each break must be an object with start/end.")
            if "start" not in item or "end" not in item:
                raise serializers.ValidationError("Each break needs start and end (HH:MM).")
            try:
                st = datetime.strptime(str(item["start"]), "%H:%M").time()
                et = datetime.strptime(str(item["end"]), "%H:%M").time()
            except (TypeError, ValueError):
                raise serializers.ValidationError("Break start/end must be HH:MM.")
            if st >= et:
                raise serializers.ValidationError("Break start must be before end.")
        return value

    def validate_weekday(self, value):
        if value < 0 or value > 6:
            raise serializers.ValidationError("weekday must be between 0 and 6.")
        return value

    def validate(self, attrs):
        open_time = attrs.get("open_time", getattr(self.instance, "open_time", None))
        close_time = attrs.get("close_time", getattr(self.instance, "close_time", None))
        is_day_off = attrs.get("is_day_off", getattr(self.instance, "is_day_off", False))
        if not is_day_off and open_time and close_time and open_time >= close_time:
            raise serializers.ValidationError({"close_time": "Yopilish vaqti ochilishdan keyin bo'lishi kerak."})
        return attrs


class BarberScheduleExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberScheduleException
        fields = ("id", "date", "is_day_off", "open_time", "close_time", "breaks", "note")

    def validate_breaks(self, value):
        return validate_break_list(value)

    def validate(self, attrs):
        is_day_off = attrs.get("is_day_off", getattr(self.instance, "is_day_off", False))
        open_time = attrs.get("open_time", getattr(self.instance, "open_time", None))
        close_time = attrs.get("close_time", getattr(self.instance, "close_time", None))
        if is_day_off:
            return attrs
        if (open_time and not close_time) or (close_time and not open_time):
            raise serializers.ValidationError(
                {"close_time": "Maxsus soat uchun ochilish va yopilish vaqtini kiriting."}
            )
        if open_time and close_time and open_time >= close_time:
            raise serializers.ValidationError(
                {"close_time": "Yopilish vaqti ochilishdan keyin bo'lishi kerak."}
            )
        return attrs


from salons.amenity_public import barber_booking_context


class BarberPublicContextMixin:
    booking_kind = serializers.SerializerMethodField()
    salon_id = serializers.SerializerMethodField()
    salon_name = serializers.SerializerMethodField()
    amenities = serializers.SerializerMethodField()

    def _booking_ctx(self, obj):
        cache = getattr(self, "_booking_ctx_cache", None)
        if cache is None:
            cache = {}
            setattr(self, "_booking_ctx_cache", cache)
        key = obj.barber_id
        if key not in cache:
            cache[key] = barber_booking_context(obj.barber, self.context.get("request"))
        return cache[key]

    def get_booking_kind(self, obj):
        return self._booking_ctx(obj)["booking_kind"]

    def get_salon_id(self, obj):
        return self._booking_ctx(obj)["salon_id"]

    def get_salon_name(self, obj):
        return self._booking_ctx(obj)["salon_name"]

    def get_amenities(self, obj):
        return self._booking_ctx(obj)["amenities"]


class BarberPublicListSerializer(BarberPublicContextMixin, serializers.ModelSerializer):
    name = serializers.CharField(source="barber.full_name", read_only=True)
    phone = serializers.CharField(
        source="barber.phone", read_only=True, allow_null=True, allow_blank=True
    )
    avatar = serializers.SerializerMethodField()
    barber_id = serializers.IntegerField(source="barber.id", read_only=True)
    region = serializers.CharField(source="barber.region", read_only=True)
    avg_rating = serializers.FloatField(read_only=True, allow_null=True)
    review_count = serializers.IntegerField(read_only=True, allow_null=True)
    active_services = serializers.SerializerMethodField()

    class Meta:
        model = BarberProfile
        fields = (
            "id",
            "barber_id",
            "name",
            "phone",
            "region",
            "location_text",
            "latitude",
            "longitude",
            "avatar",
            "avg_rating",
            "review_count",
            "active_services",
            "booking_kind",
            "salon_id",
            "salon_name",
            "amenities",
        )

    def get_avatar(self, obj):
        return _public_avatar_url(obj, self.context.get("request"))

    def get_active_services(self, obj):
        qs = obj.services.filter(is_active=True).filter(
            Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True)
        ).order_by("name")[:6]
        return BarberServiceSerializer(qs, many=True).data


class BarberPublicDetailSerializer(BarberPublicContextMixin, serializers.ModelSerializer):
    name = serializers.CharField(source="barber.full_name", read_only=True)
    phone = serializers.CharField(
        source="barber.phone", read_only=True, allow_null=True, allow_blank=True
    )
    avatar = serializers.SerializerMethodField()
    barber_id = serializers.IntegerField(source="barber.id", read_only=True)
    region = serializers.CharField(source="barber.region", read_only=True)
    avg_rating = serializers.FloatField(read_only=True, allow_null=True)
    review_count = serializers.IntegerField(read_only=True, allow_null=True)
    services = serializers.SerializerMethodField()
    work_photos = BarberWorkPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = BarberProfile
        fields = (
            "id",
            "barber_id",
            "name",
            "phone",
            "region",
            "location_text",
            "latitude",
            "longitude",
            "avatar",
            "avg_rating",
            "review_count",
            "services",
            "work_photos",
            "booking_kind",
            "salon_id",
            "salon_name",
            "amenities",
        )

    def get_services(self, obj):
        qs = obj.services.filter(is_active=True).filter(
            Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True)
        ).order_by("name")
        return BarberServiceSerializer(qs, many=True).data

    def get_avatar(self, obj):
        return _public_avatar_url(obj, self.context.get("request"))


_ALLOWED_SPOKEN_LANG = frozenset({"uz", "ru", "en", "tr", "ar"})


class BarberProfileUpsertSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberProfile
        fields = ("location_text", "latitude", "longitude", "spoken_languages")

    def validate_spoken_languages(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("spoken_languages ro‘yxat bo‘lishi kerak.")
        out = []
        for item in value:
            code = str(item).strip().lower()
            if code not in _ALLOWED_SPOKEN_LANG:
                raise serializers.ValidationError(f"Noma’lum til kodi: {item}")
            if code not in out:
                out.append(code)
        return out


class BarberWorkPhotoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberWorkPhoto
        fields = ("id", "image", "title", "service_name", "likes", "sort_order", "created_at")
        read_only_fields = ("id", "created_at")


class BarberInventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberInventoryItem
        fields = (
            "id",
            "name",
            "category",
            "stock",
            "min_stock",
            "unit",
            "price",
            "supplier",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class BarberInventoryMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberInventoryMovement
        fields = ("id", "item", "delta", "note", "created_at")
        read_only_fields = ("id", "created_at")


class BarberExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberExpense
        fields = ("id", "category", "description", "amount", "spent_on", "created_at")
        read_only_fields = ("id", "created_at")


class BarberGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberGoal
        fields = ("id", "title", "target", "current", "unit", "deadline", "done", "created_at")
        read_only_fields = ("id", "created_at")


class BarberPromoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberPromo
        fields = (
            "id",
            "code",
            "description",
            "discount_pct",
            "uses",
            "max_uses",
            "is_active",
            "expires",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class BarberSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberSetting
        fields = (
            "notifications_email",
            "notifications_push",
            "notifications_sms",
            "auto_accept",
            "language",
            "theme",
            "payout_holder_name",
            "payout_bank_name",
            "payout_account_last4",
            "updated_at",
        )
        read_only_fields = ("updated_at", "payout_account_last4")


class BarberSupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberSupportTicket
        fields = ("id", "subject", "message", "status", "created_at", "updated_at")
        read_only_fields = ("id", "status", "created_at", "updated_at")

