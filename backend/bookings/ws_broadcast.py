"""Real-time booking lifecycle events via Django Channels."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_booking_updated(*, booking) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    payload = {
        "event": "booking_updated",
        "booking_id": booking.id,
        "status": booking.status,
    }
    async_to_sync(layer.group_send)(
        f"user_{booking.customer_id}",
        {"type": "notification.message", "payload": payload},
    )
    async_to_sync(layer.group_send)(
        f"barber_{booking.barber_id}",
        {"type": "notification.message", "payload": payload},
    )
