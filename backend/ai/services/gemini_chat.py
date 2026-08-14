"""Morf AI chatbot — Gemini matn suhbati."""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings
from django.utils import timezone

from ai.chat_prompts import (
    MORF_CHAT_DAILY_LIMIT,
    MORF_CHAT_MAX_HISTORY,
    MORF_CHAT_MAX_MESSAGE_LEN,
    MORF_CHAT_MAX_OUTPUT_TOKENS,
    build_morf_chat_system_prompt,
)
from ai.services.errors import AiStyleError, map_gemini_http_error, read_http_error_body
from ai.services.gemini_style import _vision_model
from ai.usage_pricing import finalize_usage
from ai.services.vertex_auth import vertex_configured
from ai.services.vertex_client import generate_content

logger = logging.getLogger(__name__)

ChatMessage = dict[str, str]


def count_user_chat_today(user_id: int) -> int:
    from ai.models import AiGenerationUsage

    today = timezone.localdate()
    return AiGenerationUsage.objects.filter(
        user_id=user_id,
        kind="chat",
        status=AiGenerationUsage.Status.SUCCESS,
        created_at__date=today,
    ).count()


def check_chat_daily_limit(user_id: int) -> str | None:
    used = count_user_chat_today(user_id)
    if used >= MORF_CHAT_DAILY_LIMIT:
        return (
            f"Kunlik Morf AI chat limiti tugadi ({MORF_CHAT_DAILY_LIMIT} ta xabar). "
            "Ertaga qayting yoki try-on funksiyasidan foydalaning."
        )
    return None


def _normalize_role(role: str) -> str:
    raw = (role or "").strip().lower()
    if raw in {"assistant", "model", "ai"}:
        return "model"
    return "user"


def sanitize_chat_history(messages: list[Any] | None) -> list[ChatMessage]:
    if not messages:
        return []
    cleaned: list[ChatMessage] = []
    for item in messages[-MORF_CHAT_MAX_HISTORY :]:
        if not isinstance(item, dict):
            continue
        role = _normalize_role(str(item.get("role") or ""))
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        cleaned.append({"role": role, "content": content[:MORF_CHAT_MAX_MESSAGE_LEN]})
    return cleaned


def _post_gemini(model: str, api_key: str, body: dict[str, Any]) -> dict[str, Any]:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=45) as res:
        return json.loads(res.read().decode("utf-8"))


def _extract_reply_text(payload: dict[str, Any]) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI javob bermadi.", 502)
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text_parts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
    reply = "\n".join(text_parts).strip()
    if not reply:
        raise AiStyleError("AI javob bermadi.", 502)
    return reply[:4000]


def generate_morf_chat_reply(
    *,
    user_message: str,
    history: list[Any] | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    message = (user_message or "").strip()
    if not message:
        raise AiStyleError("Xabar bo'sh bo'lmasligi kerak.", 400)
    if len(message) > MORF_CHAT_MAX_MESSAGE_LEN:
        raise AiStyleError(
            f"Xabar {MORF_CHAT_MAX_MESSAGE_LEN} belgidan oshmasligi kerak.",
            400,
        )

    prior = sanitize_chat_history(history)
    system_prompt = build_morf_chat_system_prompt(context)

    contents: list[dict[str, Any]] = []
    for msg in prior:
        contents.append(
            {
                "role": msg["role"],
                "parts": [{"text": msg["content"]}],
            }
        )
    contents.append({"role": "user", "parts": [{"text": message}]})

    body: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "temperature": 0.65,
            "maxOutputTokens": MORF_CHAT_MAX_OUTPUT_TOKENS,
        },
    }

    model = _vision_model()
    provider = "vertex" if vertex_configured() else "studio"
    started = time.perf_counter()

    if vertex_configured():
        try:
            payload = generate_content(model, body, timeout=45, kind="general")
        except AiStyleError:
            raise
        except Exception as exc:
            logger.warning("Vertex chat error (%s): %s", model, exc)
            raise AiStyleError("Morf AI chat vaqtincha ishlamayapti.", 502) from exc
    else:
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not api_key:
            raise AiStyleError(
                "AI xizmati hozircha ulanmagan. "
                "VERTEX_SERVICE_ACCOUNT_JSON yoki GEMINI_API_KEY kerak.",
                503,
            )
        try:
            payload = _post_gemini(model, api_key, body)
        except urllib.error.HTTPError as exc:
            err_body = read_http_error_body(exc)
            logger.warning("Gemini chat HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message_err = map_gemini_http_error(exc.code, err_body)
            raise AiStyleError(message_err, 502 if exc.code >= 500 else 400) from exc
        except urllib.error.URLError as exc:
            logger.warning("Gemini chat network error (%s): %s", model, exc)
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError("AI javob juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    reply = _extract_reply_text(payload)
    usage_nums = finalize_usage(payload, kind="analyze")

    return {
        "reply": reply,
        "usage": {
            "prompt": message[:500],
            "model": model,
            "provider": provider,
            "latency_ms": latency_ms,
            "prompt_tokens": usage_nums["prompt_tokens"],
            "candidates_tokens": usage_nums["candidates_tokens"],
            "thoughts_tokens": usage_nums["thoughts_tokens"],
            "total_tokens": usage_nums["total_tokens"],
            "cost_usd": usage_nums["cost_usd"],
            "tokens_estimated": usage_nums["tokens_estimated"],
        },
        "limits": {
            "daily_limit": MORF_CHAT_DAILY_LIMIT,
            "daily_used": None,
            "daily_remaining": None,
        },
    }
