"""Vertex AI generateContent — scan, tahlil va rasm (GCP $300 kredit)."""

from __future__ import annotations

import json
import logging
import random
import time
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

from .errors import AiStyleError, map_gemini_http_error, read_http_error_body
from .vertex_auth import get_vertex_access_token, vertex_configured

logger = logging.getLogger(__name__)


def build_vertex_generate_url(model: str, *, location: str | None = None) -> str:
    project = (getattr(settings, "VERTEX_PROJECT_ID", None) or "").strip()
    loc = (location or getattr(settings, "VERTEX_LOCATION", None) or "us-central1").strip()
    if not loc:
        loc = "us-central1"
    path = (
        f"/v1/projects/{project}/locations/{loc}/publishers/google/models/{model}:generateContent"
    )
    if loc == "global":
        return f"https://aiplatform.googleapis.com{path}"
    return f"https://{loc}-aiplatform.googleapis.com{path}"


def _vertex_generate_url(model: str, *, location: str | None = None) -> str:
    return build_vertex_generate_url(model, location=location)


def _map_vertex_http_error(status: int, body: str, *, kind: str = "general") -> str:
    lowered = body.lower()
    if status in (401, 403) or "permission" in lowered or "denied" in lowered:
        return (
            "Vertex AI ruxsati yo'q. Service account ga "
            "'Vertex AI User' rolini bering va billing yoqilganini tekshiring."
        )
    if "billing" in lowered or "account disabled" in lowered:
        return "Google Cloud billing yoqilmagan yoki $300 kredit tugagan."
    if status == 429 or "resource_exhausted" in lowered or "resource has been exhausted" in lowered:
        return "Morph AI hozir ishlamayapti. Keyinroq urinib ko'ring."
    if status == 404:
        if kind == "image":
            return (
                "Rasm modeli topilmadi. "
                "VERTEX_IMAGE_LOCATION=global va VERTEX_IMAGE_MODEL=gemini-3.1-flash-lite-image ni tekshiring."
            )
        return "AI model topilmadi. GEMINI_MODEL ni tekshiring."
    return map_gemini_http_error(status, body, kind=kind)


def generate_content(
    model: str,
    body: dict[str, Any],
    *,
    timeout: int = 60,
    kind: str = "general",
    location: str | None = None,
) -> dict[str, Any]:
    if not vertex_configured():
        raise AiStyleError(
            "Vertex AI sozlanmagan. VERTEX_PROJECT_ID va VERTEX_SERVICE_ACCOUNT_JSON kerak.",
            503,
        )

    token = get_vertex_access_token()
    url = _vertex_generate_url(model, location=location)
    payload_bytes = json.dumps(body).encode("utf-8")
    max_attempts = 15 if kind == "image" else 1

    for attempt in range(max_attempts):
        req = urllib.request.Request(
            url,
            data=payload_bytes,
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
            if exc.code == 429 and attempt < max_attempts - 1:
                delay = min(120.0, (2**attempt) * 5 + random.uniform(2.0, 5.0))
                logger.warning(
                    "Vertex HTTP 429 (%s), retry %s/%s in %.1fs",
                    model,
                    attempt + 1,
                    max_attempts,
                    delay,
                )
                time.sleep(delay)
                token = get_vertex_access_token()
                continue
            logger.warning("Vertex HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message = _map_vertex_http_error(exc.code, err_body, kind=kind)
            if exc.code == 429:
                http_status = 429
            elif exc.code == 404:
                http_status = 404
            elif exc.code >= 500:
                http_status = 502
            else:
                http_status = 400
            raise AiStyleError(message, http_status) from exc
        except urllib.error.URLError as exc:
            logger.warning("Vertex network error (%s): %s", model, exc)
            raise AiStyleError("Vertex AI serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError("AI so'rov juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc
        except RuntimeError as exc:
            logger.warning("Vertex auth error: %s", exc)
            raise AiStyleError("Vertex AI autentifikatsiya xatosi.", 503) from exc

    raise AiStyleError("AI so'rov muvaffaqiyatsiz tugadi.", 502)
