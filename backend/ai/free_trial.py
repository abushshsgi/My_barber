"""Admin: bir martalik bepul try-on ishlatgan yangi userlar ro'yxati."""

from __future__ import annotations

import csv
from typing import Any

from django.db.models import Count, Q
from django.http import HttpResponse

from accounts.models import User, UserSession
from ai.models import AiGenerationUsage
from subscriptions.models import UserSubscription

DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def _int(raw: Any, default: int, *, lo: int = 1, hi: int = 10_000) -> int:
    try:
        return max(lo, min(hi, int(raw)))
    except (TypeError, ValueError):
        return default


def _label(user: User) -> str:
    name = (user.full_name or "").strip() or f"{user.first_name} {user.last_name}".strip()
    return name or (user.phone or "") or user.email or f"#{user.pk}"


def _base_queryset(q: str = ""):
    qs = User.objects.filter(morph_free_tryon_used_at__isnull=False)
    q = (q or "").strip()
    if q:
        cond = Q(full_name__icontains=q) | Q(phone__icontains=q) | Q(email__icontains=q)
        if q.isdigit():
            cond |= Q(pk=int(q))
        qs = qs.filter(cond)
    return qs.order_by("-morph_free_tryon_used_at", "-id")


def _summary() -> dict[str, Any]:
    eligible = User.objects.filter(morph_free_tryon_eligible=True, role=User.Role.USER)
    used_ids = User.objects.filter(morph_free_tryon_used_at__isnull=False).values("id")
    used = used_ids.count()
    converted = (
        UserSubscription.objects.filter(user_id__in=used_ids).values("user_id").distinct().count()
    )
    return {
        "eligible_total": eligible.count(),
        "used_total": used,
        "unused_total": eligible.filter(morph_free_tryon_used_at__isnull=True).count(),
        "converted_total": converted,
        "conversion_pct": round(converted * 100 / used, 1) if used else 0.0,
    }


def _rows(users: list[User]) -> list[dict[str, Any]]:
    ids = [u.pk for u in users]
    if not ids:
        return []
    tryons = dict(
        AiGenerationUsage.objects.filter(
            user_id__in=ids,
            kind=AiGenerationUsage.Kind.TRYON,
            status=AiGenerationUsage.Status.SUCCESS,
        )
        .values("user_id")
        .annotate(n=Count("id"))
        .values_list("user_id", "n")
    )
    sessions: dict[int, UserSession] = {}
    for s in UserSession.objects.filter(user_id__in=ids).order_by("user_id", "-last_seen_at"):
        sessions.setdefault(s.user_id, s)
    subs: dict[int, UserSubscription] = {}
    for sub in UserSubscription.objects.filter(user_id__in=ids).order_by("user_id", "-created_at"):
        subs.setdefault(sub.user_id, sub)

    out = []
    for u in users:
        sess = sessions.get(u.pk)
        sub = subs.get(u.pk)
        out.append(
            {
                "user_id": u.pk,
                "name": _label(u),
                "phone": u.phone or "",
                "email": u.email or "",
                "gender": getattr(u, "gender", "") or "",
                "date_joined": u.date_joined.isoformat() if u.date_joined else None,
                "free_tryon_used_at": u.morph_free_tryon_used_at.isoformat()
                if u.morph_free_tryon_used_at
                else None,
                "tryon_total": int(tryons.get(u.pk, 0)),
                "platform": (sess.platform if sess else "") or "",
                "client_kind": (sess.client_kind if sess else "") or "",
                "device_name": (sess.device_name if sess else "") or "",
                "app_version": (sess.app_version if sess else "") or "",
                "last_seen_at": sess.last_seen_at.isoformat() if sess and sess.last_seen_at else None,
                "subscription_plan": sub.plan_code if sub else None,
                "subscription_status": sub.status if sub else None,
            }
        )
    return out


def build_free_trial_users(
    *, q: str = "", page_raw: Any = None, page_size_raw: Any = None
) -> dict[str, Any]:
    page = _int(page_raw, 1)
    page_size = _int(page_size_raw, DEFAULT_PAGE_SIZE, hi=MAX_PAGE_SIZE)
    qs = _base_queryset(q)
    total = qs.count()
    start = (page - 1) * page_size
    users = list(qs[start : start + page_size])
    return {
        "summary": _summary(),
        "count": total,
        "page": page,
        "page_size": page_size,
        "results": _rows(users),
    }


def build_free_trial_users_csv(*, q: str = "") -> HttpResponse:
    resp = HttpResponse(content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = 'attachment; filename="morph-free-tryon-users.csv"'
    resp.write("\ufeff")
    writer = csv.writer(resp)
    writer.writerow(
        [
            "user_id",
            "name",
            "phone",
            "email",
            "date_joined",
            "free_tryon_used_at",
            "tryon_total",
            "platform",
            "device_name",
            "app_version",
            "subscription_plan",
            "subscription_status",
        ]
    )
    qs = _base_queryset(q)
    for offset in range(0, qs.count(), 500):
        for r in _rows(list(qs[offset : offset + 500])):
            writer.writerow(
                [
                    r["user_id"],
                    r["name"],
                    r["phone"],
                    r["email"],
                    r["date_joined"],
                    r["free_tryon_used_at"],
                    r["tryon_total"],
                    r["platform"],
                    r["device_name"],
                    r["app_version"],
                    r["subscription_plan"] or "",
                    r["subscription_status"] or "",
                ]
            )
    return resp
