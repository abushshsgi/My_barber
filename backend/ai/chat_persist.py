"""Morf AI chat transcript — DB ga saqlash / sync."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.utils.dateparse import parse_datetime

from ai.models import (
    CHAT_MESSAGES_MAX_PER_THREAD,
    CHAT_THREADS_MAX_PER_USER,
    MorphAiChatMessage,
    MorphAiChatThread,
)

logger = logging.getLogger(__name__)


def _money(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal("0")


def _preview(text: str, limit: int = 160) -> str:
    raw = (text or "").strip().replace("\n", " ")
    if len(raw) <= limit:
        return raw
    return f"{raw[: limit - 1]}…"


def _title_from_text(text: str, fallback: str = "Suhbat") -> str:
    raw = (text or "").strip().replace("\n", " ")
    if not raw:
        return fallback
    return raw if len(raw) <= 42 else f"{raw[:42]}…"


def _trim_user_threads(user_id: int) -> None:
    ids = list(
        MorphAiChatThread.objects.filter(user_id=user_id)
        .order_by("-updated_at")
        .values_list("id", flat=True)[CHAT_THREADS_MAX_PER_USER:]
    )
    if ids:
        MorphAiChatThread.objects.filter(id__in=ids).delete()


def _refresh_thread_stats(thread: MorphAiChatThread) -> None:
    msgs = list(
        thread.messages.order_by("created_at", "id").values(
            "role",
            "content",
            "prompt_tokens",
            "candidates_tokens",
            "total_tokens",
            "cost_usd",
        )
    )
    thread.message_count = len(msgs)
    thread.total_prompt_tokens = sum(int(m["prompt_tokens"] or 0) for m in msgs)
    thread.total_candidates_tokens = sum(int(m["candidates_tokens"] or 0) for m in msgs)
    thread.total_tokens = sum(int(m["total_tokens"] or 0) for m in msgs)
    thread.total_cost_usd = sum((_money(m["cost_usd"]) for m in msgs), Decimal("0"))
    last = msgs[-1] if msgs else None
    first_user = next((m for m in msgs if m["role"] == MorphAiChatMessage.Role.USER), None)
    if first_user:
        thread.title = _title_from_text(str(first_user["content"] or ""), thread.title or "Suhbat")
    if last:
        thread.preview = _preview(str(last["content"] or ""))
    thread.save(
        update_fields=[
            "message_count",
            "total_prompt_tokens",
            "total_candidates_tokens",
            "total_tokens",
            "total_cost_usd",
            "title",
            "preview",
            "updated_at",
        ]
    )


def get_or_create_thread(
    *,
    user_id: int,
    client_id: str,
    title: str = "",
    context: dict[str, Any] | None = None,
) -> MorphAiChatThread:
    cid = (client_id or "").strip()[:64]
    if not cid:
        raise ValueError("thread_id required")
    thread, _ = MorphAiChatThread.objects.get_or_create(
        user_id=user_id,
        client_id=cid,
        defaults={
            "title": (title or "")[:200],
            "context": context if isinstance(context, dict) else {},
        },
    )
    if context and isinstance(context, dict):
        thread.context = context
        thread.save(update_fields=["context", "updated_at"])
    return thread


def append_chat_turn(
    *,
    user_id: int,
    thread_client_id: str,
    user_message: str,
    assistant_message: str,
    user_client_id: str = "",
    assistant_client_id: str = "",
    context: dict[str, Any] | None = None,
    usage_row: Any | None = None,
    usage_meta: dict[str, Any] | None = None,
) -> MorphAiChatThread | None:
    """Bitta user+assistant juftligini DB ga yozadi. Xato bo'lsa asosiy flow uzilmasin."""
    try:
        user_text = (user_message or "").strip()
        assistant_text = (assistant_message or "").strip()
        if not user_text and not assistant_text:
            return None
        meta = usage_meta or {}
        with transaction.atomic():
            thread = get_or_create_thread(
                user_id=user_id,
                client_id=thread_client_id,
                title=_title_from_text(user_text),
                context=context if isinstance(context, dict) else None,
            )
            if user_text:
                MorphAiChatMessage.objects.create(
                    thread=thread,
                    client_id=(user_client_id or "")[:64],
                    role=MorphAiChatMessage.Role.USER,
                    content=user_text[:20000],
                    context=context if isinstance(context, dict) else {},
                )
            if assistant_text:
                MorphAiChatMessage.objects.create(
                    thread=thread,
                    client_id=(assistant_client_id or "")[:64],
                    role=MorphAiChatMessage.Role.ASSISTANT,
                    content=assistant_text[:50000],
                    prompt_tokens=int(meta.get("prompt_tokens") or 0),
                    candidates_tokens=int(meta.get("candidates_tokens") or 0),
                    thoughts_tokens=int(meta.get("thoughts_tokens") or 0),
                    total_tokens=int(meta.get("total_tokens") or 0),
                    cost_usd=_money(meta.get("cost_usd")),
                    model=str(meta.get("model") or "")[:80],
                    provider=str(meta.get("provider") or "")[:32],
                    usage=usage_row if usage_row is not None else None,
                )
            # Trim old messages
            msg_ids = list(
                thread.messages.order_by("created_at", "id").values_list("id", flat=True)
            )
            excess = msg_ids[:-CHAT_MESSAGES_MAX_PER_THREAD] if len(msg_ids) > CHAT_MESSAGES_MAX_PER_THREAD else []
            if excess:
                MorphAiChatMessage.objects.filter(id__in=excess).delete()
            _refresh_thread_stats(thread)
            _trim_user_threads(user_id)
        return thread
    except Exception:
        logger.exception(
            "Morph chat turn saqlanmadi (user=%s thread=%s)",
            user_id,
            thread_client_id,
        )
        return None


def upsert_thread_from_client(
    *,
    user_id: int,
    client_id: str,
    title: str = "",
    context: dict[str, Any] | None = None,
    messages: list[dict[str, Any]] | None = None,
    updated_at: str | None = None,
) -> MorphAiChatThread:
    """Mobil sync — to'liq thread + xabarlar."""
    with transaction.atomic():
        thread = get_or_create_thread(
            user_id=user_id,
            client_id=client_id,
            title=title,
            context=context if isinstance(context, dict) else None,
        )
        if title:
            thread.title = title[:200]
        rows = messages if isinstance(messages, list) else []
        cleaned: list[dict[str, Any]] = []
        for raw in rows[-CHAT_MESSAGES_MAX_PER_THREAD:]:
            if not isinstance(raw, dict):
                continue
            role = str(raw.get("role") or "").strip().lower()
            if role not in (MorphAiChatMessage.Role.USER, MorphAiChatMessage.Role.ASSISTANT):
                continue
            content = str(raw.get("content") or "").strip()
            if not content:
                continue
            cleaned.append(
                {
                    "client_id": str(raw.get("id") or raw.get("client_id") or "")[:64],
                    "role": role,
                    "content": content[:50000],
                    "context": raw.get("context") if isinstance(raw.get("context"), dict) else {},
                    "prompt_tokens": int(raw.get("prompt_tokens") or 0),
                    "candidates_tokens": int(raw.get("candidates_tokens") or 0),
                    "thoughts_tokens": int(raw.get("thoughts_tokens") or 0),
                    "total_tokens": int(raw.get("total_tokens") or 0),
                    "cost_usd": _money(raw.get("cost_usd")),
                    "model": str(raw.get("model") or "")[:80],
                    "provider": str(raw.get("provider") or "")[:32],
                    "created_at": raw.get("created_at"),
                }
            )
        thread.messages.all().delete()
        bulk = []
        for item in cleaned:
            created = None
            raw_ts = item.pop("created_at", None)
            if isinstance(raw_ts, str) and raw_ts:
                created = parse_datetime(raw_ts)
            msg = MorphAiChatMessage(thread=thread, **item)
            if created is not None:
                msg.created_at = created
            bulk.append(msg)
        if bulk:
            MorphAiChatMessage.objects.bulk_create(bulk)
        if updated_at:
            parsed = parse_datetime(updated_at)
            if parsed is not None:
                MorphAiChatThread.objects.filter(pk=thread.pk).update(updated_at=parsed)
                thread.updated_at = parsed
        _refresh_thread_stats(thread)
        _trim_user_threads(user_id)
        thread.refresh_from_db()
        return thread


def delete_user_thread(*, user_id: int, client_id: str) -> bool:
    deleted, _ = MorphAiChatThread.objects.filter(
        user_id=user_id,
        client_id=(client_id or "").strip()[:64],
    ).delete()
    return deleted > 0


def clear_user_threads(*, user_id: int) -> int:
    qs = MorphAiChatThread.objects.filter(user_id=user_id)
    n = qs.count()
    if n:
        qs.delete()
    return int(n)


def serialize_message(msg: MorphAiChatMessage) -> dict[str, Any]:
    return {
        "id": msg.client_id or str(msg.id),
        "db_id": msg.id,
        "role": msg.role,
        "content": msg.content,
        "context": msg.context or {},
        "prompt_tokens": msg.prompt_tokens,
        "candidates_tokens": msg.candidates_tokens,
        "thoughts_tokens": msg.thoughts_tokens,
        "total_tokens": msg.total_tokens,
        "cost_usd": f"{msg.cost_usd.quantize(Decimal('0.000001'))}",
        "model": msg.model,
        "provider": msg.provider,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def serialize_thread(
    thread: MorphAiChatThread,
    *,
    include_messages: bool = False,
) -> dict[str, Any]:
    out: dict[str, Any] = {
        "id": thread.client_id,
        "db_id": thread.id,
        "title": thread.title,
        "preview": thread.preview,
        "context": thread.context or {},
        "message_count": thread.message_count,
        "total_prompt_tokens": thread.total_prompt_tokens,
        "total_candidates_tokens": thread.total_candidates_tokens,
        "total_tokens": thread.total_tokens,
        "total_cost_usd": f"{thread.total_cost_usd.quantize(Decimal('0.000001'))}",
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
        "updated_at": thread.updated_at.isoformat() if thread.updated_at else None,
    }
    if include_messages:
        msgs = thread.messages.order_by("created_at", "id")
        out["messages"] = [serialize_message(m) for m in msgs]
    return out
