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
    MORF_CHAT_MODEL_HISTORY,
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


_RETRY_STATUS = {429, 500, 502, 503, 504}
_CHAT_ATTEMPTS = 3


def _sleep_backoff(attempt: int) -> None:
    time.sleep(min(8.0, 0.4 * (2**attempt)))


def _status_from_http(code: int) -> int:
    if code == 429:
        return 429
    if code == 504:
        return 504
    if code >= 500:
        return 502
    return 400


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


def _model_history(history: list[Any] | None) -> list[ChatMessage]:
    return sanitize_chat_history(history)[-MORF_CHAT_MODEL_HISTORY:]


def _call_gemini_chat(
    model: str,
    body: dict[str, Any],
    *,
    vertex: bool,
    api_key: str,
) -> dict[str, Any]:
    """429, 5xx va timeout uchun cheklangan exponential backoff."""
    last_error: Exception | None = None
    for attempt in range(_CHAT_ATTEMPTS):
        try:
            if vertex:
                return generate_content(
                    model,
                    body,
                    timeout=45,
                    kind="general",
                    max_retries=0,
                )
            return _post_gemini(model, api_key, body)
        except AiStyleError as exc:
            last_error = exc
            if exc.status not in _RETRY_STATUS or attempt >= _CHAT_ATTEMPTS - 1:
                raise
            logger.warning("Chat retry %s after status %s", attempt + 1, exc.status)
            _sleep_backoff(attempt)
        except urllib.error.HTTPError as exc:
            retryable = exc.code in _RETRY_STATUS and attempt < _CHAT_ATTEMPTS - 1
            if retryable:
                try:
                    exc.read()
                except Exception:
                    pass
                exc.close()
                logger.warning("Chat HTTP %s retry %s", exc.code, attempt + 1)
                _sleep_backoff(attempt)
                continue
            err_body = read_http_error_body(exc)
            logger.warning("Gemini chat HTTP %s (%s): %s", exc.code, model, err_body[:800])
            raise AiStyleError(
                map_gemini_http_error(exc.code, err_body),
                _status_from_http(exc.code),
            ) from exc
        except TimeoutError as exc:
            last_error = exc
            if attempt >= _CHAT_ATTEMPTS - 1:
                raise AiStyleError(
                    "AI javob juda uzoq davom etdi. Qayta urinib ko'ring.",
                    504,
                ) from exc
            logger.warning("Chat timeout retry %s", attempt + 1)
            _sleep_backoff(attempt)
        except urllib.error.URLError as exc:
            timed_out = isinstance(getattr(exc, "reason", None), TimeoutError) or (
                "timed out" in str(exc).lower()
            )
            if timed_out and attempt < _CHAT_ATTEMPTS - 1:
                logger.warning("Chat network timeout retry %s", attempt + 1)
                _sleep_backoff(attempt)
                continue
            logger.warning("Gemini chat network error (%s): %s", model, exc)
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
    raise AiStyleError("Morf AI chat vaqtincha ishlamayapti.", 502) from last_error


def _empty_usage(message: str, *, model: str = "", provider: str = "local") -> dict[str, Any]:
    return {
        "prompt": message[:500],
        "model": model,
        "provider": provider,
        "latency_ms": 0,
        "prompt_tokens": 0,
        "candidates_tokens": 0,
        "thoughts_tokens": 0,
        "total_tokens": 0,
        "cost_usd": 0,
        "tokens_estimated": False,
    }


def _pack_chat_result(
    *,
    reply: str,
    usage: dict[str, Any],
    response_type: str = "text",
    hairstyles: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "reply": reply,
        "message": reply,
        "type": response_type,
        "hairstyles": hairstyles or [],
        "usage": usage,
        "limits": {
            "daily_limit": None,
            "daily_used": None,
            "daily_remaining": None,
        },
    }


def _selection_config() -> dict[str, Any]:
    return {
        "temperature": 0.4,
        "maxOutputTokens": MORF_CHAT_MAX_OUTPUT_TOKENS,
        "responseMimeType": "application/json",
        "responseSchema": {
            "type": "OBJECT",
            "properties": {
                "message": {"type": "STRING"},
                "style_ids": {"type": "ARRAY", "items": {"type": "STRING"}},
            },
            "required": ["message", "style_ids"],
        },
    }


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


def _validated_message(user_message: str) -> str:
    message = (user_message or "").strip()
    if not message:
        raise AiStyleError("Xabar bo'sh bo'lmasligi kerak.", 400)
    if len(message) > MORF_CHAT_MAX_MESSAGE_LEN:
        raise AiStyleError(
            f"Xabar {MORF_CHAT_MAX_MESSAGE_LEN} belgidan oshmasligi kerak.",
            400,
        )
    return message


def _provider_ready() -> tuple[str, bool, str]:
    model = _chat_model()
    vertex = vertex_configured()
    api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
    if not vertex and not api_key:
        raise AiStyleError(
            "AI xizmati hozircha ulanmagan. "
            "VERTEX_SERVICE_ACCOUNT_JSON yoki GEMINI_API_KEY kerak.",
            503,
        )
    return model, vertex, api_key


def _invoke_chat(body: dict[str, Any]) -> tuple[dict[str, Any], str, str, int]:
    model, vertex, api_key = _provider_ready()
    provider = "vertex" if vertex else "studio"
    started = time.perf_counter()
    try:
        payload = _call_gemini_chat(model, body, vertex=vertex, api_key=api_key)
    except AiStyleError:
        raise
    except Exception as exc:
        logger.warning("Chat provider error (%s): %s", model, exc)
        raise AiStyleError("Morf AI chat vaqtincha ishlamayapti.", 502) from exc
    latency_ms = int((time.perf_counter() - started) * 1000)
    return payload, model, provider, latency_ms


def _usage_from_payload(
    *,
    message: str,
    payload: dict[str, Any],
    system_prompt: str,
    contents: list[dict[str, Any]],
    reply: str,
    model: str,
    provider: str,
    latency_ms: int,
) -> dict[str, Any]:
    usage_nums = finalize_usage(
        payload,
        kind="chat",
        prompt_chars=_prompt_char_count(system_prompt, contents),
        reply_chars=len(reply),
    )
    return {
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
    }


def _finish_plain_reply(
    *,
    message: str,
    prior: list[ChatMessage],
    context: dict[str, Any] | None,
    system_prompt: str,
    contents: list[dict[str, Any]],
    generation_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from ai.services.chat_catalog import parse_style_selection, strip_booking_cta

    body: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": generation_config or _chat_generation_config(context),
    }
    payload, model, provider, latency_ms = _invoke_chat(body)
    raw = _extract_reply_text(payload)
    reply, _ids = parse_style_selection(raw)
    if not reply:
        reply = raw
    reply = strip_booking_cta(reply)
    usage = _usage_from_payload(
        message=message,
        payload=payload,
        system_prompt=system_prompt,
        contents=contents,
        reply=reply,
        model=model,
        provider=provider,
        latency_ms=latency_ms,
    )
    return _pack_chat_result(reply=reply, usage=usage, response_type="text")


def _finish_catalog_reply(
    *,
    message: str,
    prior: list[ChatMessage],
    context: dict[str, Any] | None,
    plan: dict[str, Any],
) -> dict[str, Any]:
    from ai.services.chat_catalog import (
        MAX_PICKS,
        build_catalog_contents,
        build_catalog_fallback_contents,
        catalog_addendum,
        fallback_recommendation_message,
        parse_style_selection,
        resolve_recommendation_cards,
        strip_booking_cta,
        strip_invented_image_links,
    )

    system_prompt = build_morf_chat_system_prompt(
        context,
        user_message=message,
        history=prior,
    ) + catalog_addendum(plan)
    contents = build_catalog_contents(message, prior, plan)
    selecting = plan.get("mode") == "select"
    config = _selection_config() if selecting else _chat_generation_config(context)
    body: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": config,
    }
    try:
        payload, model, provider, latency_ms = _invoke_chat(body)
    except AiStyleError as exc:
        if exc.status != 400 or not selecting:
            raise
        # Function-call + JSON schema ba'zi modellarda 400. Katalog matnini
        # alohida xabar qilib, avval yana JSON, keyin oddiy matn so'raymiz.
        body["contents"] = build_catalog_fallback_contents(message, prior, plan)
        body["generationConfig"] = _selection_config()
        contents = body["contents"]
        try:
            payload, model, provider, latency_ms = _invoke_chat(body)
        except AiStyleError as retry_exc:
            if retry_exc.status != 400:
                raise
            body["generationConfig"] = _chat_generation_config(context)
            payload, model, provider, latency_ms = _invoke_chat(body)
    raw = _extract_reply_text(payload)
    selected_message, style_ids = parse_style_selection(raw)
    limit = int(plan.get("style_limit") or MAX_PICKS)
    cards = resolve_recommendation_cards(plan, style_ids, limit=limit)
    reply = selected_message
    raw_is_json = raw.lstrip().startswith("{") or raw.lstrip().startswith("```")
    if not reply and not raw_is_json:
        reply = raw
    if cards:
        reply = strip_invented_image_links(reply)
    if not reply and (cards or selecting):
        reply = fallback_recommendation_message(message, prior)
    if not reply:
        reply = raw
    reply = strip_booking_cta(reply)
    if not reply.strip():
        raise AiStyleError("AI javob bermadi.", 502)
    usage = _usage_from_payload(
        message=message,
        payload=payload,
        system_prompt=system_prompt,
        contents=contents,
        reply=reply,
        model=model,
        provider=provider,
        latency_ms=latency_ms,
    )
    response_type = "hairstyle_recommendation" if cards else "text"
    return _pack_chat_result(
        reply=reply,
        usage=usage,
        response_type=response_type,
        hairstyles=cards,
    )


def should_structure_chat(
    message: str,
    history: list[Any] | None,
    context: dict[str, Any] | None,
) -> bool:
    from ai.services.chat_catalog import booking_enabled, is_booking_request, wants_hairstyle_recommendation

    ctx = context or {}
    if str(ctx.get("feature") or "") == "care_album_progress_story":
        return False
    if is_booking_request(message) and not booking_enabled():
        if is_voice_mode(ctx) or not wants_hairstyle_recommendation(message, history):
            return True
    if is_voice_mode(ctx):
        return False
    return wants_hairstyle_recommendation(message, history)


def generate_morf_chat_reply(
    *,
    user_message: str,
    history: list[Any] | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from ai.services.chat_catalog import (
        booking_enabled,
        audience_needed_reply,
        booking_unavailable_reply,
        is_booking_request,
        no_catalog_image_reply,
        plan_catalog_turn,
        wants_hairstyle_recommendation,
    )

    message = _validated_message(user_message)
    prior = _model_history(history)
    booking_only = (
        is_booking_request(message)
        and not booking_enabled()
        and not wants_hairstyle_recommendation(message, prior)
    )
    if booking_only:
        reply = booking_unavailable_reply(message, prior)
        return _pack_chat_result(
            reply=reply,
            usage=_empty_usage(message),
            response_type="text",
        )

    plan = plan_catalog_turn(message, prior, context)
    if plan is not None and plan.get("mode") != "select":
        reply = (
            audience_needed_reply(message, prior)
            if plan.get("mode") == "need_audience"
            else no_catalog_image_reply(message, prior)
        )
        return _pack_chat_result(
            reply=reply,
            usage=_empty_usage(message),
            response_type="text",
            hairstyles=[],
        )
    if plan is not None:
        return _finish_catalog_reply(
            message=message,
            prior=prior,
            context=context,
            plan=plan,
        )

    system_prompt = build_morf_chat_system_prompt(
        context,
        user_message=message,
        history=prior,
    )
    contents = build_chat_contents(message, prior)
    return _finish_plain_reply(
        message=message,
        prior=prior,
        context=context,
        system_prompt=system_prompt,
        contents=contents,
    )


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


def _open_chat_stream_retry(model: str, body: dict[str, Any], *, vertex: bool, api_key: str) -> Any:
    last_error: Exception | None = None
    for attempt in range(_CHAT_ATTEMPTS):
        try:
            return _open_chat_stream(model, body, vertex=vertex, api_key=api_key)
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in _RETRY_STATUS and attempt < _CHAT_ATTEMPTS - 1:
                try:
                    exc.read()
                except Exception:
                    pass
                exc.close()
                logger.warning("Chat stream HTTP %s retry %s", exc.code, attempt + 1)
                _sleep_backoff(attempt)
                continue
            err_body = read_http_error_body(exc)
            logger.warning("Gemini stream HTTP %s (%s): %s", exc.code, model, err_body[:800])
            raise AiStyleError(
                map_gemini_http_error(exc.code, err_body),
                _status_from_http(exc.code),
            ) from exc
        except TimeoutError as exc:
            last_error = exc
            if attempt >= _CHAT_ATTEMPTS - 1:
                raise AiStyleError(
                    "AI javob juda uzoq davom etdi. Qayta urinib ko'ring.",
                    504,
                ) from exc
            _sleep_backoff(attempt)
        except urllib.error.URLError as exc:
            timed_out = isinstance(getattr(exc, "reason", None), TimeoutError) or (
                "timed out" in str(exc).lower()
            )
            if timed_out and attempt < _CHAT_ATTEMPTS - 1:
                _sleep_backoff(attempt)
                continue
            logger.warning("Gemini stream network error (%s): %s", model, exc)
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
    raise AiStyleError("Morf AI chat vaqtincha ishlamayapti.", 502) from last_error


def stream_morf_chat_reply(
    *,
    user_message: str,
    history: list[Any] | None = None,
    context: dict[str, Any] | None = None,
):
    """Gemini SSE stream: delta matnlar, oxirida done + usage."""
    message = _validated_message(user_message)
    prior = _model_history(history)
    if should_structure_chat(message, prior, context):
        result = generate_morf_chat_reply(
            user_message=message,
            history=prior,
            context=context,
        )
        reply = str(result.get("reply") or "")
        if reply:
            yield {"delta": reply}
        yield {
            "done": True,
            "reply": reply,
            "type": result.get("type") or "text",
            "hairstyles": result.get("hairstyles") or [],
            "usage": result.get("usage") or {},
            "limits": result.get("limits") or {},
        }
        return

    system_prompt = build_morf_chat_system_prompt(
        context,
        user_message=message,
        history=prior,
    )
    contents = build_chat_contents(message, prior)
    body: dict[str, Any] = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": _chat_generation_config(context),
    }

    model, vertex, api_key = _provider_ready()
    provider = "vertex" if vertex else "studio"

    started = time.perf_counter()
    last_payload: dict[str, Any] = {}
    usage_payloads: list[dict[str, Any]] = []
    reply_parts: list[str] = []

    try:
        with _open_chat_stream_retry(model, body, vertex=vertex, api_key=api_key) as res:
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
        raise AiStyleError(message_err, _status_from_http(exc.code)) from exc
    except urllib.error.URLError as exc:
        logger.warning("Gemini stream network error (%s): %s", model, exc)
        raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
    except TimeoutError as exc:
        raise AiStyleError("AI javob juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc

    from ai.services.chat_catalog import strip_booking_cta

    reply = strip_booking_cta("".join(reply_parts)[:8000])
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
        "type": "text",
        "hairstyles": [],
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
