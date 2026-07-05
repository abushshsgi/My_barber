"""Google Cloud Vertex AI — service account orqali access token."""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

_VERTEX_SCOPE = ("https://www.googleapis.com/auth/cloud-platform",)


def _load_service_account_info() -> dict[str, Any] | None:
    raw_json = (getattr(settings, "VERTEX_SERVICE_ACCOUNT_JSON", None) or "").strip()
    if raw_json:
        try:
            return json.loads(raw_json)
        except json.JSONDecodeError:
            logger.warning("VERTEX_SERVICE_ACCOUNT_JSON not valid JSON")
            return None

    creds_path = (getattr(settings, "GOOGLE_APPLICATION_CREDENTIALS", None) or "").strip()
    if not creds_path:
        creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if creds_path and os.path.isfile(creds_path):
        try:
            with open(creds_path, encoding="utf-8") as fh:
                return json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Could not read GOOGLE_APPLICATION_CREDENTIALS: %s", exc)
            return None

    return None


def vertex_image_configured() -> bool:
    project = (getattr(settings, "VERTEX_PROJECT_ID", None) or "").strip()
    if not project:
        return False
    return _load_service_account_info() is not None


@lru_cache(maxsize=1)
def _cached_credentials():
    from google.oauth2 import service_account

    info = _load_service_account_info()
    if info is None:
        raise RuntimeError("Vertex service account not configured")
    return service_account.Credentials.from_service_account_info(info, scopes=_VERTEX_SCOPE)


def get_vertex_access_token() -> str:
    import google.auth.transport.requests

    credentials = _cached_credentials()
    credentials.refresh(google.auth.transport.requests.Request())
    token = credentials.token
    if not token:
        raise RuntimeError("Vertex access token empty")
    return token


def clear_vertex_auth_cache() -> None:
    _cached_credentials.cache_clear()
