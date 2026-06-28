"""Redis va real-time infratuzilma holati (health endpoint uchun)."""

from __future__ import annotations

import os

from django.conf import settings


def redis_health_payload() -> dict:
    url = (os.environ.get("REDIS_URL") or "").strip()
    channel_backend = (
        settings.CHANNEL_LAYERS.get("default", {}).get("BACKEND", "") or ""
    ).lower()
    cache_backend = (settings.CACHES.get("default", {}).get("BACKEND", "") or "").lower()

    if not url:
        return {
            "configured": False,
            "ping": False,
            "channel_layer": "memory" if "inmemory" in channel_backend else "unknown",
            "cache": "locmem" if "locmem" in cache_backend else "unknown",
            "realtime_ready": False,
        }

    ping = False
    error = ""
    try:
        import redis

        client = redis.Redis.from_url(url, socket_connect_timeout=2, socket_timeout=2)
        ping = bool(client.ping())
    except Exception as exc:
        error = str(exc)[:120]

    channel_layer = "redis" if "redis" in channel_backend and ping else (
        "memory" if "inmemory" in channel_backend else "misconfigured"
    )
    cache = "redis" if "redis" in cache_backend and ping else "fallback"

    out = {
        "configured": True,
        "ping": ping,
        "channel_layer": channel_layer,
        "cache": cache,
        "realtime_ready": ping and channel_layer == "redis",
    }
    if error and not ping:
        out["error"] = error
    return out
