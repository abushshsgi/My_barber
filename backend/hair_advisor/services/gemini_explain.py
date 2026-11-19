"""Text-only Gemini JSON for Hair Advisor explanations."""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

from ai.services.errors import AiStyleError
from ai.services.gemini_style import _extract_json, _post_gemini

logger = logging.getLogger(__name__)

EXPLANATION_SCHEMA = {
    "type": "object",
    "required": ["explanation_uz", "summary_bullets_uz", "cautions_uz"],
    "properties": {
        "explanation_uz": {"type": "string", "maxLength": 1200},
        "summary_bullets_uz": {
            "type": "array",
            "items": {"type": "string", "maxLength": 280},
            "maxItems": 6,
        },
        "cautions_uz": {
            "type": "array",
            "items": {"type": "string", "maxLength": 280},
            "maxItems": 4,
        },
    },
}


def _model() -> str:
    return (
        getattr(settings, "HAIR_ADVISOR_LLM_MODEL", None)
        or getattr(settings, "GEMINI_CHAT_MODEL", None)
        or getattr(settings, "GEMINI_MODEL", "gemini-2.5-flash")
    ).strip()


def gemini_explain_json(prompt: str, *, timeout: int = 35) -> tuple[dict[str, Any], dict[str, Any]]:
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not api_key:
        raise AiStyleError("GEMINI_API_KEY yo'q.", 503)

    model = _model()
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.25,
            "responseMimeType": "application/json",
            "responseSchema": EXPLANATION_SCHEMA,
        },
    }
    started = time.perf_counter()
    last_exc: Exception | None = None
    payload = None
    for attempt in range(2):
        try:
            payload = _post_gemini(model, api_key, body)
            break
        except urllib.error.HTTPError as exc:
            last_exc = exc
            logger.warning("Hair advisor explain HTTP %s (attempt %s)", exc.code, attempt + 1)
            if exc.code in (429, 503) and attempt == 0:
                time.sleep(0.8)
                continue
            raise AiStyleError("AI tushuntirish vaqtincha mavjud emas.", 502) from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            last_exc = exc
            if attempt == 0:
                time.sleep(0.5)
                continue
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
    if payload is None:
        raise AiStyleError("AI javob bermadi.", 502) from last_exc

    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI javob bermadi.", 502)

    text = "".join(
        p.get("text", "")
        for p in ((candidates[0].get("content") or {}).get("parts") or [])
        if isinstance(p, dict)
    )
    data = _extract_json(text)
    usage_meta = payload.get("usageMetadata") or {}
    latency_ms = int((time.perf_counter() - started) * 1000)
    usage = {
        "model": model,
        "latency_ms": latency_ms,
        "prompt_tokens": int(usage_meta.get("promptTokenCount") or 0),
        "candidates_tokens": int(usage_meta.get("candidatesTokenCount") or 0),
        "total_tokens": int(usage_meta.get("totalTokenCount") or 0),
    }
    return data, usage


def validate_explanation_payload(data: dict[str, Any]) -> dict[str, Any]:
    exp = str(data.get("explanation_uz") or "").strip()[:1200]
    bullets = data.get("summary_bullets_uz")
    cautions = data.get("cautions_uz")
    if not exp:
        raise ValueError("explanation_uz bo'sh")
    if not isinstance(bullets, list):
        bullets = []
    if not isinstance(cautions, list):
        cautions = []
    return {
        "explanation_uz": exp,
        "summary_bullets_uz": [str(x).strip()[:280] for x in bullets if str(x).strip()][:6],
        "cautions_uz": [str(x).strip()[:280] for x in cautions if str(x).strip()][:4],
    }