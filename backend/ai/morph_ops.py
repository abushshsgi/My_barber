"""Morph AI admin — errors, popularity, conversion, budget, queue, export."""

from __future__ import annotations

import csv
import io
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone

from ai.models import AiGenerationUsage, AiStyleHistoryEntry, Hairstyle, MorphAiGenerationEntry, MorphAiSettings
from control_panel.platform_analytics import resolve_range


def _money(value: Decimal | float | int | None) -> str:
    d = value if isinstance(value, Decimal) else Decimal(str(value or 0))
    return f"{d.quantize(Decimal('0.000001'))}"


def get_settings_payload() -> dict[str, Any]:
    s = MorphAiSettings.load()
    return {
        "daily_tryon_limit_per_user": s.daily_tryon_limit_per_user,
        "daily_analyze_limit_per_user": s.daily_analyze_limit_per_user,
        "daily_budget_usd": str(s.daily_budget_usd),
        "budget_enforce": s.budget_enforce,
        "alert_success_rate_below": s.alert_success_rate_below,
        "tryon_enabled": s.tryon_enabled,
        "analyze_enabled": s.analyze_enabled,
        "custom_tryon_prompt": s.custom_tryon_prompt,
        "custom_tryon_prompt_b": s.custom_tryon_prompt_b,
        "ab_enabled": s.ab_enabled,
        "ab_traffic_percent_b": s.ab_traffic_percent_b,
        "preferred_model": s.preferred_model,
        "gallery_public": s.gallery_public,
        "runtime_model": getattr(settings, "GEMINI_MODEL", "") or "",
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def update_settings(data: dict[str, Any]) -> dict[str, Any]:
    s = MorphAiSettings.load()
    int_fields = (
        "daily_tryon_limit_per_user",
        "daily_analyze_limit_per_user",
        "alert_success_rate_below",
        "ab_traffic_percent_b",
    )
    bool_fields = (
        "budget_enforce",
        "tryon_enabled",
        "analyze_enabled",
        "ab_enabled",
        "gallery_public",
    )
    for key in int_fields:
        if key in data and data[key] is not None:
            setattr(s, key, max(0, int(data[key])))
    for key in bool_fields:
        if key in data and data[key] is not None:
            setattr(s, key, bool(data[key]))
    if "daily_budget_usd" in data and data["daily_budget_usd"] is not None:
        s.daily_budget_usd = Decimal(str(data["daily_budget_usd"]))
    if "custom_tryon_prompt" in data and data["custom_tryon_prompt"] is not None:
        s.custom_tryon_prompt = str(data["custom_tryon_prompt"])
    if "custom_tryon_prompt_b" in data and data["custom_tryon_prompt_b"] is not None:
        s.custom_tryon_prompt_b = str(data["custom_tryon_prompt_b"])
    if "preferred_model" in data and data["preferred_model"] is not None:
        s.preferred_model = str(data["preferred_model"])[:80]
    if s.ab_traffic_percent_b > 100:
        s.ab_traffic_percent_b = 100
    s.save()
    return get_settings_payload()


def build_errors_analytics(start_raw: str | None, end_raw: str | None, *, limit: int = 50) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    qs = AiGenerationUsage.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    failed = qs.filter(status=AiGenerationUsage.Status.FAILED)
    total = qs.count()
    fail_count = failed.count()
    success = total - fail_count
    rate = round((success / total) * 100, 1) if total else 100.0
    settings_row = MorphAiSettings.load()
    alert = rate < settings_row.alert_success_rate_below and total >= 5

    top_errors = list(
        failed.exclude(error_detail="")
        .values("error_detail")
        .annotate(count=Count("id"), last_at=Max("created_at"))
        .order_by("-count")[:20]
    )
    by_kind = list(
        failed.values("kind")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    recent = list(
        failed.select_related("user").order_by("-created_at")[: max(1, min(200, limit))]
    )
    return {
        "summary": {
            "total": total,
            "failed": fail_count,
            "success": success,
            "success_rate": rate,
            "alert": alert,
            "alert_threshold": settings_row.alert_success_rate_below,
        },
        "top_errors": [
            {
                "detail": row["error_detail"],
                "count": int(row["count"]),
                "last_at": row["last_at"].isoformat() if row["last_at"] else None,
            }
            for row in top_errors
        ],
        "by_kind": [{"kind": row["kind"], "count": int(row["count"])} for row in by_kind],
        "recent": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "user_name": (
                    (item.user.full_name or item.user.phone or item.user.email)
                    if item.user_id and item.user
                    else "—"
                ),
                "kind": item.kind,
                "style_title": item.style_title,
                "error_detail": item.error_detail,
                "created_at": item.created_at.isoformat(),
            }
            for item in recent
        ],
    }


def build_popularity(start_raw: str | None, end_raw: str | None, *, limit: int = 40) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    qs = AiGenerationUsage.objects.filter(
        created_at__gte=start_dt,
        created_at__lte=end_dt,
        kind=AiGenerationUsage.Kind.TRYON,
    ).exclude(style_id="")
    rows = list(
        qs.values("style_id", "style_title")
        .annotate(
            generations=Count("id"),
            success=Count("id", filter=Q(status=AiGenerationUsage.Status.SUCCESS)),
            failed=Count("id", filter=Q(status=AiGenerationUsage.Status.FAILED)),
            users=Count("user_id", distinct=True),
            tokens=Sum("total_tokens"),
            cost_usd=Sum("cost_usd"),
        )
        .order_by("-generations")[: max(1, min(100, limit))]
    )
    style_ids = [r["style_id"] for r in rows]
    published = {
        h.style_id: h.is_published
        for h in Hairstyle.objects.filter(style_id__in=style_ids).only("style_id", "is_published")
    }
    return {
        "styles": [
            {
                "style_id": row["style_id"],
                "style_title": row["style_title"] or row["style_id"],
                "generations": int(row["generations"] or 0),
                "success": int(row["success"] or 0),
                "failed": int(row["failed"] or 0),
                "users": int(row["users"] or 0),
                "tokens": int(row["tokens"] or 0),
                "cost_usd": _money(row["cost_usd"]),
                "is_published": published.get(row["style_id"]),
            }
            for row in rows
        ]
    }


def build_conversion(start_raw: str | None, end_raw: str | None) -> dict[str, Any]:
    from bookings.models import Booking

    start_dt, end_dt = resolve_range(start_raw, end_raw)
    tryon_users = (
        AiGenerationUsage.objects.filter(
            created_at__gte=start_dt,
            created_at__lte=end_dt,
            kind=AiGenerationUsage.Kind.TRYON,
            status=AiGenerationUsage.Status.SUCCESS,
            user_id__isnull=False,
        )
        .values_list("user_id", flat=True)
        .distinct()
    )
    tryon_user_ids = list(tryon_users)
    tryon_count = len(tryon_user_ids)
    booked_ids = set()
    if tryon_user_ids:
        booked_ids = set(
            Booking.objects.filter(
                customer_id__in=tryon_user_ids,
                created_at__gte=start_dt,
            )
            .values_list("customer_id", flat=True)
            .distinct()
        )
    converted = len(booked_ids)
    rate = round((converted / tryon_count) * 100, 1) if tryon_count else 0.0

    # Same-day conversion: booking within 24h of first try-on in range
    from django.db.models import Min

    same_day = 0
    if tryon_user_ids:
        first_tryon = {
            row["user_id"]: row["first"]
            for row in AiGenerationUsage.objects.filter(
                user_id__in=tryon_user_ids,
                kind=AiGenerationUsage.Kind.TRYON,
                status=AiGenerationUsage.Status.SUCCESS,
                created_at__gte=start_dt,
                created_at__lte=end_dt,
            )
            .values("user_id")
            .annotate(first=Min("created_at"))
        }
        for uid, first_at in first_tryon.items():
            if uid not in booked_ids:
                continue
            day_end = first_at + timedelta(hours=24)
            if Booking.objects.filter(
                customer_id=uid,
                created_at__gte=first_at,
                created_at__lte=day_end,
            ).exists():
                same_day += 1

    return {
        "summary": {
            "tryon_users": tryon_count,
            "booked_users": converted,
            "conversion_rate": rate,
            "same_day_bookings": same_day,
        }
    }


def build_budget_status(start_raw: str | None = None, end_raw: str | None = None) -> dict[str, Any]:
    s = MorphAiSettings.load()
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    if start_raw or end_raw:
        start_dt, end_dt = resolve_range(start_raw, end_raw)
    else:
        start_dt, end_dt = today_start, now

    agg = AiGenerationUsage.objects.filter(
        created_at__gte=start_dt, created_at__lte=end_dt
    ).aggregate(
        cost=Sum("cost_usd"),
        generations=Count("id"),
        tryon=Count("id", filter=Q(kind=AiGenerationUsage.Kind.TRYON)),
    )
    spent = agg["cost"] or Decimal("0")
    cap = s.daily_budget_usd or Decimal("0")
    remaining = (cap - spent) if cap > 0 else None
    pct = float((spent / cap) * 100) if cap > 0 else 0.0
    blocked = bool(s.budget_enforce and cap > 0 and spent >= cap)

    daily = list(
        AiGenerationUsage.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(cost_usd=Sum("cost_usd"), generations=Count("id"))
        .order_by("day")
    )
    return {
        "settings": {
            "daily_budget_usd": str(cap),
            "budget_enforce": s.budget_enforce,
        },
        "period": {
            "start": start_dt.date().isoformat(),
            "end": end_dt.date().isoformat(),
            "spent_usd": _money(spent),
            "remaining_usd": _money(remaining) if remaining is not None else None,
            "percent_used": round(pct, 1),
            "blocked": blocked,
            "generations": int(agg["generations"] or 0),
            "tryon": int(agg["tryon"] or 0),
        },
        "today": {
            "spent_usd": _money(
                AiGenerationUsage.objects.filter(created_at__gte=today_start).aggregate(
                    c=Sum("cost_usd")
                )["c"]
                or 0
            ),
        },
        "daily": [
            {
                "date": row["day"].isoformat() if row["day"] else "",
                "cost_usd": _money(row["cost_usd"]),
                "generations": int(row["generations"] or 0),
            }
            for row in daily
        ],
    }


def build_limits_overview() -> dict[str, Any]:
    s = MorphAiSettings.load()
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    heavy = list(
        AiGenerationUsage.objects.filter(
            created_at__gte=today_start,
            kind=AiGenerationUsage.Kind.TRYON,
            user_id__isnull=False,
        )
        .values("user_id", "user__full_name", "user__phone", "user__email")
        .annotate(tryon=Count("id"), cost_usd=Sum("cost_usd"))
        .order_by("-tryon")[:30]
    )
    flagged = []
    limit = s.daily_tryon_limit_per_user
    for row in heavy:
        over = limit > 0 and int(row["tryon"]) >= limit
        flagged.append(
            {
                "user_id": row["user_id"],
                "name": (row.get("user__full_name") or row.get("user__phone") or row.get("user__email") or f"#{row['user_id']}"),
                "phone": row.get("user__phone") or "",
                "tryon_today": int(row["tryon"]),
                "cost_usd": _money(row["cost_usd"]),
                "over_limit": over,
            }
        )
    return {
        "settings": get_settings_payload(),
        "heavy_users_today": flagged,
    }


def queue_snapshot_admin() -> dict[str, Any]:
    from ai.services.tryon_queue import (
        JOB_PREFIX,
        QUEUE_KEY,
        STATUS_PROCESSING,
        STATUS_QUEUED,
        _load_job,
        _max_queue_depth,
        _redis_client,
        is_queue_enabled,
    )

    if not is_queue_enabled():
        return {
            "enabled": False,
            "depth": 0,
            "max_depth": _max_queue_depth(),
            "queued_sample": [],
            "processing_sample": [],
        }
    client = _redis_client()
    if client is None:
        return {
            "enabled": False,
            "depth": 0,
            "max_depth": _max_queue_depth(),
            "queued_sample": [],
            "processing_sample": [],
        }
    depth = int(client.llen(QUEUE_KEY))
    ids = client.lrange(QUEUE_KEY, 0, 19) or []
    queued_sample = []
    for jid in ids:
        meta = _load_job(client, jid) or {"job_id": jid, "status": STATUS_QUEUED}
        queued_sample.append(
            {
                "job_id": jid,
                "user_id": meta.get("user_id"),
                "style_title": meta.get("style_title") or "",
                "status": meta.get("status") or STATUS_QUEUED,
                "created_at": meta.get("created_at"),
            }
        )
    processing_sample = []
    try:
        # Scan a few job keys for processing status (best-effort)
        cursor = 0
        scanned = 0
        while scanned < 5:
            cursor, keys = client.scan(cursor=cursor, match=f"{JOB_PREFIX}*", count=40)
            for key in keys:
                raw = client.get(key)
                if not raw:
                    continue
                import json

                try:
                    data = json.loads(raw)
                except Exception:
                    continue
                if str(data.get("status") or "") == STATUS_PROCESSING:
                    processing_sample.append(
                        {
                            "job_id": data.get("job_id") or key.replace(JOB_PREFIX, ""),
                            "user_id": data.get("user_id"),
                            "style_title": data.get("style_title") or "",
                            "updated_at": data.get("updated_at"),
                        }
                    )
            scanned += 1
            if cursor == 0:
                break
    except Exception:
        pass
    return {
        "enabled": True,
        "depth": depth,
        "max_depth": _max_queue_depth(),
        "queued_sample": queued_sample,
        "processing_sample": processing_sample[:10],
    }


def clear_tryon_queue() -> dict[str, Any]:
    from ai.services.tryon_queue import QUEUE_KEY, _redis_client, is_queue_enabled

    if not is_queue_enabled():
        return {"ok": False, "detail": "Navbat o'chirilgan", "cleared": 0}
    client = _redis_client()
    if client is None:
        return {"ok": False, "detail": "Redis yo'q", "cleared": 0}
    depth = int(client.llen(QUEUE_KEY))
    client.delete(QUEUE_KEY)
    return {"ok": True, "cleared": depth}


def _media_field_url(field) -> tuple[str | None, bool]:
    """Returns (url, missing). Prefer relative /media/… paths."""
    if not field:
        return None, True
    try:
        from media_store.utils import media_field_exists

        if not media_field_exists(field):
            return None, True
        photo_url = field.url
        if photo_url and photo_url.startswith("http"):
            marker = "/media/"
            idx = photo_url.find(marker)
            if idx >= 0:
                photo_url = photo_url[idx:]
        return photo_url, False
    except Exception:
        return None, True


def _gallery_history_item(row: AiStyleHistoryEntry) -> dict[str, Any]:
    photo_url, missing = _media_field_url(row.photo)
    return {
        "id": f"h-{row.id}",
        "entry_id": row.id,
        "kind": "history",
        "user_id": row.user_id,
        "user_name": row.user.full_name or row.user.phone or row.user.email,
        "source": row.source,
        "face_shape_key": row.face_shape_key,
        "hair_type_key": row.hair_type_key,
        "style_id": "",
        "title": "",
        "photo_url": photo_url,
        "photo_missing": missing,
        "created_at": row.created_at.isoformat(),
    }


def _gallery_generation_item(row: MorphAiGenerationEntry) -> dict[str, Any]:
    photo_url, missing = _media_field_url(row.after_photo)
    return {
        "id": f"g-{row.id}",
        "entry_id": row.id,
        "kind": "generation",
        "user_id": row.user_id,
        "user_name": row.user.full_name or row.user.phone or row.user.email,
        "source": "tryon",
        "face_shape_key": "",
        "hair_type_key": "",
        "style_id": row.style_id or "",
        "title": row.title or row.style_id or "",
        "photo_url": photo_url,
        "photo_missing": missing,
        "created_at": row.created_at.isoformat(),
    }


def build_gallery(*, limit: int = 40, request=None) -> dict[str, Any]:
    cap = max(1, min(100, limit))
    history_rows = list(
        AiStyleHistoryEntry.objects.filter(photo__isnull=False)
        .exclude(photo="")
        .select_related("user")
        .order_by("-created_at")[:cap]
    )
    generation_rows = list(
        MorphAiGenerationEntry.objects.filter(after_photo__isnull=False)
        .exclude(after_photo="")
        .select_related("user")
        .order_by("-created_at")[:cap]
    )
    items = [_gallery_history_item(row) for row in history_rows] + [
        _gallery_generation_item(row) for row in generation_rows
    ]
    items.sort(key=lambda item: item["created_at"], reverse=True)
    items = items[:cap]
    missing = sum(1 for item in items if item.get("photo_missing"))
    return {
        "items": items,
        "media_note": (
            "Ba'zi rasmlar diskda topilmadi. Productionda doimiy saqlash uchun USE_S3_MEDIA yoqing — "
            "Railway lokal disk redeployda tozalanadi."
            if missing
            else None
        ),
    }


def build_export_csv(start_raw: str | None, end_raw: str | None) -> HttpResponse:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    qs = (
        AiGenerationUsage.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .select_related("user")
        .order_by("-created_at")
    )
    buf = io.StringIO()
    buf.write("\ufeff")
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "created_at",
            "user_id",
            "user",
            "kind",
            "status",
            "style_id",
            "style_title",
            "model",
            "total_tokens",
            "cost_usd",
            "latency_ms",
            "error_detail",
            "job_id",
        ]
    )
    for item in qs.iterator(chunk_size=500):
        uname = ""
        if item.user_id and item.user:
            uname = item.user.full_name or item.user.phone or item.user.email or ""
        writer.writerow(
            [
                item.id,
                item.created_at.isoformat(),
                item.user_id or "",
                uname,
                item.kind,
                item.status,
                item.style_id,
                item.style_title,
                item.model,
                item.total_tokens,
                str(item.cost_usd),
                item.latency_ms,
                item.error_detail,
                item.job_id,
            ]
        )
    resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = 'attachment; filename="morph-ai-usage.csv"'
    return resp


def check_user_can_generate(*, user_id: int | None, kind: str) -> str | None:
    """Bloklash faqat: feature o'chirilgan yoki obuna/tarif limiiti.

    Soatlik throttle, kunlik soft-cap va byudjet — userlar uchun yo'q.
    """
    s = MorphAiSettings.load()
    if kind in ("tryon", "studio") and not s.tryon_enabled:
        return "Morph AI hozir ishlamayapti."
    if kind in ("analyze", "face_check") and not s.analyze_enabled:
        return "Morph AI hozir ishlamayapti."

    if not user_id:
        return None

    # B2C obuna — Morph AI uchun majburiy + oylik tarif limiiti
    if kind in ("tryon", "studio", "analyze", "face_check"):
        from accounts.models import User
        from subscriptions.services import check_morph_entitlement

        user = User.objects.filter(pk=user_id).first()
        if user:
            return check_morph_entitlement(user=user, kind=kind)

    return None


def is_morph_plan_limit_message(message: str) -> bool:
    """Obuna / oylik kvota — API throttle emas."""
    msg = message or ""
    markers = (
        "Oylik Morph",
        "Bepul Morph",
        "Morph AI faqat obuna",
        "obuna",
        "Studio Plus",
        "Bu reja Morph",
        "do'stingizni taklif",
        "Tarifni yangilang",
        "Plus/Pro",
    )
    return any(m in msg for m in markers)


def morph_generation_blocked_response(message: str):
    from rest_framework import status
    from rest_framework.response import Response

    payload: dict[str, str] = {"detail": message}
    if is_morph_plan_limit_message(message):
        payload["code"] = "morph_plan_limit"
        return Response(payload, status=status.HTTP_403_FORBIDDEN)
    # Feature o'chirilgan / AI o'chiq — throttle emas
    return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)


def pick_ab_prompt() -> tuple[str, str]:
    """Returns (prompt_override, variant_label). Empty prompt = use default."""
    s = MorphAiSettings.load()
    if not s.ab_enabled:
        return (s.custom_tryon_prompt or "", "A")
    import random

    use_b = random.randint(1, 100) <= max(0, min(100, s.ab_traffic_percent_b))
    if use_b and s.custom_tryon_prompt_b.strip():
        return (s.custom_tryon_prompt_b, "B")
    return (s.custom_tryon_prompt or "", "A")
