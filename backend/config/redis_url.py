"""REDIS_URL ni Django Channels, cache va redis-py uchun normalizatsiya."""

from __future__ import annotations

import os


def redis_url_issue(raw: str | None) -> str | None:
    """Noto'g'ri REDIS_URL uchun aniq xabar (health endpoint)."""
    url = (raw or "").strip().strip('"').strip("'")
    if not url:
        return None
    lower = url.lower()
    if lower.startswith(("http://", "https://")):
        return (
            "REDIS_URL is a web URL (https://...), not a Redis connection string. "
            "In Railway open your Redis service → Variables and copy REDIS_URL "
            "(format: redis://default:PASSWORD@HOST:PORT)."
        )
    if lower.startswith("redis://https://") or lower.startswith("rediss://https://"):
        return (
            "REDIS_URL was prefixed with redis:// but still contains https://. "
            "Use only redis://default:PASSWORD@HOST:PORT from Redis → Variables."
        )
    return None


def normalize_redis_url(raw: str | None) -> str:
    """
    Railway da tez-tez xato: faqat host:port yoki redis.railway.internal:6379.
    redis-py uchun redis://, rediss:// yoki unix:// kerak.
    """
    url = (raw or "").strip().strip('"').strip("'")
    if not url:
        return ""
    if redis_url_issue(url):
        return ""
    if url.startswith(("redis://", "rediss://", "unix://")):
        return url
    # host:port yoki user:pass@host:port
    return f"redis://{url}"


def get_redis_url() -> str:
    return normalize_redis_url(os.environ.get("REDIS_URL"))


def redis_client_kwargs() -> dict:
    """Cache va qisqa HTTP operatsiyalar uchun — uzoq kutish bloklamasligi kerak."""
    return {
        "socket_connect_timeout": 3,
        "socket_timeout": 3,
        "retry_on_timeout": True,
        "health_check_interval": 30,
    }


def redis_blocking_client_kwargs() -> dict:
    """BRPOP va boshqa blocking buyruqlar — socket_timeout bo'lmasa Redis javobini kutadi."""
    return {
        "socket_connect_timeout": 10,
        "socket_timeout": None,
        "retry_on_timeout": True,
        "health_check_interval": 30,
    }


def redis_channel_layer_kwargs() -> dict:
    """Channels pub/sub uzoq kutadi — socket_timeout yo'q (WS idle / BRPOP)."""
    return {
        "socket_connect_timeout": 10,
        "socket_timeout": None,
        "socket_keepalive": True,
        "retry_on_timeout": True,
    }


def redis_channel_layer_hosts(url: str) -> list:
    if not url:
        return []
    return [{"address": url, **redis_channel_layer_kwargs()}]
