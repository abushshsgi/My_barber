from rest_framework import serializers

from accounts.email_utils import normalize_customer_email
from accounts.models import FamilyMember
from accounts.phone_utils import normalize_phone_field


class FamilyMemberSerializer(serializers.ModelSerializer):
    relation_label = serializers.SerializerMethodField()
    audience_label = serializers.SerializerMethodField()

    class Meta:
        model = FamilyMember
        fields = (
            "id",
            "name",
            "relation",
            "relation_label",
            "audience",
            "audience_label",
            "phone",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "relation_label", "audience_label", "created_at", "updated_at")

    def get_relation_label(self, obj: FamilyMember) -> str:
        return obj.get_relation_display()

    def get_audience_label(self, obj: FamilyMember) -> str:
        return obj.get_audience_display()

    def validate_name(self, value: str) -> str:
        value = (value or "").strip()
        if len(value) < 2:
            raise serializers.ValidationError("Ism kamida 2 belgidan iborat bo'lishi kerak.")
        return value

    def validate_phone(self, value):
        value = normalize_phone_field(value)
        return value or ""

    def create(self, validated_data):
        user = self.context["request"].user
        count = FamilyMember.objects.filter(user=user).count()
        if count >= 10:
            raise serializers.ValidationError({"detail": "Eng ko'pi bilan 10 ta oila a'zosi qo'shish mumkin."})
        return FamilyMember.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
