"""Push notification payloads to WebSocket groups (Django Channels)."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def _group_send(group: str, message: dict) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    try:
        async_to_sync(layer.group_send)(group, message)
    except Exception as exc:
        logger.warning("WebSocket push skipped for %s: %s", group, exc)


def push_ws_user(user_id: int, payload: dict) -> None:
    _group_send(
        f"user_{user_id}",
        {"type": "notification.message", "payload": payload},
    )


def push_ws_barber(barber_id: int, payload: dict) -> None:
    _group_send(
        f"barber_{barber_id}",
        {"type": "notification.message", "payload": payload},
    )
