from rest_framework import serializers

from accounts.models import User
from barbers.models import Barber

from .models import Conversation, Message
from .salon_lookup import salon_name_for_barber


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
    salon_name = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "last_message_text",
            "last_message_at",
            "updated_at",
            "other",
            "salon_name",
            "unread_count",
        ]

    def get_salon_name(self, obj: Conversation) -> str:
        return salon_name_for_barber(obj.barber)

    def get_unread_count(self, obj: Conversation) -> int:
        actor = self.context.get("actor") or {}
        kind = actor.get("kind")
        if kind == "USER":
            since = obj.user_last_read_at
            qs = obj.messages.filter(sender_kind=Message.SenderKind.BARBER)
        elif kind == "BARBER":
            since = obj.barber_last_read_at
            qs = obj.messages.filter(sender_kind=Message.SenderKind.USER)
        else:
            return 0
        if since:
            qs = qs.filter(created_at__gt=since)
        return qs.count()

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

