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
    MORF_CHAT_MAX_HISTORY,
    MORF_CHAT_MAX_MESSAGE_LEN,
    MORF_CHAT_MAX_OUTPUT_TOKENS,
    MORF_CHAT_VOICE_MAX_OUTPUT_TOKENS,
    build_morf_chat_system_prompt,
    is_voice_mode,
)
from ai.services.errors import AiStyleError, map_gemini_http_error, read_http_error_body
from ai.usage_pricing import finalize_usage
from ai.services.vertex_auth import get_vertex_access_token, vertex_configured
from ai.services.vertex_client import build_vertex_generate_url, generate_content

logger = logging.getLogger(__name__)

ChatMessage = dict[str, str]


def _chat_model() -> str:
    configured = (getattr(settings, "GEMINI_CHAT_MODEL", None) or "").strip()
    return configured or "gemini-2.5-flash-lite"


def chat_limits_from_user(user) -> dict[str, Any]:
    from subscriptions.services import chat_token_snapshot

    snap = chat_token_snapshot(user)
    limit = snap["morph_chat_tokens_limit"]
    used = snap["morph_chat_tokens_used"]
    remaining = snap["morph_chat_tokens_remaining"]
    period = snap.get("morph_chat_tokens_period") or "month"
    warn_at = max(500, int(limit * 0.1)) if limit else 500
    return {
        "period": period,
        "token_limit": limit,
        "token_used": used,
        "token_remaining": remaining,
        "warn_at": warn_at,
        "should_warn": remaining <= warn_at,
        "daily_limit": limit,
        "daily_used": used,
        "daily_remaining": remaining,
    }


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
    from accounts.models import User
    from subscriptions.services import check_morph_entitlement

    user = User.objects.filter(pk=user_id).first()
    if not user:
        return None
    return check_morph_entitlement(user=user, kind="chat")


def _normalize_role(role: str) -> str:
    raw = (role or "").strip().lower()
    if raw in {"assistant", "model", "ai"}:
        return "model"
    return "user"


def sanitize_chat_history(messages: list[Any] | None) -> list[ChatMessage]:
    if not messages:
        return []
    cleaned: list[ChatMessage] = []
    for item in messages[-MORF_CHAT_MAX_HISTORY:]:
        if not isinstance(item, dict):
            continue
        role = _normalize_role(str(item.get("role") or ""))
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        cleaned.append({"role": role, "content": content[:MORF_CHAT_MAX_MESSAGE_LEN]})
    return cleaned


def build_chat_contents(user_message: str, history: list[ChatMessage]) -> list[dict[str, Any]]:
    """Gemini contents: history dublikatisiz, navbatma-navbat rollar."""
    prior = list(history)
    if prior and prior[-1]["role"] == "user" and prior[-1]["content"] == user_message:
        prior = prior[:-1]
    while prior and prior[0]["role"] == "model":
        prior = prior[1:]
    merged: list[ChatMessage] = []
    for msg in prior:
        if merged and merged[-1]["role"] == msg["role"]:
            merged[-1]["content"] = f"{merged[-1]['content']}\n{msg['content']}"
        else:
            merged.append({"role": msg["role"], "content": msg["content"]})
    contents: list[dict[str, Any]] = [
        {"role": item["role"], "parts": [{"text": item["content"]}]}
        for item in merged
    ]
    contents.append({"role": "user", "parts": [{"text": user_message}]})
    return contents


def _prompt_char_count(system_prompt: str, contents: list[dict[str, Any]]) -> int:
    total = len(system_prompt or "")
    for item in contents:
        for part in item.get("parts") or []:
            if isinstance(part, dict) and part.get("text"):
                total += len(str(part["text"]))
    return total


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
    return reply[:8000]


def extract_delta_text(payload: dict[str, Any]) -> str:
    """SSE chunk'dan qo'shiladigan matn."""
    texts: list[str] = []
    for cand in payload.get("candidates") or []:
        if not isinstance(cand, dict):
            continue
        parts = (cand.get("content") or {}).get("parts") or []
        for part in parts:
            if isinstance(part, dict) and part.get("text"):
                texts.append(str(part["text"]))
    return "".join(texts)


def parse_sse_payloads(raw: str) -> list[dict[str, Any]]:
    """To'liq SSE buffer'dan JSON obyektlar."""
    payloads: list[dict[str, Any]] = []
    normalized = raw.replace("\r\n", "\n")
    for block in normalized.split("\n\n"):
        data_lines: list[str] = []
        for line in block.split("\n"):
            if line.startswith("data:"):
                data_lines.append(line[5:].strip())
        data = "\n".join(data_lines).strip()
        if not data or data == "[DONE]":
            continue
        try:
            parsed = json.loads(data)
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            payloads.append(parsed)
    return payloads


def _stream_url(model: str, *, vertex: bool) -> str:
    if vertex:
        base = build_vertex_generate_url(model)
        return base.replace(":generateContent", ":streamGenerateContent") + "?alt=sse"
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:streamGenerateContent?alt=sse"
    )


def _iter_sse_payloads(res: Any) -> Any:
    buf = ""
    while True:
        chunk = res.read(1024)
        if not chunk:
            if buf.strip():
                yield from parse_sse_payloads(buf)
            break
        buf += chunk.decode("utf-8", errors="ignore")
        while "\n\n" in buf or "\r\n\r\n" in buf:
            sep = "\r\n\r\n" if "\r\n\r\n" in buf and (
                "\n\n" not in buf or buf.find("\r\n\r\n") < buf.find("\n\n")
            ) else "\n\n"
            event, buf = buf.split(sep, 1)
            yield from parse_sse_payloads(event + "\n\n")


def _chat_generation_config(context: dict[str, Any] | None) -> dict[str, Any]:
    if is_voice_mode(context):
        return {
            "temperature": 0.5,
            "maxOutputTokens": MORF_CHAT_VOICE_MAX_OUTPUT_TOKENS,
        }
    return {
        "temperature": 0.7,
        "maxOutputTokens": MORF_CHAT_MAX_OUTPUT_TOKENS,
    }


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
    contents = build_chat_contents(message, prior)

    body: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": _chat_generation_config(context),
    }

    model = _chat_model()
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
    usage_nums = finalize_usage(
        payload,
        kind="chat",
        prompt_chars=_prompt_char_count(system_prompt, contents),
        reply_chars=len(reply),
    )

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
            "daily_limit": None,
            "daily_used": None,
            "daily_remaining": None,
        },
    }


def _open_chat_stream(model: str, body: dict[str, Any], *, vertex: bool, api_key: str) -> Any:
    url = _stream_url(model, vertex=vertex)
    headers = {"Content-Type": "application/json"}
    if vertex:
        headers["Authorization"] = f"Bearer {get_vertex_access_token()}"
    else:
        headers["x-goog-api-key"] = api_key
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    return urllib.request.urlopen(req, timeout=60)


def stream_morf_chat_reply(
    *,
    user_message: str,
    history: list[Any] | None = None,
    context: dict[str, Any] | None = None,
):
    """Gemini SSE stream: delta matnlar, oxirida done + usage."""
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
    contents = build_chat_contents(message, prior)
    body: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": _chat_generation_config(context),
    }

    model = _chat_model()
    vertex = vertex_configured()
    provider = "vertex" if vertex else "studio"
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not vertex and not api_key:
        raise AiStyleError(
            "AI xizmati hozircha ulanmagan. "
            "VERTEX_SERVICE_ACCOUNT_JSON yoki GEMINI_API_KEY kerak.",
            503,
        )

    started = time.perf_counter()
    last_payload: dict[str, Any] = {}
    usage_payloads: list[dict[str, Any]] = []
    reply_parts: list[str] = []

    try:
        with _open_chat_stream(model, body, vertex=vertex, api_key=api_key) as res:
            for payload in _iter_sse_payloads(res):
                last_payload = payload
                if payload.get("usageMetadata") or payload.get("usage_metadata"):
                    usage_payloads.append(payload)
                delta = extract_delta_text(payload)
                if not delta:
                    continue
                used = sum(len(part) for part in reply_parts)
                room = 8000 - used
                if room <= 0:
                    break
                if len(delta) > room:
                    delta = delta[:room]
                reply_parts.append(delta)
                yield {"delta": delta}
                if used + len(delta) >= 8000:
                    break
    except urllib.error.HTTPError as exc:
        err_body = read_http_error_body(exc)
        logger.warning("Gemini stream HTTP %s (%s): %s", exc.code, model, err_body[:800])
        message_err = map_gemini_http_error(exc.code, err_body)
        raise AiStyleError(message_err, 502 if exc.code >= 500 else 400) from exc
    except urllib.error.URLError as exc:
        logger.warning("Gemini stream network error (%s): %s", model, exc)
        raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
    except TimeoutError as exc:
        raise AiStyleError("AI javob juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc

    reply = "".join(reply_parts)[:8000]
    if not reply.strip():
        raise AiStyleError("AI javob bermadi.", 502)

    latency_ms = int((time.perf_counter() - started) * 1000)
    usage_nums = finalize_usage(
        last_payload or {},
        kind="chat",
        extra_payloads=usage_payloads,
        prompt_chars=_prompt_char_count(system_prompt, contents),
        reply_chars=len(reply),
    )
    yield {
        "done": True,
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
            "daily_limit": None,
            "daily_used": None,
            "daily_remaining": None,
        },
    }
