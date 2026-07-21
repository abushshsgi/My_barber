"""Short-TTL Redis (or LocMem) response cache for hot admin/read APIs."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Callable

from django.core.cache import cache

DEFAULT_TTL = 8


def _stable_key(prefix: str, parts: dict[str, Any]) -> str:
    raw = json.dumps(parts, sort_keys=True, default=str, separators=(",", ":"))
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
    return f"api:{prefix}:{digest}"


def cache_get(prefix: str, parts: dict[str, Any]) -> Any | None:
    try:
        return cache.get(_stable_key(prefix, parts))
    except Exception:
        return None


def cache_set(prefix: str, parts: dict[str, Any], value: Any, ttl: int = DEFAULT_TTL) -> None:
    try:
        cache.set(_stable_key(prefix, parts), value, timeout=max(1, int(ttl)))
    except Exception:
        pass


def cached_json(
    *,
    prefix: str,
    parts: dict[str, Any],
    producer: Callable[[], Any],
    ttl: int = DEFAULT_TTL,
) -> Any:
    """Return cached payload or compute + store."""
    hit = cache_get(prefix, parts)
    if hit is not None:
        return hit
    value = producer()
    cache_set(prefix, parts, value, ttl=ttl)
    return value


def bust_prefix(prefix: str) -> None:
    """Best-effort: delete known keys if backend supports delete_pattern."""
    try:
        # django-redis
        client = getattr(cache, "client", None)
        if client is not None and hasattr(client, "delete_pattern"):
            client.delete_pattern(f"*api:{prefix}:*")
            return
    except Exception:
        pass
    try:
        # Fallback — clear whole cache only in DEBUG would be dangerous; skip.
        pass
    except Exception:
        pass
