from __future__ import annotations

from typing import Literal, TypedDict

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.utils import OperationalError, ProgrammingError
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from barbers.models import Barber

from .booking_gate import conversation_queryset_for_actor, pair_has_booking_for_chat
from .models import Conversation, Message
from .serializers import (
    ConversationListSerializer,
    CreateConversationSerializer,
    MessageSerializer,
    SendMessageSerializer,
)


class Actor(TypedDict):
    kind: Literal["USER", "BARBER"]
    user: User | None
    barber: Barber | None


def get_actor_from_request(request) -> Actor:
    u = getattr(request, "user", None)
    if u is None or not getattr(u, "is_authenticated", False):
        raise PermissionDenied("Authentication required.")
    if hasattr(u, "barber"):
        return {"kind": "BARBER", "user": None, "barber": u.barber}
    if isinstance(u, User):
        return {"kind": "USER", "user": u, "barber": None}
    # AdminPrincipal va boshqalar
    raise PermissionDenied("Chat only supports user and barber.")


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        actor = get_actor_from_request(request)
        try:
            qs = conversation_queryset_for_actor(actor)
            data = ConversationListSerializer(qs, many=True, context={"actor": actor}).data
            return Response(data)
        except (OperationalError, ProgrammingError):
            # Production deploylarda migrate o'tkazilmagan bo'lsa 500 chiqmasin.
            return Response([])

    def post(self, request):
        actor = get_actor_from_request(request)
        ser = CreateConversationSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        barber_id = ser.validated_data.get("barber_id")
        user_id = ser.validated_data.get("user_id")

        if actor["kind"] == "USER":
            if not barber_id:
                raise ValidationError({"barber_id": "barber_id required."})
            barber = Barber.objects.filter(pk=barber_id, is_active=True).first()
            if not barber:
                raise ValidationError({"barber_id": "Barber not found."})
            user = actor["user"]
        else:
            if not user_id:
                raise ValidationError({"user_id": "user_id required."})
            user = User.objects.filter(pk=user_id, is_active=True).first()
            if not user:
                raise ValidationError({"user_id": "User not found."})
            barber = actor["barber"]

        if not pair_has_booking_for_chat(user.id, barber.id):
            raise ValidationError(
                {
                    "detail": "Chat faqat bron qilingandan keyin ochiladi (mijoz va sartarosh o‘rtasida bron bo‘lishi kerak)."
                }
            )

        convo, _created = Conversation.objects.get_or_create(user=user, barber=barber)
        payload = ConversationListSerializer(convo, context={"actor": actor}).data
        return Response(payload, status=201)


class ConversationMessagesView(APIView, PageNumberPagination):
    permission_classes = [IsAuthenticated]
    page_size = 50
    max_page_size = 200

    def get_conversation(self, actor: Actor, public_id):
        try:
            qs = Conversation.objects.select_related("barber", "user")
            convo = qs.filter(public_id=public_id).first()
        except (OperationalError, ProgrammingError):
            raise ValidationError({"detail": "Chat storage is not ready (migrations missing)."})
        if not convo:
            raise ValidationError({"detail": "Conversation not found."})
        if actor["kind"] == "USER" and convo.user_id != actor["user"].id:
            raise PermissionDenied("Not your conversation.")
        if actor["kind"] == "BARBER" and convo.barber_id != actor["barber"].id:
            raise PermissionDenied("Not your conversation.")
        if not pair_has_booking_for_chat(convo.user_id, convo.barber_id):
            raise PermissionDenied(
                "Chat faqat bron mavjud bo‘lganda ochiladi. Bron yo‘q yoki bekor qilingan."
            )
        return convo

    def get(self, request, conversation_id: str):
        actor = get_actor_from_request(request)
        convo = self.get_conversation(actor, conversation_id)
        try:
            qs = Message.objects.filter(conversation=convo).order_by("-created_at", "-id")
        except (OperationalError, ProgrammingError):
            return self.get_paginated_response([])
        page = self.paginate_queryset(qs, request, view=self)
        ser = MessageSerializer(page, many=True)
        return self.get_paginated_response(list(reversed(ser.data)))

    def post(self, request, conversation_id: str):
        actor = get_actor_from_request(request)
        convo = self.get_conversation(actor, conversation_id)
        ser = SendMessageSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        text = ser.validated_data["text"].strip()
        if not text:
            raise ValidationError({"text": "Text required."})

        try:
            tx = transaction.atomic()
        except (OperationalError, ProgrammingError):
            raise ValidationError({"detail": "Chat storage is not ready (migrations missing)."})

        with tx:
            msg = Message.objects.create(
                conversation=convo,
                sender_kind=Message.SenderKind.USER if actor["kind"] == "USER" else Message.SenderKind.BARBER,
                sender_user=actor["user"] if actor["kind"] == "USER" else None,
                sender_barber=actor["barber"] if actor["kind"] == "BARBER" else None,
                text=text,
            )
            Conversation.objects.filter(pk=convo.pk).update(
                last_message_text=text,
                last_message_at=timezone.now(),
                updated_at=timezone.now(),
            )

        message_payload = MessageSerializer(msg).data
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{convo.public_id}",
            {
                "type": "chat_message",
                "payload": {"type": "message", "message": message_payload},
            },
        )
        return Response(message_payload, status=201)

