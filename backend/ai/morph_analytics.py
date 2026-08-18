"""Morph AI (AI Style) — admin analytics."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Avg, Count, Max, Min, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from ai.usage_pricing import usd_to_uzs
from control_panel.platform_analytics import resolve_range


ACTIVE_WINDOW = timedelta(minutes=15)


def _safe_limit(raw: Any, *, default: int = 50, cap: int = 200) -> int:
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return default
    return max(1, min(cap, n))


def _money(value: Decimal | float | int | None) -> str:
    d = value if isinstance(value, Decimal) else Decimal(str(value or 0))
    return f"{d.quantize(Decimal('0.000001'))}"


def _user_label(row: dict[str, Any]) -> str:
    name = (row.get("user__full_name") or "").strip()
    if name:
        return name
    first = (row.get("user__first_name") or "").strip()
    last = (row.get("user__last_name") or "").strip()
    combined = f"{first} {last}".strip()
    if combined:
        return combined
    phone = (row.get("user__phone") or "").strip()
    if phone:
        return phone
    email = (row.get("user__email") or "").strip()
    if email:
        return email
    uid = row.get("user_id")
    return f"User #{uid}" if uid else "Noma'lum"


def _queue_snapshot() -> dict[str, Any]:
    try:
        from ai.services.tryon_queue import QUEUE_KEY, is_queue_enabled, _redis_client

        if not is_queue_enabled():
            return {"enabled": False, "depth": 0}
        client = _redis_client()
        if client is None:
            return {"enabled": False, "depth": 0}
        depth = int(client.llen(QUEUE_KEY))
        return {"enabled": True, "depth": depth}
    except Exception:
        return {"enabled": False, "depth": 0}


def build_morph_ai_analytics(
    start_raw: str | None,
    end_raw: str | None,
    *,
    recent_limit: int = 50,
    top_limit: int = 20,
) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    qs = AiGenerationUsage.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    now = timezone.now()
    active_since = now - ACTIVE_WINDOW

    # Alias must not reuse field names referenced by other aggregates in the same call
    # (e.g. total_tokens=Sum(...) breaks Avg("total_tokens")).
    totals = qs.aggregate(
        generations=Count("id"),
        success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
        failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
        tryon=Count("id", filter=Q(kind=AiGenerationUsage.Kind.TRYON)),
        analyze=Count("id", filter=Q(kind=AiGenerationUsage.Kind.ANALYZE)),
        face_check=Count("id", filter=Q(kind=AiGenerationUsage.Kind.FACE_CHECK)),
        studio=Count("id", filter=Q(kind=AiGenerationUsage.Kind.STUDIO)),
        chat=Count("id", filter=Q(kind=AiGenerationUsage.Kind.CHAT)),
        unique_users=Count("user_id", distinct=True),
        sum_tokens=Sum("total_tokens"),
        sum_prompt_tokens=Sum("prompt_tokens"),
        sum_candidates_tokens=Sum("candidates_tokens"),
        total_cost=Sum("cost_usd"),
        avg_cost=Avg("cost_usd"),
        avg_latency=Avg("latency_ms"),
        avg_tokens=Avg("total_tokens"),
    )

    tryon_qs = qs.filter(kind=AiGenerationUsage.Kind.TRYON, status=AiGenerationUsage.Status.SUCCESS)
    tryon_cost = tryon_qs.aggregate(
        avg=Avg("cost_usd"),
        min=Min("cost_usd"),
        max=Max("cost_usd"),
        count=Count("id"),
        tokens=Sum("total_tokens"),
        cost=Sum("cost_usd"),
    )

    active_users = (
        AiGenerationUsage.objects.filter(created_at__gte=active_since, user_id__isnull=False)
        .values("user_id")
        .distinct()
        .count()
    )
    gens_15m = AiGenerationUsage.objects.filter(created_at__gte=active_since).count()
    tryon_15m = AiGenerationUsage.objects.filter(
        created_at__gte=active_since,
        kind=AiGenerationUsage.Kind.TRYON,
    ).count()
    studio_15m = AiGenerationUsage.objects.filter(
        created_at__gte=active_since,
        kind=AiGenerationUsage.Kind.STUDIO,
    ).count()

    daily = list(
        qs.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            generations=Count("id"),
            tryon=Count("id", filter=Q(kind=AiGenerationUsage.Kind.TRYON)),
            analyze=Count("id", filter=Q(kind=AiGenerationUsage.Kind.ANALYZE)),
            studio=Count("id", filter=Q(kind=AiGenerationUsage.Kind.STUDIO)),
            chat=Count("id", filter=Q(kind=AiGenerationUsage.Kind.CHAT)),
            tokens=Sum("total_tokens"),
            cost_usd=Sum("cost_usd"),
            users=Count("user_id", distinct=True),
        )
        .order_by("day")
    )

    top_users = list(
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
            generations=Count("id"),
            tryon=Count("id", filter=Q(kind=AiGenerationUsage.Kind.TRYON)),
            analyze=Count("id", filter=Q(kind=AiGenerationUsage.Kind.ANALYZE)),
            studio=Count("id", filter=Q(kind=AiGenerationUsage.Kind.STUDIO)),
            chat=Count("id", filter=Q(kind=AiGenerationUsage.Kind.CHAT)),
            tokens=Sum("total_tokens"),
            prompt_tokens=Sum("prompt_tokens"),
            candidates_tokens=Sum("candidates_tokens"),
            cost_usd=Sum("cost_usd"),
            last_at=Max("created_at"),
        )
        .order_by("-cost_usd", "-generations")[: _safe_limit(top_limit, default=20, cap=100)]
    )

    recent = list(
        qs.select_related("user")
        .order_by("-created_at")[: _safe_limit(recent_limit, default=50, cap=200)]
    )

    total_gens = int(totals["generations"] or 0)
    success = int(totals["success"] or 0)
    success_rate = round((success / total_gens) * 100, 1) if total_gens else 0.0
    avg_cost = totals["avg_cost"] or Decimal("0")
    tryon_avg = tryon_cost["avg"] or Decimal("0")

    return {
        "generated_at": now.isoformat(),
        "range": {
            "start": start_dt.date().isoformat(),
            "end": end_dt.date().isoformat(),
        },
        "live": {
            "active_users_15m": active_users,
            "generations_15m": gens_15m,
            "tryon_15m": tryon_15m,
            "studio_15m": studio_15m,
            "queue": _queue_snapshot(),
        },
        "summary": {
            "generations": total_gens,
            "success": success,
            "failed": int(totals["failed"] or 0),
            "success_rate": success_rate,
            "tryon": int(totals["tryon"] or 0),
            "analyze": int(totals["analyze"] or 0),
            "face_check": int(totals["face_check"] or 0),
            "studio": int(totals["studio"] or 0),
            "chat": int(totals["chat"] or 0),
            "unique_users": int(totals["unique_users"] or 0),
            "total_tokens": int(totals["sum_tokens"] or 0),
            "prompt_tokens": int(totals["sum_prompt_tokens"] or 0),
            "candidates_tokens": int(totals["sum_candidates_tokens"] or 0),
            "total_cost_usd": _money(totals["total_cost"]),
            "total_cost_uzs": usd_to_uzs(totals["total_cost"]),
            "usd_to_uzs_rate": usd_to_uzs(1),
            "avg_cost_usd": _money(avg_cost),
            "avg_tokens": int(round(float(totals["avg_tokens"] or 0))),
            "avg_latency_ms": int(round(float(totals["avg_latency"] or 0))),
            "tryon_avg_cost_usd": _money(tryon_avg),
            "tryon_min_cost_usd": _money(tryon_cost["min"] or 0),
            "tryon_max_cost_usd": _money(tryon_cost["max"] or 0),
            "tryon_total_cost_usd": _money(tryon_cost["cost"]),
            "tryon_total_tokens": int(tryon_cost["tokens"] or 0),
        },
        "daily": [
            {
                "date": row["day"].isoformat() if row["day"] else "",
                "generations": int(row["generations"] or 0),
                "tryon": int(row["tryon"] or 0),
                "analyze": int(row["analyze"] or 0),
                "studio": int(row["studio"] or 0),
                "chat": int(row["chat"] or 0),
                "tokens": int(row["tokens"] or 0),
                "cost_usd": _money(row["cost_usd"]),
                "cost_uzs": usd_to_uzs(row["cost_usd"]),
                "users": int(row["users"] or 0),
            }
            for row in daily
        ],
        "top_users": [
            {
                "user_id": row["user_id"],
                "name": _user_label(row),
                "phone": row.get("user__phone") or "",
                "email": row.get("user__email") or "",
                "generations": int(row["generations"] or 0),
                "tryon": int(row["tryon"] or 0),
                "analyze": int(row["analyze"] or 0),
                "studio": int(row["studio"] or 0),
                "chat": int(row["chat"] or 0),
                "tokens": int(row["tokens"] or 0),
                "prompt_tokens": int(row["prompt_tokens"] or 0),
                "candidates_tokens": int(row["candidates_tokens"] or 0),
                "cost_usd": _money(row["cost_usd"]),
                "cost_uzs": usd_to_uzs(row["cost_usd"]),
                "last_at": row["last_at"].isoformat() if row.get("last_at") else None,
            }
            for row in top_users
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
                "kind": item.kind,
                "status": item.status,
                "style_id": item.style_id,
                "style_title": item.style_title,
                "prompt": item.prompt,
                "model": item.model,
                "provider": item.provider,
                "prompt_tokens": item.prompt_tokens,
                "candidates_tokens": item.candidates_tokens,
                "total_tokens": item.total_tokens,
                "cost_usd": _money(item.cost_usd),
                "cost_uzs": usd_to_uzs(item.cost_usd),
                "tokens_estimated": item.tokens_estimated,
                "latency_ms": item.latency_ms,
                "error_detail": item.error_detail,
                "job_id": item.job_id,
                "created_at": item.created_at.isoformat(),
            }
            for item in recent
        ],
    }
