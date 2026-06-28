import json
from urllib.parse import parse_qs

import jwt
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings


class NotificationConsumer(AsyncWebsocketConsumer):
    """JWT query param ?token= (barber_access or SimpleJWT access for user)."""

    async def connect(self):
        self.group_name = None
        raw = self.scope.get("query_string") or b""
        query = parse_qs(raw.decode())
        token = (query.get("token") or [None])[0]
        if not token:
            await self.close(code=4001)
            return
        try:
            payload = jwt.decode(
                token,
                settings.JWT_HS256_SIGNING_KEY,
                algorithms=["HS256"],
            )
        except jwt.PyJWTError:
            await self.close(code=4002)
            return

        if payload.get("type") == "barber_access":
            bid = payload.get("barber_id")
            if not bid:
                await self.close(code=4003)
                return
            self.group_name = f"barber_{int(bid)}"
        else:
            user_id = payload.get("user_id")
            if user_id is None and payload.get("sub") is not None:
                try:
                    user_id = int(payload["sub"])
                except (TypeError, ValueError):
                    user_id = None
            token_type = payload.get("token_type") or payload.get("type")
            if user_id is not None and token_type in (None, "access", "refresh"):
                self.group_name = f"user_{int(user_id)}"
            else:
                await self.close(code=4004)
                return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event["payload"]))
