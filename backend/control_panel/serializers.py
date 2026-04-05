from rest_framework import serializers

from accounts.models import User
from accounts.uz_regions import UzRegion
from barbers.models import Barber
from salons.models import Salon


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


class AdminSalonUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salon
        fields = ("is_published", "premium", "name", "address", "phone")


class AdminBarberSerializer(serializers.ModelSerializer):
    region_label = serializers.SerializerMethodField()
    owned_salons_count = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

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
