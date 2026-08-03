"""Firebase Cloud Messaging — user Capacitor Android push."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from functools import lru_cache
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

_FCM_SCOPE = ("https://www.googleapis.com/auth/firebase.messaging",)
_LEGACY_URL = "https://fcm.googleapis.com/fcm/send"


def _load_firebase_service_account() -> dict[str, Any] | None:
    raw = (getattr(settings, "FIREBASE_SERVICE_ACCOUNT_JSON", None) or "").strip()
    if not raw:
        # Vertex SA ko‘pincha bir xil Firebase/GCP loyiha — fallback.
        raw = (getattr(settings, "VERTEX_SERVICE_ACCOUNT_JSON", None) or "").strip()
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("FIREBASE_SERVICE_ACCOUNT_JSON / VERTEX_SERVICE_ACCOUNT_JSON invalid JSON")
        return None


def fcm_configured() -> bool:
    if (getattr(settings, "FCM_SERVER_KEY", None) or "").strip():
        return True
    info = _load_firebase_service_account()
    if not info:
        return False
    project = (
        (getattr(settings, "FCM_PROJECT_ID", None) or "").strip()
        or str(info.get("project_id") or "").strip()
    )
    return bool(project)


@lru_cache(maxsize=1)
def _fcm_credentials():
    from google.oauth2 import service_account

    info = _load_firebase_service_account()
    if info is None:
        raise RuntimeError("Firebase service account not configured")
    return service_account.Credentials.from_service_account_info(info, scopes=_FCM_SCOPE)


def _fcm_access_token() -> str:
    import google.auth.transport.requests

    credentials = _fcm_credentials()
    credentials.refresh(google.auth.transport.requests.Request())
    if not credentials.token:
        raise RuntimeError("FCM access token empty")
    return credentials.token


def _project_id() -> str:
    explicit = (getattr(settings, "FCM_PROJECT_ID", None) or "").strip()
    if explicit:
        return explicit
    info = _load_firebase_service_account() or {}
    return str(info.get("project_id") or "").strip()


def _stringify_data(data: dict | None) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in (data or {}).items():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            out[str(key)] = json.dumps(value, ensure_ascii=False)
        else:
            out[str(key)] = str(value)
    return out


def send_fcm_legacy(tokens: list[str], *, title: str, body: str, data: dict | None = None) -> None:
    server_key = (getattr(settings, "FCM_SERVER_KEY", None) or "").strip()
    if not server_key or not tokens:
        return
    payload = {
        "registration_ids": tokens[:1000],
        "notification": {"title": title, "body": body or title},
        "data": _stringify_data(data),
        "priority": "high",
    }
    try:
        req = urllib.request.Request(
            _LEGACY_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"key={server_key}",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status >= 400:
                logger.warning("FCM legacy HTTP %s", resp.status)
    except urllib.error.URLError as exc:
        logger.warning("FCM legacy failed: %s", exc)


def send_fcm_http_v1(tokens: list[str], *, title: str, body: str, data: dict | None = None) -> None:
    project = _project_id()
    if not project or not tokens:
        return
    try:
        access = _fcm_access_token()
    except Exception as exc:
        logger.warning("FCM auth failed: %s", exc)
        return

    url = f"https://fcm.googleapis.com/v1/projects/{project}/messages:send"
    data_str = _stringify_data(data)
    for token in tokens:
        message = {
            "message": {
                "token": token,
                "notification": {"title": title, "body": body or title},
                "data": data_str,
                "android": {
                    "priority": "HIGH",
                    "notification": {
                        "channel_id": "mysaloon_default",
                        "sound": "default",
                    },
                },
            }
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(message).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {access}",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status >= 400:
                    logger.warning("FCM v1 HTTP %s for token …%s", resp.status, token[-8:])
        except urllib.error.HTTPError as exc:
            body_text = ""
            try:
                body_text = exc.read().decode("utf-8", errors="replace")[:400]
            except Exception:
                pass
            # Invalid token — o‘chirish
            if exc.code in (400, 404) and "UNREGISTERED" in body_text.upper():
                from .models import UserPushToken

                UserPushToken.objects.filter(token=token).delete()
            logger.warning("FCM v1 failed (%s): %s", exc.code, body_text or exc)
        except urllib.error.URLError as exc:
            logger.warning("FCM v1 network: %s", exc)


def send_fcm_push(
    tokens: list[str],
    *,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    clean = [t for t in tokens if t and str(t).strip()]
    if not clean:
        return
    if (getattr(settings, "FCM_SERVER_KEY", None) or "").strip():
        send_fcm_legacy(clean, title=title, body=body, data=data)
        return
    send_fcm_http_v1(clean, title=title, body=body, data=data)


def send_user_fcm_push(
    user,
    *,
    title: str,
    body: str,
    payload: dict | None = None,
) -> None:
    if not fcm_configured():
        return
    from .models import UserPushToken

    tokens = list(UserPushToken.objects.filter(user=user).values_list("token", flat=True))
    send_fcm_push(tokens, title=title, body=body or title, data=payload)


def clear_fcm_auth_cache() -> None:
    _fcm_credentials.cache_clear()
