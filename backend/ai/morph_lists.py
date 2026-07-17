"""Morph AI admin — paginated full-history lists + CSV export."""

from __future__ import annotations

import csv
import io
import math
from typing import Any

from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone

from ai.models import AiGenerationUsage, AiStyleHistoryEntry, MorphAiSettings
from ai.morph_analytics import _user_label
from ai.morph_ops import _money
from control_panel.platform_analytics import resolve_range

LIST_KINDS = (
    "generations",
    "spenders",
    "errors",
    "active-users",
    "queue",
    "daily",
    "gallery",
)

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


def _page_params(page_raw: Any, page_size_raw: Any) -> tuple[int, int]:
    try:
        page = max(1, int(page_raw or 1))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = max(1, min(MAX_PAGE_SIZE, int(page_size_raw or DEFAULT_PAGE_SIZE)))
    except (TypeError, ValueError):
        page_size = DEFAULT_PAGE_SIZE
    return page, page_size


def _paginate(items: list[Any], *, page: int, page_size: int, count: int | None = None) -> dict[str, Any]:
    total = count if count is not None else len(items)
    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    page = min(page, total_pages)
    start = (page - 1) * page_size
    end = start + page_size
    slice_items = items if count is not None else items[start:end]
    return {
        "results": slice_items,
        "count": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def _serialize_generation(item: AiGenerationUsage) -> dict[str, Any]:
    user_name = "—"
    if item.user_id and item.user:
        user_name = (
            (item.user.full_name or "").strip()
            or f"{(item.user.first_name or '').strip()} {(item.user.last_name or '').strip()}".strip()
            or (item.user.phone or item.user.email or f"User #{item.user_id}")
        )
    return {
        "id": item.id,
        "user_id": item.user_id,
        "user_name": user_name,
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
        "tokens_estimated": item.tokens_estimated,
        "latency_ms": item.latency_ms,
        "error_detail": item.error_detail,
        "job_id": item.job_id,
        "created_at": item.created_at.isoformat(),
    }


def _generations_qs(start_raw: str | None, end_raw: str | None):
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    return (
        AiGenerationUsage.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .select_related("user")
        .order_by("-created_at")
    ), {"start": start_dt.date().isoformat(), "end": end_dt.date().isoformat()}


def _list_generations(start_raw, end_raw, page, page_size) -> dict[str, Any]:
    qs, rng = _generations_qs(start_raw, end_raw)
    count = qs.count()
    start = (page - 1) * page_size
    rows = [_serialize_generation(item) for item in qs[start : start + page_size]]
    payload = _paginate(rows, page=page, page_size=page_size, count=count)
    payload["range"] = rng
    payload["kind"] = "generations"
    return payload


def _list_spenders(start_raw, end_raw, page, page_size) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    base = (
        AiGenerationUsage.objects.filter(
            created_at__gte=start_dt,
            created_at__lte=end_dt,
            user_id__isnull=False,
        )
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
            face_check=Count("id", filter=Q(kind=AiGenerationUsage.Kind.FACE_CHECK)),
            tokens=Sum("total_tokens"),
            prompt_tokens=Sum("prompt_tokens"),
            candidates_tokens=Sum("candidates_tokens"),
            cost_usd=Sum("cost_usd"),
            last_at=Max("created_at"),
        )
        .order_by("-cost_usd", "-generations")
    )
    count = base.count()
    start = (page - 1) * page_size
    rows = [
        {
            "user_id": row["user_id"],
            "name": _user_label(row),
            "phone": row.get("user__phone") or "",
            "email": row.get("user__email") or "",
            "generations": int(row["generations"] or 0),
            "tryon": int(row["tryon"] or 0),
            "analyze": int(row["analyze"] or 0),
            "studio": int(row["studio"] or 0),
            "face_check": int(row["face_check"] or 0),
            "tokens": int(row["tokens"] or 0),
            "prompt_tokens": int(row["prompt_tokens"] or 0),
            "candidates_tokens": int(row["candidates_tokens"] or 0),
            "cost_usd": _money(row["cost_usd"]),
            "last_at": row["last_at"].isoformat() if row.get("last_at") else None,
        }
        for row in base[start : start + page_size]
    ]
    payload = _paginate(rows, page=page, page_size=page_size, count=count)
    payload["range"] = {
        "start": start_dt.date().isoformat(),
        "end": end_dt.date().isoformat(),
    }
    payload["kind"] = "spenders"
    return payload


def _list_errors(start_raw, end_raw, page, page_size) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    qs = (
        AiGenerationUsage.objects.filter(
            created_at__gte=start_dt,
            created_at__lte=end_dt,
            status=AiGenerationUsage.Status.FAILED,
        )
        .select_related("user")
        .order_by("-created_at")
    )
    count = qs.count()
    start = (page - 1) * page_size
    rows = [
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
        for item in qs[start : start + page_size]
    ]
    payload = _paginate(rows, page=page, page_size=page_size, count=count)
    payload["range"] = {
        "start": start_dt.date().isoformat(),
        "end": end_dt.date().isoformat(),
    }
    payload["kind"] = "errors"
    return payload


def _list_active_users(page, page_size) -> dict[str, Any]:
    s = MorphAiSettings.load()
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    base = (
        AiGenerationUsage.objects.filter(
            created_at__gte=today_start,
            kind=AiGenerationUsage.Kind.TRYON,
            user_id__isnull=False,
        )
        .values("user_id", "user__full_name", "user__phone", "user__email")
        .annotate(tryon=Count("id"), cost_usd=Sum("cost_usd"))
        .order_by("-tryon")
    )
    count = base.count()
    start = (page - 1) * page_size
    limit = s.daily_tryon_limit_per_user
    rows = []
    for row in base[start : start + page_size]:
        tryon = int(row["tryon"])
        rows.append(
            {
                "user_id": row["user_id"],
                "name": (
                    row.get("user__full_name")
                    or row.get("user__phone")
                    or row.get("user__email")
                    or f"#{row['user_id']}"
                ),
                "phone": row.get("user__phone") or "",
                "tryon_today": tryon,
                "cost_usd": _money(row["cost_usd"]),
                "over_limit": bool(limit > 0 and tryon >= limit),
            }
        )
    payload = _paginate(rows, page=page, page_size=page_size, count=count)
    payload["kind"] = "active-users"
    payload["range"] = {"start": today_start.date().isoformat(), "end": now.date().isoformat()}
    return payload


def _queue_all_items() -> list[dict[str, Any]]:
    from ai.services.tryon_queue import (
        QUEUE_KEY,
        STATUS_QUEUED,
        _load_job,
        _redis_client,
        is_queue_enabled,
    )

    if not is_queue_enabled():
        return []
    client = _redis_client()
    if client is None:
        return []
    ids = client.lrange(QUEUE_KEY, 0, -1) or []
    items = []
    for jid in ids:
        meta = _load_job(client, jid) or {"job_id": jid, "status": STATUS_QUEUED}
        items.append(
            {
                "job_id": jid,
                "user_id": meta.get("user_id"),
                "style_title": meta.get("style_title") or "",
                "status": meta.get("status") or STATUS_QUEUED,
                "created_at": meta.get("created_at"),
            }
        )
    return items


def _list_queue(page, page_size) -> dict[str, Any]:
    items = _queue_all_items()
    payload = _paginate(items, page=page, page_size=page_size)
    payload["kind"] = "queue"
    return payload


def _list_daily(start_raw, end_raw, page, page_size) -> dict[str, Any]:
    start_dt, end_dt = resolve_range(start_raw, end_raw)
    rows_qs = list(
        AiGenerationUsage.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            generations=Count("id"),
            tryon=Count("id", filter=Q(kind=AiGenerationUsage.Kind.TRYON)),
            analyze=Count("id", filter=Q(kind=AiGenerationUsage.Kind.ANALYZE)),
            tokens=Sum("total_tokens"),
            cost_usd=Sum("cost_usd"),
            users=Count("user_id", distinct=True),
        )
        .order_by("-day")
    )
    rows = [
        {
            "date": row["day"].isoformat() if row["day"] else "",
            "generations": int(row["generations"] or 0),
            "tryon": int(row["tryon"] or 0),
            "analyze": int(row["analyze"] or 0),
            "tokens": int(row["tokens"] or 0),
            "cost_usd": _money(row["cost_usd"]),
            "users": int(row["users"] or 0),
        }
        for row in rows_qs
    ]
    payload = _paginate(rows, page=page, page_size=page_size)
    payload["range"] = {
        "start": start_dt.date().isoformat(),
        "end": end_dt.date().isoformat(),
    }
    payload["kind"] = "daily"
    return payload


def _list_gallery(page, page_size, request=None) -> dict[str, Any]:
    qs = (
        AiStyleHistoryEntry.objects.filter(photo__isnull=False)
        .exclude(photo="")
        .select_related("user")
        .order_by("-created_at")
    )
    count = qs.count()
    start = (page - 1) * page_size
    items = []
    missing = 0
    for row in qs[start : start + page_size]:
        photo_url = None
        if row.photo:
            try:
                if row.photo.storage.exists(row.photo.name):
                    photo_url = row.photo.url
                    if photo_url and photo_url.startswith("http"):
                        marker = "/media/"
                        idx = photo_url.find(marker)
                        if idx >= 0:
                            photo_url = photo_url[idx:]
                else:
                    missing += 1
            except Exception:
                missing += 1
        items.append(
            {
                "id": row.id,
                "user_id": row.user_id,
                "user_name": row.user.full_name or row.user.phone or row.user.email,
                "source": row.source,
                "face_shape_key": row.face_shape_key,
                "hair_type_key": row.hair_type_key,
                "photo_url": photo_url,
                "photo_missing": photo_url is None,
                "created_at": row.created_at.isoformat(),
            }
        )
    payload = _paginate(items, page=page, page_size=page_size, count=count)
    payload["kind"] = "gallery"
    payload["media_note"] = (
        "Ba'zi rasmlar diskda topilmadi. Productionda doimiy saqlash uchun USE_S3_MEDIA yoqing."
        if missing
        else None
    )
    return payload


def build_morph_list(
    kind: str,
    *,
    start_raw: str | None = None,
    end_raw: str | None = None,
    page_raw: Any = 1,
    page_size_raw: Any = DEFAULT_PAGE_SIZE,
    request=None,
) -> dict[str, Any]:
    if kind not in LIST_KINDS:
        raise ValueError("Unknown list kind")
    page, page_size = _page_params(page_raw, page_size_raw)
    if kind == "generations":
        return _list_generations(start_raw, end_raw, page, page_size)
    if kind == "spenders":
        return _list_spenders(start_raw, end_raw, page, page_size)
    if kind == "errors":
        return _list_errors(start_raw, end_raw, page, page_size)
    if kind == "active-users":
        return _list_active_users(page, page_size)
    if kind == "queue":
        return _list_queue(page, page_size)
    if kind == "daily":
        return _list_daily(start_raw, end_raw, page, page_size)
    return _list_gallery(page, page_size, request=request)


def build_morph_list_export_csv(
    kind: str,
    *,
    start_raw: str | None = None,
    end_raw: str | None = None,
) -> HttpResponse:
    if kind not in LIST_KINDS:
        return HttpResponse("Unknown kind", status=400)

    # Fetch all pages for export (chunk by high page size in a loop).
    page = 1
    all_rows: list[dict[str, Any]] = []
    while True:
        chunk = build_morph_list(
            kind,
            start_raw=start_raw,
            end_raw=end_raw,
            page_raw=page,
            page_size_raw=MAX_PAGE_SIZE,
        )
        all_rows.extend(chunk["results"])
        if page >= int(chunk["total_pages"]):
            break
        page += 1
        if page > 10_000:
            break

    buf = io.StringIO()
    buf.write("\ufeff")
    writer = csv.writer(buf)

    if kind == "generations":
        writer.writerow(
            [
                "id",
                "created_at",
                "user_id",
                "user",
                "kind",
                "status",
                "style_title",
                "total_tokens",
                "cost_usd",
                "error_detail",
                "job_id",
            ]
        )
        for r in all_rows:
            writer.writerow(
                [
                    r.get("id"),
                    r.get("created_at"),
                    r.get("user_id") or "",
                    r.get("user_name"),
                    r.get("kind"),
                    r.get("status"),
                    r.get("style_title"),
                    r.get("total_tokens"),
                    r.get("cost_usd"),
                    r.get("error_detail"),
                    r.get("job_id"),
                ]
            )
    elif kind == "spenders":
        writer.writerow(
            ["user_id", "name", "phone", "email", "generations", "tryon", "tokens", "cost_usd", "last_at"]
        )
        for r in all_rows:
            writer.writerow(
                [
                    r.get("user_id"),
                    r.get("name"),
                    r.get("phone"),
                    r.get("email"),
                    r.get("generations"),
                    r.get("tryon"),
                    r.get("tokens"),
                    r.get("cost_usd"),
                    r.get("last_at") or "",
                ]
            )
    elif kind == "errors":
        writer.writerow(["id", "created_at", "user_id", "user", "kind", "style_title", "error_detail"])
        for r in all_rows:
            writer.writerow(
                [
                    r.get("id"),
                    r.get("created_at"),
                    r.get("user_id") or "",
                    r.get("user_name"),
                    r.get("kind"),
                    r.get("style_title"),
                    r.get("error_detail"),
                ]
            )
    elif kind == "active-users":
        writer.writerow(["user_id", "name", "phone", "tryon_today", "cost_usd", "over_limit"])
        for r in all_rows:
            writer.writerow(
                [
                    r.get("user_id"),
                    r.get("name"),
                    r.get("phone"),
                    r.get("tryon_today"),
                    r.get("cost_usd"),
                    r.get("over_limit"),
                ]
            )
    elif kind == "queue":
        writer.writerow(["job_id", "user_id", "style_title", "status", "created_at"])
        for r in all_rows:
            writer.writerow(
                [
                    r.get("job_id"),
                    r.get("user_id") or "",
                    r.get("style_title"),
                    r.get("status"),
                    r.get("created_at") or "",
                ]
            )
    elif kind == "daily":
        writer.writerow(["date", "generations", "tryon", "analyze", "tokens", "cost_usd", "users"])
        for r in all_rows:
            writer.writerow(
                [
                    r.get("date"),
                    r.get("generations"),
                    r.get("tryon"),
                    r.get("analyze"),
                    r.get("tokens"),
                    r.get("cost_usd"),
                    r.get("users"),
                ]
            )
    else:  # gallery
        writer.writerow(
            ["id", "created_at", "user_id", "user", "source", "face_shape_key", "hair_type_key", "photo_url"]
        )
        for r in all_rows:
            writer.writerow(
                [
                    r.get("id"),
                    r.get("created_at"),
                    r.get("user_id"),
                    r.get("user_name"),
                    r.get("source"),
                    r.get("face_shape_key"),
                    r.get("hair_type_key"),
                    r.get("photo_url") or "",
                ]
            )

    resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="morph-ai-{kind}.csv"'
    return resp
