from rest_framework import serializers

from accounts.models import User
from accounts.uz_regions import UzRegion
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
        allowed = {c[0] for c in User.Role.choices}
        if value not in allowed:
            raise serializers.ValidationError("Invalid role.")
        return value

    def validate_region(self, value):
        if value in (None, ""):
            return ""
        allowed = {c[0] for c in UzRegion.choices}
        if value not in allowed:
            raise serializers.ValidationError("Noto'g'ri viloyat.")
        return value


class AdminSalonSerializer(serializers.ModelSerializer):
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    owner_name = serializers.CharField(source="owner.full_name", read_only=True)

    class Meta:
        model = Salon
        fields = (
            "id",
            "name",
            "slug",
            "owner",
            "owner_email",
            "owner_name",
            "address",
            "phone",
            "is_published",
            "premium",
            "latitude",
            "longitude",
            "created_at",
        )
        read_only_fields = ("id", "slug", "owner", "created_at")


class AdminSalonUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salon
        fields = ("is_published", "premium", "name", "address", "phone")
