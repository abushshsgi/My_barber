"""REDIS_URL ni Django Channels, cache va redis-py uchun normalizatsiya."""

from __future__ import annotations

import os


def normalize_redis_url(raw: str | None) -> str:
    """
  Railway da tez-tez xato: faqat host:port yoki redis.railway.internal:6379.
  redis-py uchun redis://, rediss:// yoki unix:// kerak.
  """
    url = (raw or "").strip().strip('"').strip("'")
    if not url:
        return ""
    if url.startswith(("redis://", "rediss://", "unix://")):
        return url
    # host:port yoki user:pass@host:port
    return f"redis://{url}"


def get_redis_url() -> str:
    return normalize_redis_url(os.environ.get("REDIS_URL"))
