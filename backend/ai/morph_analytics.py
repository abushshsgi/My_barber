"""Morf AI (AI Style) — admin analytics."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Avg
from django.utils import timezone

from ai.models import AiGenerationUsage
from ai.usage_pricing import billing_bucket, explain_usage_charge, runware_list_usd, usd_to_uzs
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


_BUCKET_META = {
    "runware": ("Runware generatsiya", "Try-on rasm. Haqiqiy API cost, bo'lmasa narxnoma."),
    "gemini_analyze": ("Gemini tahlil", "Yuz va uslub tahlili — token stavkasi."),
    "gemini_chat": ("Gemini chat", "Morf AI chat — token stavkasi."),
    "gemini_studio": ("Gemini studio", "Studio tahriri hali Gemini rasm modeli."),
    "gemini_voice": ("Gemini ovoz", "Ovoz tanish va o'qish — token."),
    "gemini_other": ("Boshqa Gemini", "Boshqa Gemini chaqiruv."),
    "unbilled": ("Pul olinmagan", "Xato. Provayder hisob yozmagan."),
}
_BUCKET_ORDER = (
    "runware",
    "gemini_analyze",
    "gemini_chat",
    "gemini_studio",
    "gemini_voice",
    "gemini_other",
    "unbilled",
)


def charge_for_usage(
    *,
    kind: str,
    status: str,
    provider: str = "",
    model: str = "",
    cost_usd: Any = 0,
    total_tokens: int = 0,
    tokens_estimated: bool = False,
) -> dict[str, Any]:
    charge = explain_usage_charge(
        kind=kind,
        status=status,
        provider=provider,
        model=model,
        cost_usd=cost_usd,
        total_tokens=total_tokens,
        tokens_estimated=tokens_estimated,
    )
    charge["bucket"] = billing_bucket(charge)
    return charge


def public_charge(charge: dict[str, Any]) -> dict[str, Any]:
    return {
        "cost_usd": _money(charge["cost_usd"]),
        "cost_uzs": usd_to_uzs(charge["cost_usd"]),
        "legacy_cost_usd": _money(charge["legacy_cost_usd"]),
        "charge_from": charge["charge_from"],
        "activity": charge["activity"],
        "price_basis": charge["price_basis"],
        "price_note": charge["price_note"],
        "repriced": bool(charge["repriced"]),
        "bucket": charge["bucket"],
    }


def rollup_usage_facts(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Corrected Runware/Gemini totals for one analytics window."""
    buckets: dict[str, dict[str, Any]] = {
        key: {"calls": 0, "cost": Decimal("0")} for key in _BUCKET_ORDER
    }
    daily: dict[str, dict[str, Any]] = {}
    users: dict[int, dict[str, Any]] = {}
    tryon_costs: list[Decimal] = []
    repriced_tryon = 0
    totals = {
        "generations": 0,
        "success": 0,
        "failed": 0,
        "tryon": 0,
        "analyze": 0,
        "face_check": 0,
        "studio": 0,
        "chat": 0,
        "voice": 0,
        "tokens": 0,
        "prompt_tokens": 0,
        "candidates_tokens": 0,
        "cost": Decimal("0"),
        "runware": Decimal("0"),
        "gemini": Decimal("0"),
    }
    seen_users: set[int] = set()

    for row in rows:
        kind = str(row.get("kind") or "")
        status = str(row.get("status") or "")
        charge = charge_for_usage(
            kind=kind,
            status=status,
            provider=str(row.get("provider") or ""),
            model=str(row.get("model") or ""),
            cost_usd=row.get("cost_usd") or 0,
            total_tokens=int(row.get("total_tokens") or 0),
            tokens_estimated=bool(row.get("tokens_estimated")),
        )
        cost = charge["cost_usd"]
        bucket = charge["bucket"]
        buckets[bucket]["calls"] += 1
        buckets[bucket]["cost"] += cost
        totals["generations"] += 1
        if status == AiGenerationUsage.Status.SUCCESS:
            totals["success"] += 1
        elif status == AiGenerationUsage.Status.FAILED:
            totals["failed"] += 1
        if kind == AiGenerationUsage.Kind.TRYON:
            totals["tryon"] += 1
            if status == AiGenerationUsage.Status.SUCCESS:
                tryon_costs.append(cost)
            if charge["repriced"] and charge["price_basis"] == "runware_list":
                repriced_tryon += 1
        elif kind == AiGenerationUsage.Kind.ANALYZE:
            totals["analyze"] += 1
        elif kind == AiGenerationUsage.Kind.FACE_CHECK:
            totals["face_check"] += 1
        elif kind == AiGenerationUsage.Kind.STUDIO:
            totals["studio"] += 1
        elif kind == AiGenerationUsage.Kind.CHAT:
            totals["chat"] += 1
        elif kind in (AiGenerationUsage.Kind.VOICE_STT, AiGenerationUsage.Kind.VOICE_TTS):
            totals["voice"] += 1
        totals["tokens"] += int(row.get("total_tokens") or 0)
        totals["prompt_tokens"] += int(row.get("prompt_tokens") or 0)
        totals["candidates_tokens"] += int(row.get("candidates_tokens") or 0)
        totals["cost"] += cost
        if charge["charge_from"] == "runware":
            totals["runware"] += cost
        elif charge["charge_from"] == "gemini":
            totals["gemini"] += cost

        created = row.get("created_at")
        day_key = ""
        if created is not None:
            day_key = timezone.localtime(created).date().isoformat()
        day = daily.setdefault(
            day_key,
            {
                "date": day_key,
                "generations": 0,
                "tryon": 0,
                "analyze": 0,
                "studio": 0,
                "chat": 0,
                "tokens": 0,
                "cost": Decimal("0"),
                "runware": Decimal("0"),
                "gemini": Decimal("0"),
                "users": set(),
            },
        )
        day["generations"] += 1
        if kind == AiGenerationUsage.Kind.TRYON:
            day["tryon"] += 1
        elif kind == AiGenerationUsage.Kind.ANALYZE:
            day["analyze"] += 1
        elif kind == AiGenerationUsage.Kind.STUDIO:
            day["studio"] += 1
        elif kind == AiGenerationUsage.Kind.CHAT:
            day["chat"] += 1
        day["tokens"] += int(row.get("total_tokens") or 0)
        day["cost"] += cost
        if charge["charge_from"] == "runware":
            day["runware"] += cost
        elif charge["charge_from"] == "gemini":
            day["gemini"] += cost
        uid = row.get("user_id")
        if uid:
            day["users"].add(uid)
            seen_users.add(uid)
            user = users.get(uid)
            if user is None:
                user = {
                    "user_id": uid,
                    "name": _user_label(row),
                    "phone": row.get("user__phone") or "",
                    "email": row.get("user__email") or "",
                    "generations": 0,
                    "tryon": 0,
                    "analyze": 0,
                    "studio": 0,
                    "chat": 0,
                    "tokens": 0,
                    "prompt_tokens": 0,
                    "candidates_tokens": 0,
                    "cost": Decimal("0"),
                    "runware": Decimal("0"),
                    "gemini": Decimal("0"),
                    "last_at": created,
                }
                users[uid] = user
            user["generations"] += 1
            if kind == AiGenerationUsage.Kind.TRYON:
                user["tryon"] += 1
            elif kind == AiGenerationUsage.Kind.ANALYZE:
                user["analyze"] += 1
            elif kind == AiGenerationUsage.Kind.STUDIO:
                user["studio"] += 1
            elif kind == AiGenerationUsage.Kind.CHAT:
                user["chat"] += 1
            user["tokens"] += int(row.get("total_tokens") or 0)
            user["prompt_tokens"] += int(row.get("prompt_tokens") or 0)
            user["candidates_tokens"] += int(row.get("candidates_tokens") or 0)
            user["cost"] += cost
            if charge["charge_from"] == "runware":
                user["runware"] += cost
            elif charge["charge_from"] == "gemini":
                user["gemini"] += cost
            if created is not None and (user["last_at"] is None or created > user["last_at"]):
                user["last_at"] = created

    positive_tryon = [c for c in tryon_costs if c > 0]
    tryon_sum = sum(positive_tryon, Decimal("0"))
    billing = []
    for key in _BUCKET_ORDER:
        calls = int(buckets[key]["calls"])
        if key not in ("runware", "gemini_analyze", "gemini_chat", "unbilled") and calls <= 0:
            continue
        label, detail = _BUCKET_META[key]
        cost = buckets[key]["cost"]
        billing.append(
            {
                "key": key,
                "label": label,
                "detail": detail,
                "calls": calls,
                "cost_usd": _money(cost),
                "cost_uzs": usd_to_uzs(cost),
            }
        )
    daily_rows = []
    for key in sorted(k for k in daily if k):
        row = daily[key]
        daily_rows.append(
            {
                "date": row["date"],
                "generations": row["generations"],
                "tryon": row["tryon"],
                "analyze": row["analyze"],
                "studio": row["studio"],
                "chat": row["chat"],
                "tokens": row["tokens"],
                "cost_usd": _money(row["cost"]),
                "cost_uzs": usd_to_uzs(row["cost"]),
                "runware_usd": _money(row["runware"]),
                "gemini_usd": _money(row["gemini"]),
                "users": len(row["users"]),
            }
        )
    user_rows = sorted(users.values(), key=lambda item: (item["cost"], item["generations"]), reverse=True)
    return {
        "totals": totals,
        "unique_users": len(seen_users),
        "billing": billing,
        "daily": daily_rows,
        "users": user_rows,
        "tryon_costs": positive_tryon,
        "tryon_sum": tryon_sum,
        "repriced_tryon": repriced_tryon,
    }


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
        from ai.services.tryon_queue import queue_metrics

        metrics = queue_metrics()
        return {
            "enabled": bool(metrics.get("enabled")),
            "depth": int(metrics.get("queue_length") or 0),
            "processing": int(metrics.get("processing") or 0),
            "delayed": int(metrics.get("delayed") or 0),
            "http_429_frequency": int(metrics.get("http_429_frequency") or 0),
            "provider_http_attempts": int(metrics.get("provider_http_attempts") or 0),
            "provider_http_429": int(metrics.get("provider_http_429") or 0),
            "queue_retry_total": int(metrics.get("queue_retry_total") or 0),
            "provider_retry_total": int(metrics.get("provider_retry_total") or 0),
            "slot_wait_requeue_total": int(metrics.get("slot_wait_requeue_total") or 0),
            "queue_wait_ms": int(metrics.get("queue_wait_ms") or 0),
            "slot_wait_ms": int(metrics.get("slot_wait_ms") or 0),
            "average_generation_ms": int(metrics.get("average_generation_ms") or 0),
            "worker_health": metrics.get("worker_health") or {},
            "provider_availability": metrics.get("provider_availability") or {},
        }
    except Exception:
        return {"enabled": False, "depth": 0}


def load_usage_facts(qs) -> list[dict[str, Any]]:
    return list(
        qs.values(
            "user_id",
            "kind",
            "status",
            "provider",
            "model",
            "cost_usd",
            "total_tokens",
            "prompt_tokens",
            "candidates_tokens",
            "tokens_estimated",
            "created_at",
            "user__full_name",
            "user__first_name",
            "user__last_name",
            "user__phone",
            "user__email",
        )
    )


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

    facts = load_usage_facts(qs)
    rolled = rollup_usage_facts(facts)
    totals = rolled["totals"]
    tryon_costs = rolled["tryon_costs"]
    tryon_avg = (
        rolled["tryon_sum"] / Decimal(len(tryon_costs)) if tryon_costs else Decimal("0")
    )
    latency = qs.aggregate(avg_latency=Avg("latency_ms"))

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

    recent = list(
        qs.select_related("user")
        .order_by("-created_at")[: _safe_limit(recent_limit, default=50, cap=200)]
    )
    top_cap = _safe_limit(top_limit, default=20, cap=100)

    total_gens = int(totals["generations"] or 0)
    success = int(totals["success"] or 0)
    success_rate = round((success / total_gens) * 100, 1) if total_gens else 0.0
    avg_cost = (totals["cost"] / Decimal(total_gens)) if total_gens else Decimal("0")
    avg_tokens = (totals["tokens"] / total_gens) if total_gens else 0
    tryon_min = min(tryon_costs) if tryon_costs else Decimal("0")
    tryon_max = max(tryon_costs) if tryon_costs else Decimal("0")

    def _recent_charge(item: AiGenerationUsage) -> dict[str, Any]:
        return public_charge(
            charge_for_usage(
                kind=item.kind,
                status=item.status,
                provider=item.provider,
                model=item.model,
                cost_usd=item.cost_usd,
                total_tokens=item.total_tokens,
                tokens_estimated=item.tokens_estimated,
            )
        )

    return {
        "generated_at": now.isoformat(),
        "range": {
            "start": start_dt.date().isoformat(),
            "end": end_dt.date().isoformat(),
        },
        "pricing": {
            "tryon_provider": "runware",
            "analyze_provider": "gemini",
            "chat_provider": "gemini",
            "runware_list_usd": _money(runware_list_usd(None)),
            "repriced_tryon": rolled["repriced_tryon"],
        },
        "billing": rolled["billing"],
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
            "unique_users": int(rolled["unique_users"] or 0),
            "total_tokens": int(totals["tokens"] or 0),
            "prompt_tokens": int(totals["prompt_tokens"] or 0),
            "candidates_tokens": int(totals["candidates_tokens"] or 0),
            "total_cost_usd": _money(totals["cost"]),
            "total_cost_uzs": usd_to_uzs(totals["cost"]),
            "runware_cost_usd": _money(totals["runware"]),
            "runware_cost_uzs": usd_to_uzs(totals["runware"]),
            "gemini_cost_usd": _money(totals["gemini"]),
            "gemini_cost_uzs": usd_to_uzs(totals["gemini"]),
            "usd_to_uzs_rate": usd_to_uzs(1),
            "avg_cost_usd": _money(avg_cost),
            "avg_tokens": int(round(float(avg_tokens))),
            "avg_latency_ms": int(round(float(latency["avg_latency"] or 0))),
            "tryon_avg_cost_usd": _money(tryon_avg),
            "tryon_min_cost_usd": _money(tryon_min),
            "tryon_max_cost_usd": _money(tryon_max),
            "tryon_total_cost_usd": _money(rolled["tryon_sum"]),
            "tryon_total_tokens": 0,
            "repriced_tryon": rolled["repriced_tryon"],
        },
        "daily": rolled["daily"],
        "top_users": [
            {
                "user_id": row["user_id"],
                "name": row["name"],
                "phone": row["phone"],
                "email": row["email"],
                "generations": row["generations"],
                "tryon": row["tryon"],
                "analyze": row["analyze"],
                "studio": row["studio"],
                "chat": row["chat"],
                "tokens": row["tokens"],
                "prompt_tokens": row["prompt_tokens"],
                "candidates_tokens": row["candidates_tokens"],
                "cost_usd": _money(row["cost"]),
                "cost_uzs": usd_to_uzs(row["cost"]),
                "runware_usd": _money(row["runware"]),
                "gemini_usd": _money(row["gemini"]),
                "last_at": row["last_at"].isoformat() if row.get("last_at") else None,
            }
            for row in rolled["users"][:top_cap]
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
                **_recent_charge(item),
                "prompt_tokens": item.prompt_tokens,
                "candidates_tokens": item.candidates_tokens,
                "total_tokens": item.total_tokens,
                "tokens_estimated": item.tokens_estimated,
                "latency_ms": item.latency_ms,
                "error_detail": item.error_detail,
                "job_id": item.job_id,
                "created_at": item.created_at.isoformat(),
            }
            for item in recent
        ],
    }
