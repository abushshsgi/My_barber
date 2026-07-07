"""Rasm generatsiya — AI Studio (GEMINI_API_KEY) yoki Vertex zaxira."""

from __future__ import annotations

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


def generate_image_content(body: dict[str, Any]) -> dict[str, Any]:
    if studio_image_configured():
        return studio_generate_image_content(body)
    if vertex_credentials_configured():
        return generate_content(
            vertex_image_model(),
            body,
            timeout=120,
            kind="image",
            location=vertex_image_location(),
        )
    raise AiStyleError(
        "Rasm generatsiya sozlanmagan. GEMINI_API_KEY (AI Studio) yoki Vertex kerak.",
        503,
    )
