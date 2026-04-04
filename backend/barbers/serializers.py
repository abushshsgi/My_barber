from rest_framework import serializers

from .models import BarberProfile, BarberService, BarberWorkPhoto, BarberWorkingHours


def _public_avatar_url(obj, request):
    """Railway’da fayl yo‘qolgan bo‘lsa ImageField.url 500 bermasin."""
    u = obj.user
    f = getattr(u, "avatar", None)
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
        fields = ("id", "image", "sort_order", "created_at")


class BarberServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberService
        fields = ("id", "name", "price", "duration_minutes", "is_active")


class BarberWorkingHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberWorkingHours
        fields = ("id", "weekday", "open_time", "close_time", "is_day_off")


class BarberPublicListSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.full_name", read_only=True)
    phone = serializers.CharField(
        source="user.phone", read_only=True, allow_null=True, allow_blank=True
    )
    avatar = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    active_services = serializers.SerializerMethodField()

    class Meta:
        model = BarberProfile
        fields = (
            "id",
            "user_id",
            "name",
            "phone",
            "location_text",
            "latitude",
            "longitude",
            "avatar",
            "active_services",
        )

    def get_avatar(self, obj):
        return _public_avatar_url(obj, self.context.get("request"))

    def get_active_services(self, obj):
        qs = obj.services.filter(is_active=True).order_by("name")[:6]
        return BarberServiceSerializer(qs, many=True).data


class BarberPublicDetailSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.full_name", read_only=True)
    phone = serializers.CharField(
        source="user.phone", read_only=True, allow_null=True, allow_blank=True
    )
    avatar = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    services = BarberServiceSerializer(many=True, read_only=True)
    work_photos = BarberWorkPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = BarberProfile
        fields = (
            "id",
            "user_id",
            "name",
            "phone",
            "location_text",
            "latitude",
            "longitude",
            "avatar",
            "services",
            "work_photos",
        )

    def get_avatar(self, obj):
        return _public_avatar_url(obj, self.context.get("request"))


class BarberProfileUpsertSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberProfile
        fields = ("location_text", "latitude", "longitude")


class BarberWorkPhotoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberWorkPhoto
        fields = ("id", "image", "sort_order", "created_at")
        read_only_fields = ("id", "created_at")

