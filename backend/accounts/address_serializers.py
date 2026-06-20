from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from accounts.address_sync import quantize_coord, set_default_address, sync_user_active_location
from accounts.models import UserAddress
from accounts.uz_regions import UzRegion


class UserAddressSerializer(serializers.ModelSerializer):
    display_label = serializers.SerializerMethodField()

    class Meta:
        model = UserAddress
        fields = (
            "id",
            "label",
            "custom_label",
            "display_label",
            "address_line",
            "region",
            "latitude",
            "longitude",
            "is_default",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "display_label", "created_at", "updated_at")

    def get_display_label(self, obj: UserAddress) -> str:
        if obj.label == UserAddress.Label.OTHER and obj.custom_label.strip():
            return obj.custom_label.strip()
        return obj.get_label_display()

    def validate_region(self, value):
        value = (value or "").strip()
        valid = {c[0] for c in UzRegion.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri viloyat.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        lat = attrs.get("latitude", getattr(self.instance, "latitude", None))
        lng = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if (lat is None) ^ (lng is None):
            raise serializers.ValidationError(
                {"latitude": "latitude va longitude birga berilishi kerak."}
            )
        if lat is not None:
            attrs["latitude"] = quantize_coord(lat)
        if lng is not None:
            attrs["longitude"] = quantize_coord(lng)
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        is_default = validated_data.get("is_default", False)
        has_any = UserAddress.objects.filter(user=user).exists()
        if is_default or not has_any:
            validated_data["is_default"] = True
        addr = UserAddress.objects.create(user=user, **validated_data)
        if addr.is_default:
            set_default_address(user, addr)
        return addr

    def update(self, instance, validated_data):
        user = self.context["request"].user
        region_changed = "region" in validated_data and validated_data["region"] != instance.region
        coords_changed = any(k in validated_data for k in ("latitude", "longitude"))
        becoming_default = validated_data.get("is_default") is True and not instance.is_default

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if becoming_default or instance.is_default:
            set_default_address(user, instance)
        elif region_changed or coords_changed:
            if instance.is_default:
                sync_user_active_location(user)
        return instance
