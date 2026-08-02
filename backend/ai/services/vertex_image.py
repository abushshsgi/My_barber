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


def _generate_via_vertex(body: dict[str, Any], *, model: str | None = None) -> dict[str, Any]:
    resolved = (model or "").strip() or vertex_image_model()
    return generate_content(
        resolved,
        body,
        timeout=180,
        kind="image",
        location=vertex_image_location(),
    )


def generate_image_content(body: dict[str, Any], *, model: str | None = None) -> dict[str, Any]:
    """Vertex birinchi (GCP kvota). Studio — 429/5xx va model/config 400/404 zaxirasi."""
    if vertex_credentials_configured():
        try:
            return _generate_via_vertex(body, model=model)
        except AiStyleError as exc:
            # 400/404: pro-image model Vertexda yo'q yoki imageConfig rad etilgan bo'lishi mumkin.
            if studio_image_configured() and exc.status in (400, 404, 429, 502, 503, 504):
                logger.warning(
                    "Vertex image failed (%s), falling back to AI Studio",
                    exc.status,
                )
                return studio_generate_image_content(body, model=model)
            raise

    if studio_image_configured():
        return studio_generate_image_content(body, model=model)

    raise AiStyleError(
        "Rasm generatsiya sozlanmagan. VERTEX_PROJECT_ID + VERTEX_SERVICE_ACCOUNT_JSON "
        "(tavsiya) yoki GEMINI_API_KEY kerak.",
        503,
    )
