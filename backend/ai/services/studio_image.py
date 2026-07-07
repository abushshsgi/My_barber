"""Google AI Studio — rasm generatsiya (GEMINI_API_KEY)."""

from __future__ import annotations

import json
import logging
import random
import time
import urllib.error
import urllib.request
from typing import Any, Literal

from django.conf import settings

from .errors import AiStyleError, map_gemini_http_error, read_http_error_body

logger = logging.getLogger(__name__)

STUDIO_IMAGE_MODEL = "gemini-3.1-flash-lite-image"
STUDIO_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def studio_image_configured() -> bool:
    return bool((getattr(settings, "GEMINI_API_KEY", None) or "").strip())


def studio_image_model() -> str:
    configured = (getattr(settings, "VERTEX_IMAGE_MODEL", None) or "").strip()
    return configured or STUDIO_IMAGE_MODEL


def generate_image_content(body: dict[str, Any]) -> dict[str, Any]:
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not api_key:
        raise AiStyleError(
            "GEMINI_API_KEY sozlanmagan. aistudio.google.com/apikey dan oling.",
            503,
        )

    model = studio_image_model()
    url = f"{STUDIO_API_BASE}/{model}:generateContent"
    payload_bytes = json.dumps(body).encode("utf-8")
    max_attempts = 15

    for attempt in range(max_attempts):
        req = urllib.request.Request(
            url,
            data=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            err_body = read_http_error_body(exc)
            if exc.code == 429 and attempt < max_attempts - 1:
                delay = min(120.0, (2**attempt) * 5 + random.uniform(2.0, 5.0))
                logger.warning(
                    "Studio image HTTP 429 (%s), retry %s/%s in %.1fs",
                    model,
                    attempt + 1,
                    max_attempts,
                    delay,
                )
                time.sleep(delay)
                continue
            logger.warning("Studio image HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message = map_gemini_http_error(exc.code, err_body, kind="image", model=model)
            status = 429 if exc.code == 429 else (502 if exc.code >= 500 else 400)
            raise AiStyleError(message, status) from exc
        except urllib.error.URLError as exc:
            logger.warning("Studio image network error (%s): %s", model, exc)
            raise AiStyleError("Google AI Studio serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError("Rasm generatsiya juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc

    raise AiStyleError("Rasm generatsiya muvaffaqiyatsiz tugadi.", 502)


def image_generation_provider() -> Literal["studio", "vertex"] | None:
    if studio_image_configured():
        return "studio"
    from .vertex_auth import vertex_image_configured

    if vertex_image_configured():
        return "vertex"
    return None
