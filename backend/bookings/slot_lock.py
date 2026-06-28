"""
Redis orqali bir xil slotga parallel bronlarni kamaytirish (SET NX).
REDIS_URL bo‘lmasa yoki Redis javob bermasa — DB tekshiruvi (serializer) yetarli.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime

from config.redis_url import get_redis_url, redis_client_kwargs

logger = logging.getLogger(__name__)


def _key(barber_id: int, start_at: datetime, end_at: datetime) -> str:
    return (
        f"booking:slot:{barber_id}:"
        f"{int(start_at.timestamp())}:"
        f"{int(end_at.timestamp())}"
    )


@contextmanager
def booking_slot_lock(barber_id: int, start_at: datetime, end_at: datetime, ttl_sec: int = 45):
    url = get_redis_url()
    if not url:
        yield True
        return
    try:
        import redis
    except ImportError:
        logger.warning("redis paketi yo‘q — slot lock o‘tkazildi.")
        yield True
        return

    key = _key(barber_id, start_at, end_at)
    acquired = True
    client = None
    try:
        client = redis.Redis.from_url(url, decode_responses=True, **redis_client_kwargs())
        acquired = bool(client.set(key, "1", nx=True, ex=ttl_sec))
    except Exception as exc:
        logger.warning("Redis slot lock skipped (%s) — DB overlap check ishlatiladi.", exc)
        acquired = True
    try:
        yield acquired
    finally:
        if client is not None and acquired:
            try:
                client.delete(key)
            except Exception:
                pass
