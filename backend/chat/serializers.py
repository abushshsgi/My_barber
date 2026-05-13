from rest_framework import serializers

from accounts.models import User
from barbers.models import Barber

from .models import Conversation, Message


def _absolute_file_url(request, filefield) -> str:
    if not filefield:
        return ""
    url = filefield.url
    if request:
        return request.build_absolute_uri(url)
    return url


class ConversationListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    other = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "last_message_text",
            "last_message_at",
            "updated_at",
            "other",
        ]

    def get_other(self, obj: Conversation):
        request = self.context.get("request")
        actor = self.context.get("actor") or {}
        kind = actor.get("kind")
        if kind == "USER":
            b: Barber = obj.barber
            return {
                "kind": "BARBER",
                "id": b.id,
                "full_name": b.full_name or b.username,
                "avatar": _absolute_file_url(request, b.avatar),
            }
        u: User = obj.user
        return {
            "kind": "USER",
            "id": u.id,
            "full_name": u.full_name or u.email,
            "avatar": _absolute_file_url(request, u.avatar),
        }


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "id",
            "sender_kind",
            "text",
            "created_at",
        ]


class CreateConversationSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    barber_id = serializers.IntegerField(required=False)


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=4000, allow_blank=False, trim_whitespace=True)

