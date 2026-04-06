"""Push notification payloads to WebSocket groups (Django Channels)."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def push_ws_user(user_id: int, payload: dict) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    async_to_sync(layer.group_send)(
        f"user_{user_id}",
        {"type": "notification.message", "payload": payload},
    )


def push_ws_barber(barber_id: int, payload: dict) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    async_to_sync(layer.group_send)(
        f"barber_{barber_id}",
        {"type": "notification.message", "payload": payload},
    )
