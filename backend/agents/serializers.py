from __future__ import annotations

from rest_framework import serializers

from agents.models import FieldAgent
from agents.referral import (
    allocate_unique_code,
    agent_stats_payload,
    build_agent_invite_url,
    ensure_agent_code,
)


class FieldAgentPublicSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = FieldAgent
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "code",
            "is_active",
            "invite_url",
            "stats",
            "created_at",
            "last_login",
        )
        read_only_fields = fields

    def get_invite_url(self, obj: FieldAgent) -> str:
        ensure_agent_code(obj)
        return build_agent_invite_url(obj.code)

    def get_stats(self, obj: FieldAgent) -> dict:
        return agent_stats_payload(obj)


class FieldAgentAdminSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = FieldAgent
        fields = (
            "id",
            "email",
            "full_name",
            "phone",
            "code",
            "is_active",
            "notes",
            "password",
            "invite_url",
            "stats",
            "created_at",
            "updated_at",
            "last_login",
        )
        read_only_fields = ("id", "code", "created_at", "updated_at", "last_login", "invite_url", "stats")

    def get_invite_url(self, obj: FieldAgent) -> str:
        ensure_agent_code(obj)
        return build_agent_invite_url(obj.code)

    def get_stats(self, obj: FieldAgent) -> dict:
        return agent_stats_payload(obj)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({"password": "Majburiy."})
        validated_data["code"] = allocate_unique_code()
        agent = FieldAgent(**validated_data)
        agent.set_password(password)
        agent.save()
        return agent

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class AgentLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip().lower()
        password = attrs.get("password") or ""
        agent = FieldAgent.objects.filter(email__iexact=email).first()
        if not agent or not agent.check_password(password):
            raise serializers.ValidationError({"detail": "Email yoki parol noto'g'ri."})
        if not agent.is_active:
            raise serializers.ValidationError({"detail": "Agent akkaunti o'chirilgan."})
        attrs["agent"] = agent
        return attrs


class AgentSalonRowSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    address = serializers.CharField()
    phone = serializers.CharField()
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)
    is_published = serializers.BooleanField()
    business_kind = serializers.CharField()
    subscription_status = serializers.CharField()
    trial_ends_at = serializers.DateTimeField(allow_null=True)
    trial_value_uzs = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    owner_name = serializers.CharField()
    owner_phone = serializers.CharField()
    members_count = serializers.IntegerField()
