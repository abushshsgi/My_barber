"""
Redis orqali bir xil slotga parallel bronlarni kamaytirish (SET NX).
REDIS_URL bo‘lmasa — DB tekshiruvi (serializer) yetarli.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime

from config.redis_url import get_redis_url

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

    r = redis.Redis.from_url(url, decode_responses=True)
    key = _key(barber_id, start_at, end_at)
    acquired = bool(r.set(key, "1", nx=True, ex=ttl_sec))
    try:
        yield acquired
    finally:
        if acquired:
            try:
                r.delete(key)
            except Exception:
                pass
