"""Vertex AI — gemini-3.1-flash-lite-image try-on."""

from __future__ import annotations

from typing import Any

from django.conf import settings

from .vertex_client import generate_content

VERTEX_IMAGE_MODEL = "gemini-3.1-flash-lite-image"


def vertex_image_model() -> str:
    configured = (getattr(settings, "VERTEX_IMAGE_MODEL", None) or "").strip()
    return configured or VERTEX_IMAGE_MODEL


def generate_image_content(body: dict[str, Any]) -> dict[str, Any]:
    return generate_content(
        vertex_image_model(),
        body,
        timeout=120,
        kind="image",
    )
