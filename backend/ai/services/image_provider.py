"""Image provider selection for Explore, Studio, and other non-try-on images.

Morf Try-On does not use this selector. It calls Runware only (TRYON_PROVIDER).
IMAGE_GENERATION_PROVIDER=runware stays rejected so Explore and Studio cannot
switch to Runware or drop their Gemini/Vertex configuration.
"""

from __future__ import annotations

import contextvars
import logging
from contextlib import contextmanager
from typing import Any, Iterator

from django.conf import settings

from .errors import AiStyleError

logger = logging.getLogger(__name__)

_queue_managed: contextvars.ContextVar[bool] = contextvars.ContextVar(
    "tryon_queue_managed_generation",
    default=False,
)

SUPPORTED_PROVIDERS = frozenset({"auto", "vertex", "studio"})


@contextmanager
def queue_generation_context() -> Iterator[None]:
    """Queue workers: no in-request sleep-retry and no silent paid fallback."""
    token = _queue_managed.set(True)
    try:
        yield
    finally:
        _queue_managed.reset(token)


def is_queue_managed_generation() -> bool:
    return bool(_queue_managed.get())


def configured_image_provider() -> str:
    raw = (getattr(settings, "IMAGE_GENERATION_PROVIDER", None) or "auto").strip().lower()
    if raw in ("", "auto"):
        return "auto"
    if raw == "runware":
        raise AiStyleError(
            "Runware provider sozlanmagan. IMAGE_GENERATION_PROVIDER=auto|vertex|studio.",
            503,
            retryable=False,
        )
    if raw not in SUPPORTED_PROVIDERS:
        raise AiStyleError(
            "Noto'g'ri IMAGE_GENERATION_PROVIDER. auto, vertex yoki studio ishlating.",
            400,
            retryable=False,
        )
    return raw


def provider_health() -> dict[str, Any]:
    from .studio_image import studio_image_configured
    from .vertex_auth import vertex_image_configured

    vertex_ok = vertex_image_configured()
    studio_ok = studio_image_configured()
    selected = "none"
    try:
        mode = configured_image_provider()
    except AiStyleError:
        mode = "invalid"
        vertex_ok = False
        studio_ok = False
    if mode == "vertex":
        selected = "vertex" if vertex_ok else "none"
    elif mode == "studio":
        selected = "studio" if studio_ok else "none"
    elif mode == "auto":
        if vertex_ok:
            selected = "vertex"
        elif studio_ok:
            selected = "studio"
    return {
        "mode": mode,
        "active": selected,
        "vertex_configured": vertex_ok,
        "studio_configured": studio_ok,
        "runware_configured": False,
        "fallback_enabled": bool(getattr(settings, "IMAGE_PROVIDER_FALLBACK", False)),
    }
