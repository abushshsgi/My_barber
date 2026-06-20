from decimal import Decimal, ROUND_HALF_UP

from rest_framework import serializers

from accounts.models import LaunchInterest
from accounts.uz_regions import UzRegion


class LaunchInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LaunchInterest
        fields = (
            "id",
            "region",
            "latitude",
            "longitude",
            "city_label",
            "message",
            "source",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_region(self, value):
        value = (value or "").strip()
        valid = {c[0] for c in UzRegion.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri viloyat.")
        return value

    def validate_source(self, value):
        value = (value or LaunchInterest.Source.ONBOARDING).strip()
        valid = {c[0] for c in LaunchInterest.Source.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri manba.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        lat = attrs.get("latitude")
        lng = attrs.get("longitude")
        if (lat is None) ^ (lng is None):
            raise serializers.ValidationError(
                {"latitude": "latitude va longitude birga berilishi kerak."}
            )
        for key in ("latitude", "longitude"):
            val = attrs.get(key)
            if val is not None:
                attrs[key] = Decimal(str(val)).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        obj, _created = LaunchInterest.objects.update_or_create(
            user=user,
            region=validated_data["region"],
            defaults={
                "latitude": validated_data.get("latitude"),
                "longitude": validated_data.get("longitude"),
                "city_label": validated_data.get("city_label", ""),
                "message": validated_data.get("message", ""),
                "source": validated_data.get("source", LaunchInterest.Source.ONBOARDING),
            },
        )
        return obj
