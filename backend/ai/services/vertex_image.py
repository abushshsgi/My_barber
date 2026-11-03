"""Rasm generatsiya — Vertex (GCP kvota) asosiy, AI Studio zaxira."""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings

from .gemini_style import AiStyleError
from .studio_image import (
    generate_image_content as studio_generate_image_content,
    image_generation_provider,
    studio_image_configured,
)
from .vertex_auth import vertex_image_configured as vertex_credentials_configured
from .vertex_client import generate_content

logger = logging.getLogger(__name__)

VERTEX_IMAGE_MODEL = "gemini-3.1-flash-lite-image"
VERTEX_IMAGE_LOCATION = "global"


def vertex_image_model() -> str:
    configured = (getattr(settings, "VERTEX_IMAGE_MODEL", None) or "").strip()
    return configured or VERTEX_IMAGE_MODEL


def vertex_image_location() -> str:
    configured = (getattr(settings, "VERTEX_IMAGE_LOCATION", None) or "").strip()
    return configured or VERTEX_IMAGE_LOCATION


def image_generation_configured() -> bool:
    return image_generation_provider() is not None


def vertex_image_configured() -> bool:
    """Try-on / explore uchun rasm generatsiya mavjudligi."""
    return image_generation_configured()


def _generate_via_vertex(
    body: dict[str, Any],
    *,
    model: str | None = None,
    max_retries: int | None = None,
) -> dict[str, Any]:
    resolved = (model or "").strip() or vertex_image_model()
    return generate_content(
        resolved,
        body,
        timeout=180,
        kind="image",
        location=vertex_image_location(),
        max_retries=max_retries,
    )


def generate_image_content(
    body: dict[str, Any],
    *,
    model: str | None = None,
    max_retries: int | None = None,
    allow_fallback: bool | None = None,
) -> dict[str, Any]:
    """Vertex birinchi (GCP kvota). Studio — faqat vaqtinchalik 429/5xx zaxirasi."""
    from .image_provider import configured_image_provider, is_queue_managed_generation

    queue_managed = is_queue_managed_generation()
    if allow_fallback is None:
        allow_fallback = (not queue_managed) or bool(
            getattr(settings, "IMAGE_PROVIDER_FALLBACK", False)
        )
    mode = configured_image_provider()

    if mode == "studio":
        if not studio_image_configured():
            raise AiStyleError("GEMINI_API_KEY sozlanmagan.", 503, retryable=False)
        return studio_generate_image_content(body, model=model, max_retries=max_retries)

    # AI Studio zaxirasi bor bo'lsa 429 da uzoq kutmasdan tez o'tamiz (navbat emas).
    if max_retries is not None:
        vertex_retries = max_retries
    elif queue_managed:
        vertex_retries = 0
    else:
        vertex_retries = 1 if studio_image_configured() else None

    if mode in ("auto", "vertex") and vertex_credentials_configured():
        try:
            return _generate_via_vertex(body, model=model, max_retries=vertex_retries)
        except AiStyleError as exc:
            # Model/config xatolari — boshqa provider ga jim o'tilmaydi.
            if exc.status in (400, 401, 403, 404):
                raise
            if (
                allow_fallback
                and mode == "auto"
                and studio_image_configured()
                and exc.status in (429, 502, 503, 504)
            ):
                logger.warning(
                    "Vertex image failed (%s), falling back to AI Studio",
                    exc.status,
                )
                return studio_generate_image_content(body, model=model, max_retries=0)
            raise

    if mode == "vertex":
        raise AiStyleError(
            "Vertex AI sozlanmagan. VERTEX_PROJECT_ID + VERTEX_SERVICE_ACCOUNT_JSON kerak.",
            503,
            retryable=False,
        )

    if studio_image_configured():
        return studio_generate_image_content(body, model=model, max_retries=max_retries)

    raise AiStyleError(
        "Rasm generatsiya sozlanmagan. VERTEX_PROJECT_ID + VERTEX_SERVICE_ACCOUNT_JSON "
        "(tavsiya) yoki GEMINI_API_KEY kerak.",
        503,
    )
