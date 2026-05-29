"""Expo Push API — https://docs.expo.dev/push-notifications/sending-notifications/"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
CHUNK_SIZE = 100


def send_expo_push(
    tokens: list[str],
    *,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    clean = [t for t in tokens if t and str(t).startswith("ExponentPushToken")]
    if not clean:
        return
    payload_data = data or {}
    for i in range(0, len(clean), CHUNK_SIZE):
        chunk = clean[i : i + CHUNK_SIZE]
        messages = [
            {
                "to": token,
                "title": title,
                "body": body or title,
                "data": payload_data,
                "sound": "default",
            }
            for token in chunk
        ]
        try:
            req = urllib.request.Request(
                EXPO_PUSH_URL,
                data=json.dumps(messages).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status >= 400:
                    logger.warning("Expo push HTTP %s", resp.status)
        except urllib.error.URLError as e:
            logger.warning("Expo push failed: %s", e)


def send_barber_expo_push(
    barber,
    *,
    title: str,
    body: str,
    payload: dict | None = None,
) -> None:
    from barbers.models import BarberSetting

    from .models import BarberPushToken

    try:
        settings = barber.settings
    except BarberSetting.DoesNotExist:
        settings = None
    if settings is not None and not settings.notifications_push:
        return

    tokens = list(
        BarberPushToken.objects.filter(barber=barber).values_list("token", flat=True)
    )
    send_expo_push(tokens, title=title, body=body, data=payload)
