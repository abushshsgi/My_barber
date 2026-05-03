from rest_framework import serializers

from .models import (
    BarberExpense,
    BarberGoal,
    BarberInventoryItem,
    BarberInventoryMovement,
    BarberProfile,
    BarberPromo,
    BarberService,
    BarberSetting,
    BarberSupportTicket,
    BarberWorkPhoto,
    BarberWorkingHours,
)


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
    class Meta:
        model = BarberService
        fields = ("id", "name", "price", "duration_minutes", "is_active")


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
        return value


class BarberPublicListSerializer(serializers.ModelSerializer):
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
        )

    def get_avatar(self, obj):
        return _public_avatar_url(obj, self.context.get("request"))

    def get_active_services(self, obj):
        qs = obj.services.filter(is_active=True).order_by("name")[:6]
        return BarberServiceSerializer(qs, many=True).data


class BarberPublicDetailSerializer(serializers.ModelSerializer):
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
        )

    def get_services(self, obj):
        qs = obj.services.filter(is_active=True).order_by("name")
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
            "updated_at",
        )
        read_only_fields = ("updated_at",)


class BarberSupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberSupportTicket
        fields = ("id", "subject", "message", "status", "created_at", "updated_at")
        read_only_fields = ("id", "status", "created_at", "updated_at")

