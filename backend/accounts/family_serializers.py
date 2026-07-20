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
        from subscriptions.services import family_member_limit_for

        limit = family_member_limit_for(user)
        count = FamilyMember.objects.filter(user=user).count()
        if limit is not None and limit <= 0:
            raise serializers.ValidationError(
                {
                    "detail": "Oila a'zolari Plus yoki Pro obunasida mavjud. Obuna bo'ling.",
                }
            )
        if limit is not None and count >= limit:
            raise serializers.ValidationError(
                {
                    "detail": f"Bu rejada eng ko'pi bilan {limit} ta oila a'zosi qo'shish mumkin.",
                }
            )
        # Hard ceiling against abuse even on unlimited plans
        if count >= 50:
            raise serializers.ValidationError({"detail": "Oila a'zolari limiti (50)."})
        return FamilyMember.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
