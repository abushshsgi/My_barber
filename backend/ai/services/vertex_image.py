"""Vertex AI — Gemini image generation (Nano Banana / Flash Image)."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

from .gemini_style import AiStyleError, _map_gemini_http_error, _read_http_error_body
from .vertex_auth import get_vertex_access_token, vertex_image_configured

logger = logging.getLogger(__name__)

IMAGE_MODEL_FALLBACKS = (
    "gemini-3.1-flash-lite-image",
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image",
)


def use_vertex_for_images() -> bool:
    provider = (getattr(settings, "AI_IMAGE_PROVIDER", None) or "").strip().lower()
    if provider == "gemini":
        return False
    if provider == "vertex":
        return vertex_image_configured()
    return vertex_image_configured()


def _image_models() -> tuple[str, ...]:
    preferred = (getattr(settings, "VERTEX_IMAGE_MODEL", None) or "").strip()
    if not preferred:
        preferred = (getattr(settings, "GEMINI_IMAGE_MODEL", None) or "").strip()
    ordered: list[str] = []
    for model in (preferred, *IMAGE_MODEL_FALLBACKS):
        if model and model not in ordered:
            ordered.append(model)
    return tuple(ordered)


def _vertex_generate_url(model: str) -> str:
    project = (getattr(settings, "VERTEX_PROJECT_ID", None) or "").strip()
    location = (getattr(settings, "VERTEX_LOCATION", None) or "us-central1").strip()
    return (
        f"https://{location}-aiplatform.googleapis.com/v1/projects/{project}"
        f"/locations/{location}/publishers/google/models/{model}:generateContent"
    )


def post_vertex_image(model: str, body: dict[str, Any]) -> dict[str, Any]:
    token = get_vertex_access_token()
    req = urllib.request.Request(
        _vertex_generate_url(model),
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        return json.loads(res.read().decode("utf-8"))


def generate_image_content(body: dict[str, Any]) -> dict[str, Any]:
    if not vertex_image_configured():
        raise AiStyleError(
            "Vertex AI sozlanmagan. VERTEX_PROJECT_ID va service account JSON kerak.",
            503,
        )

    last_error: AiStyleError | None = None
    for model in _image_models():
        try:
            return post_vertex_image(model, body)
        except urllib.error.HTTPError as exc:
            err_body = _read_http_error_body(exc)
            logger.warning("Vertex image HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message = _map_vertex_http_error(exc.code, err_body)
            last_error = AiStyleError(message, 502 if exc.code >= 500 else 400)
            if exc.code == 404:
                continue
            raise last_error from exc
        except urllib.error.URLError as exc:
            logger.warning("Vertex image network error (%s): %s", model, exc)
            raise AiStyleError("Vertex AI serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError(
                "Rasm yaratish juda uzoq davom etdi. Qayta urinib ko'ring.",
                504,
            ) from exc
        except RuntimeError as exc:
            logger.warning("Vertex auth error: %s", exc)
            raise AiStyleError("Vertex AI autentifikatsiya xatosi.", 503) from exc

    if last_error:
        raise last_error
    raise AiStyleError("Rasm yaratish vaqtincha ishlamayapti. Keyinroq urinib ko'ring.", 502)


def _map_vertex_http_error(status: int, body: str) -> str:
    lowered = body.lower()
    if status in (401, 403) or "permission" in lowered or "denied" in lowered:
        return (
            "Vertex AI ruxsati yo'q. Service account ga "
            "'Vertex AI User' rolini bering va billing yoqilganini tekshiring."
        )
    if "billing" in lowered or "account disabled" in lowered:
        return "Google Cloud billing yoqilmagan yoki limit tugagan."
    return _map_gemini_http_error(status, body, kind="image")
