"""Vertex AI generateContent — scan, tahlil va rasm (GCP $300 kredit)."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

from .errors import AiStyleError, map_gemini_http_error, read_http_error_body
from .vertex_auth import get_vertex_access_token, vertex_configured

logger = logging.getLogger(__name__)


def _vertex_generate_url(model: str) -> str:
    project = (getattr(settings, "VERTEX_PROJECT_ID", None) or "").strip()
    location = (getattr(settings, "VERTEX_LOCATION", None) or "us-central1").strip()
    return (
        f"https://{location}-aiplatform.googleapis.com/v1/projects/{project}"
        f"/locations/{location}/publishers/google/models/{model}:generateContent"
    )


def _map_vertex_http_error(status: int, body: str, *, kind: str = "general") -> str:
    lowered = body.lower()
    if status in (401, 403) or "permission" in lowered or "denied" in lowered:
        return (
            "Vertex AI ruxsati yo'q. Service account ga "
            "'Vertex AI User' rolini bering va billing yoqilganini tekshiring."
        )
    if "billing" in lowered or "account disabled" in lowered:
        return "Google Cloud billing yoqilmagan yoki $300 kredit tugagan."
    if status == 404:
        if kind == "image":
            return "Rasm modeli topilmadi. VERTEX_IMAGE_MODEL ni tekshiring."
        return "AI model topilmadi. GEMINI_MODEL ni tekshiring."
    return map_gemini_http_error(status, body, kind=kind)


def generate_content(
    model: str,
    body: dict[str, Any],
    *,
    timeout: int = 60,
    kind: str = "general",
) -> dict[str, Any]:
    if not vertex_configured():
        raise AiStyleError(
            "Vertex AI sozlanmagan. VERTEX_PROJECT_ID va VERTEX_SERVICE_ACCOUNT_JSON kerak.",
            503,
        )

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

    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        err_body = read_http_error_body(exc)
        logger.warning("Vertex HTTP %s (%s): %s", exc.code, model, err_body[:800])
        message = _map_vertex_http_error(exc.code, err_body, kind=kind)
        raise AiStyleError(message, 502 if exc.code >= 500 else 400) from exc
    except urllib.error.URLError as exc:
        logger.warning("Vertex network error (%s): %s", model, exc)
        raise AiStyleError("Vertex AI serveriga ulanib bo'lmadi.", 502) from exc
    except TimeoutError as exc:
        raise AiStyleError("AI so'rov juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc
    except RuntimeError as exc:
        logger.warning("Vertex auth error: %s", exc)
        raise AiStyleError("Vertex AI autentifikatsiya xatosi.", 503) from exc
