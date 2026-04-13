from __future__ import annotations

import json
from urllib.parse import parse_qs

import jwt
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings
from django.utils import timezone

from accounts.models import User
from barbers.models import Barber

from .models import Conversation, Message


@database_sync_to_async
def _get_conversation(public_id):
    return Conversation.objects.select_related("user", "barber").filter(public_id=public_id).first()


@database_sync_to_async
def _create_message(convo: Conversation, sender_kind: str, user: User | None, barber: Barber | None, text: str):
    msg = Message.objects.create(
        conversation=convo,
        sender_kind=sender_kind,
        sender_user=user,
        sender_barber=barber,
        text=text,
    )
    Conversation.objects.filter(pk=convo.pk).update(
        last_message_text=text,
        last_message_at=timezone.now(),
        updated_at=timezone.now(),
    )
    return msg


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Realtime chat (text-only).
    Auth: JWT query param ?token= (barber_access or SimpleJWT access for user).
    URL: /ws/chat/<uuid:conversation_id>/?token=...
    """

    async def connect(self):
        self.group_name = None
        self.actor_kind = None
        self.actor_user_id = None
        self.actor_barber_id = None
        self.convo = None

        convo_id = self.scope.get("url_route", {}).get("kwargs", {}).get("conversation_id")
        if not convo_id:
            await self.close(code=4400)
            return

        raw = self.scope.get("query_string") or b""
        query = parse_qs(raw.decode())
        token = (query.get("token") or [None])[0]
        if not token:
            await self.close(code=4401)
            return

        try:
            payload = jwt.decode(token, settings.JWT_HS256_SIGNING_KEY, algorithms=["HS256"])
        except jwt.PyJWTError:
            await self.close(code=4402)
            return

        if payload.get("type") == "barber_access":
            bid = payload.get("barber_id")
            if not bid:
                await self.close(code=4403)
                return
            self.actor_kind = "BARBER"
            self.actor_barber_id = int(bid)
        elif payload.get("token_type") == "access" and payload.get("user_id") is not None:
            self.actor_kind = "USER"
            self.actor_user_id = int(payload["user_id"])
        else:
            await self.close(code=4404)
            return

        convo = await _get_conversation(convo_id)
        if not convo:
            await self.close(code=4405)
            return
        if self.actor_kind == "USER" and convo.user_id != self.actor_user_id:
            await self.close(code=4406)
            return
        if self.actor_kind == "BARBER" and convo.barber_id != self.actor_barber_id:
            await self.close(code=4406)
            return

        self.convo = convo
        self.group_name = f"chat_{convo.public_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data or not self.convo or not self.actor_kind:
            return
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        text = (data.get("text") or "").strip()
        if not text:
            return
        if len(text) > 4000:
            return

        sender_kind = Message.SenderKind.USER if self.actor_kind == "USER" else Message.SenderKind.BARBER
        user = None
        barber = None
        if self.actor_kind == "USER":
            user = await database_sync_to_async(User.objects.filter(pk=self.actor_user_id).first)()
        else:
            barber = await database_sync_to_async(Barber.objects.filter(pk=self.actor_barber_id).first)()
        msg = await _create_message(self.convo, sender_kind, user, barber, text)

        payload = {
            "type": "message",
            "message": {
                "id": msg.id,
                "sender_kind": msg.sender_kind,
                "text": msg.text,
                "created_at": msg.created_at.isoformat(),
            },
        }
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat_message", "payload": payload},
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

