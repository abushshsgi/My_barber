"""Runware REST client for Morf Try-On.

Official contract: POST https://api.runware.ai/v1 with a JSON task array.
The Python SDK is websocket-based; the Django worker is synchronous, so this
module uses a thread-local ``requests.Session`` (connection reuse, explicit
timeouts, no event loop).

Each call is a single attempt. The Try-On queue owns bounded exponential
backoff. This client never retries forever and never falls back to Gemini.
"""

from __future__ import annotations

import logging
import re
import threading
import uuid
from typing import Any
from urllib.parse import urlparse

import requests
from django.conf import settings

from .errors import AiStyleError

logger = logging.getLogger(__name__)

DEFAULT_API_URL = "https://api.runware.ai/v1"
MAX_RESULT_BYTES = 8 * 1024 * 1024
_tls = threading.local()

_DATA_URI_RE = re.compile(r"data:image/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+", re.I)
_BEARER_RE = re.compile(r"(?i)(bearer\s+)\S+")


def redact(text: str, secrets: list[str] | None = None) -> str:
    cleaned = _DATA_URI_RE.sub("[image]", text or "")
    cleaned = _BEARER_RE.sub(r"\1[redacted]", cleaned)
    for secret in secrets or []:
        if secret and len(secret) >= 6:
            cleaned = cleaned.replace(secret, "[redacted]")
    return cleaned[:400]


def http_session() -> requests.Session:
    session = getattr(_tls, "session", None)
    if session is None:
        session = requests.Session()
        _tls.session = session
    return session


def api_url() -> str:
    raw = (getattr(settings, "RUNWARE_API_URL", None) or DEFAULT_API_URL).strip()
    return raw or DEFAULT_API_URL


def timeout_seconds() -> int:
    try:
        value = int(getattr(settings, "RUNWARE_TRYON_TIMEOUT", 180) or 180)
    except (TypeError, ValueError):
        value = 180
    return max(30, min(value, 240))


def timeout_seconds_for_model(model: str) -> int:
    """FLUX 3 edit jobs often need >120s; fallbacks should fail faster."""
    base = timeout_seconds()
    key = (model or "").strip().lower()
    if "flux@3-image-klein" in key:
        return base
    return min(base, 120)


def _api_key() -> str:
    return (getattr(settings, "RUNWARE_API_KEY", None) or "").strip()


def _retry_after(response: requests.Response) -> float | None:
    raw = (response.headers or {}).get("Retry-After")
    if not raw:
        return None
    try:
        return max(1.0, min(120.0, float(raw)))
    except (TypeError, ValueError):
        return None


def _error_blob(errors: Any) -> str:
    if not isinstance(errors, list):
        return ""
    parts: list[str] = []
    for item in errors:
        if not isinstance(item, dict):
            continue
        code = str(item.get("code") or "")
        message = str(item.get("message") or "")
        parts.append(f"{code} {message}".strip())
    return " ".join(parts).lower()


def _raise_mapped(status: int, errors: Any, safe_body: str, secrets: list[str]) -> None:
    blob = redact(_error_blob(errors), secrets)
    logger.warning(
        "Runware try-on error status=%s code_blob=%s",
        status,
        blob or safe_body,
    )
    if status in (401, 403) or "apikey" in blob or "api key" in blob or "invalidapi" in blob:
        raise AiStyleError(
            "Runware API kaliti noto'g'ri. Administrator RUNWARE_API_KEY ni tekshirsin.",
            401,
            retryable=False,
        )
    if (
        status == 402
        or "insufficient" in blob
        or "balance" in blob
        or "credit" in blob
        or "funds" in blob
    ):
        raise AiStyleError(
            "Runware hisobida mablag' yetarli emas. Keyinroq urinib ko'ring.",
            402,
            retryable=False,
        )
    if "parameter" in blob or "seedimage" in blob or "strength" in blob:
        raise AiStyleError(
            "Try-on so'rovi rad etildi. Qayta urinib ko'ring.",
            400,
            retryable=False,
        )
    if "unsupported" in blob and ("edit" in blob or "reference" in blob or "operation" in blob):
        raise AiStyleError(
            "Bu Runware modeli rasm tahririni qo'llab-quvvatlamaydi. Try-on to'xtatildi.",
            400,
            retryable=False,
        )
    if status == 404 or (
        "model" in blob
        and "parameter" not in blob
        and ("not found" in blob or "unsupported" in blob or "unknown" in blob)
    ):
        raise AiStyleError(
            "Try-on modeli topilmadi. RUNWARE_TRYON_MODEL ni tekshiring.",
            400,
            retryable=False,
        )
    if "image" in blob and any(word in blob for word in ("invalid", "unsupported", "decode", "format")):
        raise AiStyleError("Rasm qabul qilinmadi. Boshqa surat yuklang.", 400, retryable=False)
    if status == 429 or "rate" in blob or "too many" in blob:
        raise AiStyleError(
            "Try-on hozir band. Birozdan so'ng qayta uriniladi.",
            429,
            retryable=True,
        )
    if status == 504 or "timeout" in blob or "timed out" in blob:
        raise AiStyleError("Try-on vaqti tugadi. Qayta urinib ko'ring.", 504, retryable=True)
    if status >= 500 or status == 0:
        raise AiStyleError(
            "Try-on xizmati vaqtincha ishlamayapti. Qayta urinib ko'ring.",
            502,
            retryable=True,
        )
    raise AiStyleError("Try-on so'rovi rad etildi. Qayta urinib ko'ring.", 400, retryable=False)


def _parse_payload(response: requests.Response, api_key: str) -> dict[str, Any]:
    safe = redact(response.text or "", [api_key])
    try:
        body = response.json()
    except ValueError as exc:
        logger.warning("Runware non-json status=%s body=%s", response.status_code, safe)
        raise AiStyleError(
            "Try-on xizmati vaqtincha ishlamayapti. Qayta urinib ko'ring.",
            502,
            retryable=True,
        ) from exc

    errors: Any = []
    data: Any = []
    if isinstance(body, dict):
        errors = body.get("errors") or []
        data = body.get("data") if "data" in body else body.get("results") or []
    elif isinstance(body, list):
        data = body

    status = int(response.status_code or 0)
    if status == 429:
        retry_after = _retry_after(response)
        logger.warning("Runware rate limit retry_after=%s", retry_after)
        raise AiStyleError(
            "Try-on hozir band. Birozdan so'ng qayta uriniladi.",
            429,
            retryable=True,
            retry_after=retry_after,
        )
    if errors or status >= 400:
        mapped = _retry_after(response)
        try:
            _raise_mapped(status, errors, safe, [api_key])
        except AiStyleError as exc:
            if exc.status == 429 and mapped is not None and exc.retry_after is None:
                exc.retry_after = mapped
            raise

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list) or not data or not isinstance(data[0], dict):
        logger.warning("Runware empty image result status=%s", status)
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    return data[0]


def run_image_inference(task: dict[str, Any]) -> dict[str, Any]:
    """One imageInference task. Does not retry."""
    api_key = _api_key()
    if not api_key:
        raise AiStyleError(
            "Try-on xizmati sozlanmagan (RUNWARE_API_KEY).",
            503,
            retryable=False,
        )

    model = str(task.get("model") or "")
    base_fields = {
        "taskType": "imageInference",
        "taskUUID": str(uuid.uuid4()),
        "deliveryMethod": "sync",
        "outputType": "URL",
        "outputFormat": "JPG",
        "numberResults": 1,
        "includeCost": True,
    }
    merged = {**base_fields, **task}
    # Task-level WEBP must not override: we always normalize to JPEG bytes server-side.
    merged["outputFormat"] = "JPG"
    payload = [merged]
    read_timeout = timeout_seconds_for_model(model)
    try:
        response = http_session().post(
            api_url(),
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=(10, read_timeout),
        )
    except requests.Timeout as exc:
        logger.warning("Runware try-on timeout after %ss", read_timeout)
        raise AiStyleError("Try-on vaqti tugadi. Qayta urinib ko'ring.", 504, retryable=True) from exc
    except requests.RequestException as exc:
        logger.warning("Runware try-on connection error: %s", type(exc).__name__)
        raise AiStyleError(
            "Try-on xizmati vaqtincha ishlamayapti. Qayta urinib ko'ring.",
            503,
            retryable=True,
        ) from exc
    return _parse_payload(response, api_key)


def _assert_result_host(url: str) -> None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    allowed = host == "runware.ai" or host.endswith(".runware.ai")
    if parsed.scheme != "https" or not allowed:
        logger.warning("Runware result host rejected")
        raise AiStyleError(
            "Try-on natijasini yuklab bo'lmadi. Qayta urinib ko'ring.",
            502,
            retryable=False,
        )


def download_image(url: str) -> bytes:
    """Download a temporary Runware image URL. The URL is not returned to clients."""
    raw_url = (url or "").strip()
    if not raw_url:
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    _assert_result_host(raw_url)
    read_timeout = timeout_seconds()
    try:
        response = http_session().get(raw_url, timeout=(10, read_timeout), stream=True)
    except requests.Timeout as exc:
        logger.warning("Runware image download timeout")
        raise AiStyleError("Try-on vaqti tugadi. Qayta urinib ko'ring.", 504, retryable=True) from exc
    except requests.RequestException as exc:
        logger.warning("Runware image download error: %s", type(exc).__name__)
        raise AiStyleError(
            "Try-on natijasini yuklab bo'lmadi. Qayta urinib ko'ring.",
            502,
            retryable=True,
        ) from exc

    status = int(response.status_code or 0)
    if status == 429:
        response.close()
        raise AiStyleError(
            "Try-on hozir band. Birozdan so'ng qayta uriniladi.",
            429,
            retryable=True,
            retry_after=_retry_after(response),
        )
    if status != 200:
        response.close()
        logger.warning("Runware image download status=%s", status)
        raise AiStyleError(
            "Try-on natijasini yuklab bo'lmadi. Qayta urinib ko'ring.",
            502,
            retryable=status >= 500,
        )

    chunks: list[bytes] = []
    total = 0
    try:
        for chunk in response.iter_content(64 * 1024):
            if not chunk:
                continue
            total += len(chunk)
            if total > MAX_RESULT_BYTES:
                logger.warning("Runware image download exceeded %s bytes", MAX_RESULT_BYTES)
                raise AiStyleError("Natija rasmi juda katta.", 502, retryable=False)
            chunks.append(chunk)
    finally:
        response.close()

    raw = b"".join(chunks)
    if not raw:
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    return raw
