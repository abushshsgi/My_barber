"""Real-time booking lifecycle events via Django Channels."""

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_booking_updated(*, booking) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    payload = {
        "event": "booking_updated",
        "booking_id": booking.id,
        "status": booking.status,
    }
    message = {"type": "notification.message", "payload": payload}
    for group in (f"user_{booking.customer_id}", f"barber_{booking.barber_id}"):
        try:
            async_to_sync(layer.group_send)(group, message)
        except Exception as exc:
            logger.warning("Booking WS broadcast skipped for %s: %s", group, exc)
