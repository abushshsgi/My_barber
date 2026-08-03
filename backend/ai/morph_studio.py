"""Morph AI Studio — admin ops: spend, edits, users + subscription join."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Avg, Count, Max, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from ai.models import AiGenerationUsage
from ai.morph_analytics import _money, _safe_limit, _user_label
from control_panel.platform_analytics import resolve_range
from subscriptions.models import SubscriptionUsagePeriod, UserSubscription
from subscriptions.services import current_period_bounds


ACTIVE_WINDOW = timedelta(minutes=15)


def _sub_limit(entitlements: dict[str, Any] | None, key: str) -> int:
    try:
        return int((entitlements or {}).get(key) or 0)
    except (TypeError, ValueError):
        return 0


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


def build_morph_studio_ops(
    start_raw: str | None,
    end_raw: str | None,
    *,
    recent_limit: int = 50,
    top_limit: int = 40,
) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    now = timezone.now()
    active_since = now - ACTIVE_WINDOW
    qs = AiGenerationUsage.objects.filter(
        kind=AiGenerationUsage.Kind.STUDIO,
        created_at__gte=start_dt,
        created_at__lte=end_dt,
    )

    totals = qs.aggregate(
        edits=Count("id"),
        success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
        failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
        unique_users=Count("user_id", distinct=True),
        sum_tokens=Sum("total_tokens"),
        sum_prompt_tokens=Sum("prompt_tokens"),
        sum_candidates_tokens=Sum("candidates_tokens"),
        total_cost=Sum("cost_usd"),
        avg_cost=Avg("cost_usd"),
        avg_latency=Avg("latency_ms"),
    )

    live_edits = AiGenerationUsage.objects.filter(
        kind=AiGenerationUsage.Kind.STUDIO,
        created_at__gte=active_since,
    ).count()
    live_users = (
        AiGenerationUsage.objects.filter(
            kind=AiGenerationUsage.Kind.STUDIO,
            created_at__gte=active_since,
            user_id__isnull=False,
        )
        .values("user_id")
        .distinct()
        .count()
    )

    daily = list(
        qs.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            edits=Count("id"),
            success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
            failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
            users=Count("user_id", distinct=True),
            tokens=Sum("total_tokens"),
            cost_usd=Sum("cost_usd"),
        )
        .order_by("day")
    )

    top_users_raw = list(
        qs.filter(user_id__isnull=False)
        .values(
            "user_id",
            "user__full_name",
            "user__first_name",
            "user__last_name",
            "user__phone",
            "user__email",
        )
        .annotate(
            edits=Count("id"),
            success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
            failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
            tokens=Sum("total_tokens"),
            cost_usd=Sum("cost_usd"),
            last_at=Max("created_at"),
        )
        .order_by("-cost_usd", "-edits")[: _safe_limit(top_limit, default=40, cap=100)]
    )
    user_ids = [int(row["user_id"]) for row in top_users_raw if row.get("user_id")]
    subs = _active_subs_by_user(user_ids)
    usage_map = _usage_by_user(user_ids)

    top_presets = list(
        qs.exclude(style_id="")
        .values("style_id", "style_title")
        .annotate(
            edits=Count("id"),
            success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
            cost_usd=Sum("cost_usd"),
            users=Count("user_id", distinct=True),
        )
        .order_by("-edits")[:30]
    )

    recent = list(
        qs.select_related("user").order_by("-created_at")[
            : _safe_limit(recent_limit, default=50, cap=200)
        ]
    )
    recent_user_ids = [int(item.user_id) for item in recent if item.user_id]
    recent_subs = _active_subs_by_user(recent_user_ids)
    recent_usage = _usage_by_user(recent_user_ids)

    period_start, period_end = current_period_bounds(now)
    month_usage = SubscriptionUsagePeriod.objects.filter(period_start=period_start).aggregate(
        studio_used=Sum("morph_studio_used"),
        users_with_studio=Count(
            "id",
            filter=Q(morph_studio_used__gt=0),
        ),
    )

    edits = int(totals["edits"] or 0)
    success = int(totals["success"] or 0)
    success_rate = round((success / edits) * 100, 1) if edits else 0.0

    def _user_sub_block(user_id: int | None) -> dict[str, Any]:
        if not user_id:
            return {
                "plan_code": "",
                "subscription_status": "none",
                "subscription_id": None,
                "ends_at": None,
                "morph_studio_used": 0,
                "morph_studio_limit": 0,
                "morph_ai_used": 0,
                "morph_ai_limit": 0,
            }
        sub = subs.get(user_id) or recent_subs.get(user_id)
        usage = usage_map.get(user_id) or recent_usage.get(user_id)
        ents = (sub.entitlements if sub else None) or {}
        return {
            "plan_code": sub.plan_code if sub else "",
            "subscription_status": sub.status if sub else "none",
            "subscription_id": str(sub.id) if sub else None,
            "ends_at": sub.ends_at.isoformat() if sub and sub.ends_at else None,
            "morph_studio_used": int(usage.morph_studio_used) if usage else 0,
            "morph_studio_limit": _sub_limit(ents, "morph_studio_monthly"),
            "morph_ai_used": int(usage.morph_ai_used) if usage else 0,
            "morph_ai_limit": _sub_limit(ents, "morph_ai_monthly"),
        }

    return {
        "generated_at": now.isoformat(),
        "range": {
            "start": start_dt.date().isoformat(),
            "end": end_dt.date().isoformat(),
        },
        "billing_period": {
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
            "morph_studio_used_total": int(month_usage["studio_used"] or 0),
            "users_with_studio_usage": int(month_usage["users_with_studio"] or 0),
        },
        "live": {
            "edits_15m": live_edits,
            "active_users_15m": live_users,
        },
        "summary": {
            "edits": edits,
            "success": success,
            "failed": int(totals["failed"] or 0),
            "success_rate": success_rate,
            "unique_users": int(totals["unique_users"] or 0),
            "total_tokens": int(totals["sum_tokens"] or 0),
            "prompt_tokens": int(totals["sum_prompt_tokens"] or 0),
            "candidates_tokens": int(totals["sum_candidates_tokens"] or 0),
            "total_cost_usd": _money(totals["total_cost"]),
            "avg_cost_usd": _money(totals["avg_cost"] or Decimal("0")),
            "avg_latency_ms": int(round(float(totals["avg_latency"] or 0))),
        },
        "daily": [
            {
                "date": row["day"].isoformat() if row["day"] else "",
                "edits": int(row["edits"] or 0),
                "success": int(row["success"] or 0),
                "failed": int(row["failed"] or 0),
                "users": int(row["users"] or 0),
                "tokens": int(row["tokens"] or 0),
                "cost_usd": _money(row["cost_usd"]),
            }
            for row in daily
        ],
        "top_users": [
            {
                "user_id": row["user_id"],
                "name": _user_label(row),
                "phone": row.get("user__phone") or "",
                "email": row.get("user__email") or "",
                "edits": int(row["edits"] or 0),
                "success": int(row["success"] or 0),
                "failed": int(row["failed"] or 0),
                "tokens": int(row["tokens"] or 0),
                "cost_usd": _money(row["cost_usd"]),
                "last_at": row["last_at"].isoformat() if row.get("last_at") else None,
                **_user_sub_block(int(row["user_id"])),
            }
            for row in top_users_raw
        ],
        "top_presets": [
            {
                "style_id": row["style_id"] or "",
                "style_title": row["style_title"] or row["style_id"] or "—",
                "edits": int(row["edits"] or 0),
                "success": int(row["success"] or 0),
                "users": int(row["users"] or 0),
                "cost_usd": _money(row["cost_usd"]),
            }
            for row in top_presets
        ],
        "recent": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "user_name": (
                    (item.user.full_name or "").strip()
                    or f"{(item.user.first_name or '').strip()} {(item.user.last_name or '').strip()}".strip()
                    or (item.user.phone or item.user.email or f"User #{item.user_id}")
                    if item.user_id and item.user
                    else "—"
                ),
                "status": item.status,
                "style_id": item.style_id,
                "style_title": item.style_title,
                "prompt": (item.prompt or "")[:240],
                "model": item.model,
                "provider": item.provider,
                "prompt_tokens": item.prompt_tokens,
                "candidates_tokens": item.candidates_tokens,
                "total_tokens": item.total_tokens,
                "cost_usd": _money(item.cost_usd),
                "latency_ms": item.latency_ms,
                "error_detail": item.error_detail,
                "created_at": item.created_at.isoformat(),
                **_user_sub_block(int(item.user_id) if item.user_id else None),
            }
            for item in recent
        ],
    }
