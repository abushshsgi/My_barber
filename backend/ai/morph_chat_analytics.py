"""Morf AI Chat — admin analytics (transcripts, tokens, cost, users)."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Avg, Count, Max, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from ai.chat_persist import serialize_message, serialize_thread
from ai.models import AiGenerationUsage, MorphAiChatMessage, MorphAiChatThread
from ai.morph_analytics import _money, _safe_limit, _user_label
from ai.usage_pricing import usd_to_uzs
from control_panel.platform_analytics import resolve_range
from subscriptions.models import SubscriptionUsagePeriod, UserSubscription
from subscriptions.plans import FREE_MORPH_CHAT_TOKENS, get_plan
from subscriptions.services import current_period_bounds

ACTIVE_WINDOW = timedelta(minutes=15)


def _active_subs_by_user(user_ids: list[int]) -> dict[int, UserSubscription]:
    if not user_ids:
        return {}
    now = timezone.now()
    rows = (
        UserSubscription.objects.filter(
            user_id__in=user_ids,
            status=UserSubscription.Status.ACTIVE,
        )
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        .order_by("user_id", "-ends_at", "-created_at")
    )
    out: dict[int, UserSubscription] = {}
    for sub in rows:
        if sub.user_id not in out:
            out[sub.user_id] = sub
    return out


def _usage_by_user(user_ids: list[int]) -> dict[int, SubscriptionUsagePeriod]:
    if not user_ids:
        return {}
    period_start, _ = current_period_bounds()
    rows = SubscriptionUsagePeriod.objects.filter(
        user_id__in=user_ids,
        period_start=period_start,
    )
    return {row.user_id: row for row in rows}


def _sub_limit(entitlements: dict[str, Any] | None, key: str) -> int:
    try:
        return int((entitlements or {}).get(key) or 0)
    except (TypeError, ValueError):
        return 0


def _chat_limit_for_ents(ents: dict[str, Any] | None, plan_code: str = "") -> int:
    raw = (ents or {}).get("morph_chat_tokens_monthly")
    if raw is not None:
        try:
            return max(0, int(raw))
        except (TypeError, ValueError):
            pass
    plan = get_plan(plan_code) if plan_code else None
    if plan:
        try:
            return max(0, int(plan.get("morph_chat_tokens_monthly") or FREE_MORPH_CHAT_TOKENS))
        except (TypeError, ValueError):
            return FREE_MORPH_CHAT_TOKENS
    return FREE_MORPH_CHAT_TOKENS


def build_morph_chat_ops(
    start_raw: str | None,
    end_raw: str | None,
    *,
    recent_limit: int = 40,
    top_limit: int = 40,
    thread_limit: int = 30,
) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    now = timezone.now()
    active_since = now - ACTIVE_WINDOW

    usage_qs = AiGenerationUsage.objects.filter(
        kind=AiGenerationUsage.Kind.CHAT,
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    )
    msg_qs = MorphAiChatMessage.objects.filter(
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    ).select_related("thread", "thread__user")
    thread_qs = MorphAiChatThread.objects.filter(
        updated_at__gte=start_dt,
        updated_at__lte=end_dt,
    ).select_related("user")

    totals = usage_qs.aggregate(
        turns=Count("id"),
        success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
        failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
        unique_users=Count("user_id", distinct=True),
        sum_tokens=Sum("total_tokens"),
        sum_prompt_tokens=Sum("prompt_tokens"),
        sum_candidates_tokens=Sum("candidates_tokens"),
        total_cost=Sum("cost_usd"),
        avg_cost=Avg("cost_usd"),
        avg_latency=Avg("latency_ms"),
        avg_tokens=Avg("total_tokens"),
        avg_prompt=Avg("prompt_tokens"),
    )

    msg_totals = msg_qs.aggregate(
        messages=Count("id"),
        user_msgs=Count("id", filter=Q(role=MorphAiChatMessage.Role.USER)),
        assistant_msgs=Count("id", filter=Q(role=MorphAiChatMessage.Role.ASSISTANT)),
    )
    thread_count = thread_qs.count()
    threads_with_context = thread_qs.exclude(context={}).count()

    live_turns = AiGenerationUsage.objects.filter(
        kind=AiGenerationUsage.Kind.CHAT,
        created_at__gte=active_since,
    ).count()
    live_users = (
        AiGenerationUsage.objects.filter(
            kind=AiGenerationUsage.Kind.CHAT,
            created_at__gte=active_since,
            user_id__isnull=False,
        )
        .values("user_id")
        .distinct()
        .count()
    )

    daily = list(
        usage_qs.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            turns=Count("id"),
            success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
            failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
            users=Count("user_id", distinct=True),
            tokens=Sum("total_tokens"),
            prompt_tokens=Sum("prompt_tokens"),
            cost_usd=Sum("cost_usd"),
        )
        .order_by("day")
    )

    top_users_raw = list(
        usage_qs.filter(user_id__isnull=False)
        .values(
            "user_id",
            "user__full_name",
            "user__first_name",
            "user__last_name",
            "user__phone",
            "user__email",
        )
        .annotate(
            turns=Count("id"),
            success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
            failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
            tokens=Sum("total_tokens"),
            prompt_tokens=Sum("prompt_tokens"),
            cost_usd=Sum("cost_usd"),
            last_at=Max("created_at"),
        )
        .order_by("-cost_usd", "-turns")[: _safe_limit(top_limit, default=40, cap=100)]
    )
    user_ids = [int(row["user_id"]) for row in top_users_raw if row.get("user_id")]
    subs = _active_subs_by_user(user_ids)
    usage_map = _usage_by_user(user_ids)
    from accounts.models import User

    free_used = {
        int(row["id"]): int(row["morph_chat_free_tokens_used"] or 0)
        for row in User.objects.filter(pk__in=user_ids).values(
            "id", "morph_chat_free_tokens_used"
        )
    }

    thread_counts = {
        row["user_id"]: row["c"]
        for row in MorphAiChatThread.objects.filter(user_id__in=user_ids)
        .values("user_id")
        .annotate(c=Count("id"))
    }

    top_users = []
    for row in top_users_raw:
        uid = int(row["user_id"])
        sub = subs.get(uid)
        usage = usage_map.get(uid)
        ents = (sub.entitlements if sub else None) or {}
        if sub:
            chat_limit = _chat_limit_for_ents(ents, sub.plan_code)
            chat_used = int(usage.morph_chat_tokens_used) if usage else 0
        else:
            chat_limit = FREE_MORPH_CHAT_TOKENS
            chat_used = free_used.get(uid, 0)
        top_users.append(
            {
                "user_id": uid,
                "name": _user_label(row),
                "phone": (row.get("user__phone") or "")[:32],
                "email": (row.get("user__email") or "")[:120],
                "turns": int(row["turns"] or 0),
                "success": int(row["success"] or 0),
                "failed": int(row["failed"] or 0),
                "tokens": int(row["tokens"] or 0),
                "prompt_tokens": int(row["prompt_tokens"] or 0),
                "cost_usd": _money(row["cost_usd"]),
                "cost_uzs": usd_to_uzs(row["cost_usd"]),
                "last_at": row["last_at"].isoformat() if row.get("last_at") else None,
                "threads": int(thread_counts.get(uid) or 0),
                "plan_code": (sub.plan_code if sub else "") or "",
                "subscription_status": (sub.status if sub else "none") or "none",
                "subscription_id": str(sub.id) if sub else None,
                "ends_at": sub.ends_at.isoformat() if sub and sub.ends_at else None,
                "morph_ai_used": int(usage.morph_ai_used) if usage else 0,
                "morph_ai_limit": _sub_limit(ents, "morph_ai_monthly"),
                "token_used_month": chat_used,
                "token_limit": chat_limit,
                "token_remaining": max(0, chat_limit - chat_used),
            }
        )

    recent_usage = list(
        usage_qs.select_related("user").order_by("-created_at")[
            : _safe_limit(recent_limit, default=40, cap=100)
        ]
    )
    recent_user_ids = [int(r.user_id) for r in recent_usage if r.user_id]
    recent_subs = _active_subs_by_user(recent_user_ids)

    recent = []
    for row in recent_usage:
        sub = recent_subs.get(int(row.user_id)) if row.user_id else None
        u = row.user
        recent.append(
            {
                "id": row.id,
                "user_id": row.user_id,
                "user_name": _user_label(
                    {
                        "user_id": row.user_id,
                        "user__full_name": getattr(u, "full_name", "") if u else "",
                        "user__first_name": getattr(u, "first_name", "") if u else "",
                        "user__last_name": getattr(u, "last_name", "") if u else "",
                        "user__phone": getattr(u, "phone", "") if u else "",
                        "user__email": getattr(u, "email", "") if u else "",
                    }
                ),
                "status": row.status,
                "prompt": (row.prompt or "")[:500],
                "model": row.model,
                "provider": row.provider,
                "prompt_tokens": row.prompt_tokens,
                "candidates_tokens": row.candidates_tokens,
                "total_tokens": row.total_tokens,
                "cost_usd": _money(row.cost_usd),
                "cost_uzs": usd_to_uzs(row.cost_usd),
                "latency_ms": row.latency_ms,
                "error_detail": row.error_detail,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "plan_code": (sub.plan_code if sub else "") or "",
                "subscription_status": (sub.status if sub else "none") or "none",
            }
        )

    recent_threads_raw = list(
        thread_qs.order_by("-updated_at")[: _safe_limit(thread_limit, default=30, cap=80)]
    )
    recent_threads = []
    for th in recent_threads_raw:
        u = th.user
        recent_threads.append(
            {
                **serialize_thread(th, include_messages=False),
                "user_id": th.user_id,
                "user_name": _user_label(
                    {
                        "user_id": th.user_id,
                        "user__full_name": getattr(u, "full_name", "") if u else "",
                        "user__first_name": getattr(u, "first_name", "") if u else "",
                        "user__last_name": getattr(u, "last_name", "") if u else "",
                        "user__phone": getattr(u, "phone", "") if u else "",
                        "user__email": getattr(u, "email", "") if u else "",
                    }
                ),
                "has_context": bool(th.context),
                "context_keys": sorted(list((th.context or {}).keys()))[:20],
            }
        )

    turns = int(totals["turns"] or 0)
    success = int(totals["success"] or 0)
    period_start, period_end = current_period_bounds()

    return {
        "generated_at": now.isoformat(),
        "range": {"start": start_dt.date().isoformat(), "end": end_dt.date().isoformat()},
        "billing_period": {
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
        },
        "live": {
            "turns_15m": live_turns,
            "active_users_15m": live_users,
        },
        "summary": {
            "turns": turns,
            "success": success,
            "failed": int(totals["failed"] or 0),
            "success_rate": round((success / turns) * 100, 1) if turns else 0.0,
            "unique_users": int(totals["unique_users"] or 0),
            "threads": thread_count,
            "messages": int(msg_totals["messages"] or 0),
            "user_messages": int(msg_totals["user_msgs"] or 0),
            "assistant_messages": int(msg_totals["assistant_msgs"] or 0),
            "threads_with_context": threads_with_context,
            "total_tokens": int(totals["sum_tokens"] or 0),
            "prompt_tokens": int(totals["sum_prompt_tokens"] or 0),
            "candidates_tokens": int(totals["sum_candidates_tokens"] or 0),
            "total_cost_usd": _money(totals["total_cost"]),
            "total_cost_uzs": usd_to_uzs(totals["total_cost"]),
            "usd_to_uzs_rate": usd_to_uzs(1),
            "avg_cost_usd": _money(totals["avg_cost"]),
            "avg_latency_ms": int(totals["avg_latency"] or 0),
            "avg_tokens": int(totals["avg_tokens"] or 0),
            "avg_prompt_tokens": int(totals["avg_prompt"] or 0),
        },
        "daily": [
            {
                "date": row["day"].isoformat() if row.get("day") else "",
                "turns": int(row["turns"] or 0),
                "success": int(row["success"] or 0),
                "failed": int(row["failed"] or 0),
                "users": int(row["users"] or 0),
                "tokens": int(row["tokens"] or 0),
                "prompt_tokens": int(row["prompt_tokens"] or 0),
                "cost_usd": _money(row["cost_usd"]),
                "cost_uzs": usd_to_uzs(row["cost_usd"]),
            }
            for row in daily
        ],
        "top_users": top_users,
        "recent": recent,
        "recent_threads": recent_threads,
    }


def build_morph_chat_thread_detail(thread_db_id: int) -> dict[str, Any] | None:
    thread = (
        MorphAiChatThread.objects.select_related("user")
        .filter(pk=thread_db_id)
        .first()
    )
    if thread is None:
        return None
    u = thread.user
    msgs = list(thread.messages.order_by("created_at", "id"))
    return {
        **serialize_thread(thread, include_messages=False),
        "user_id": thread.user_id,
        "user_name": _user_label(
            {
                "user_id": thread.user_id,
                "user__full_name": getattr(u, "full_name", "") if u else "",
                "user__first_name": getattr(u, "first_name", "") if u else "",
                "user__last_name": getattr(u, "last_name", "") if u else "",
                "user__phone": getattr(u, "phone", "") if u else "",
                "user__email": getattr(u, "email", "") if u else "",
            }
        ),
        "user_phone": (getattr(u, "phone", "") or "") if u else "",
        "context": thread.context or {},
        "messages": [serialize_message(m) for m in msgs],
    }
