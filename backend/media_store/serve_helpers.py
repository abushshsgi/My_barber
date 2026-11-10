"""Media HTTP delivery helpers — privacy, cache keys, Redis body cache."""

from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

from django.conf import settings

if TYPE_CHECKING:
    from datetime import datetime

# Do not store very large blobs in Redis (salon galleries, AI originals).
MEDIA_REDIS_BODY_MAX_BYTES = int(getattr(settings, "MEDIA_REDIS_BODY_MAX_BYTES", 4 * 1024 * 1024))
MEDIA_REDIS_TTL_SECONDS = int(getattr(settings, "MEDIA_REDIS_TTL_SECONDS", 60 * 60 * 24))

_PRIVATE_PREFIXES = (
    "wallet/card_receipts/",
    "ai-style/tryon-results/",
    "ai-style/generations/",
    "ai-style/uploads/",
)


def is_private_media_path(rel: str) -> bool:
    """Paths that must not use shared CDN / public edge caches."""
    normalized = (rel or "").replace("\\", "/").lstrip("/")
    return any(normalized.startswith(prefix) for prefix in _PRIVATE_PREFIXES)


def media_etag(size: int, updated_at: datetime | None) -> str:
    ts = int(updated_at.timestamp()) if updated_at is not None else 0
    return f'"{size}-{ts}"'


def media_body_cache_key(rel: str, size: int, updated_at: datetime | None) -> str:
    ts = int(updated_at.timestamp()) if updated_at is not None else 0
    digest = hashlib.sha256(f"{rel}\0{size}\0{ts}".encode()).hexdigest()[:32]
    return f"media_body:v1:{digest}"


def cache_media_body(key: str, data: bytes) -> None:
    if len(data) > MEDIA_REDIS_BODY_MAX_BYTES:
        return
    try:
        from django.core.cache import cache

        cache.set(key, data, timeout=MEDIA_REDIS_TTL_SECONDS)
    except Exception:
        pass


def read_cached_media_body(key: str) -> bytes | None:
    try:
        from django.core.cache import cache

        hit = cache.get(key)
        if isinstance(hit, (bytes, bytearray)):
            return bytes(hit)
    except Exception:
        pass
    return None
