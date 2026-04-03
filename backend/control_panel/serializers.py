from rest_framework import serializers

from accounts.models import User
from salons.models import Salon


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "full_name",
            "phone",
            "role",
            "is_active",
            "is_staff",
            "date_joined",
        )
        read_only_fields = ("id", "date_joined", "username")


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("role", "is_active", "full_name", "phone")

    def validate_role(self, value):
        allowed = {c[0] for c in User.Role.choices}
        if value not in allowed:
            raise serializers.ValidationError("Invalid role.")
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
        fields = ("is_published", "premium", "name", "address")
