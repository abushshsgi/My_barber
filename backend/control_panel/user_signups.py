"""Mijoz ro'yxatdan o'tish analitikasi — telefon vs Google."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.email_utils import is_internal_email
from accounts.models import User


def detect_signup_method(user: User) -> str:
    if user.google_sub:
        return "google"
    if user.phone:
        return "phone"
    if not is_internal_email(user.email):
        return "email"
    return "unknown"


def _client_users_qs():
    return User.objects.filter(role=User.Role.USER)


def _google_filter() -> Q:
    return Q(google_sub__isnull=False) & ~Q(google_sub="")


def _phone_filter() -> Q:
    return (
        Q(phone__isnull=False)
        & ~Q(phone="")
        & (Q(google_sub__isnull=True) | Q(google_sub=""))
    )


def build_user_signup_analytics(*, recent_limit: int = 100) -> dict:
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    base = _client_users_qs()

    # Django: bir nechta Filtered Count + bo'sh string Q bir agregatda to'qnashishi mumkin.
    # Shuning uchun ikkiga bo'lamiz (baribir 10 ta alohida COUNT dan ancha tez).
    totals = base.aggregate(
        total=Count("id"),
        google=Count("id", filter=_google_filter()),
        phone=Count("id", filter=_phone_filter()),
        today_total=Count("id", filter=Q(date_joined__gte=today_start)),
        week_total=Count("id", filter=Q(date_joined__gte=week_start)),
    )
    period = base.aggregate(
        today_google=Count("id", filter=Q(date_joined__gte=today_start) & _google_filter()),
        today_phone=Count("id", filter=Q(date_joined__gte=today_start) & _phone_filter()),
        week_google=Count("id", filter=Q(date_joined__gte=week_start) & _google_filter()),
        week_phone=Count("id", filter=Q(date_joined__gte=week_start) & _phone_filter()),
    )
    total = int(totals["total"] or 0)
    google_total = int(totals["google"] or 0)
    phone_total = int(totals["phone"] or 0)

    daily_rows = (
        base.filter(date_joined__gte=week_start)
        .annotate(day=TruncDate("date_joined"))
        .values("day")
        .annotate(
            total=Count("id"),
            google=Count("id", filter=_google_filter()),
            phone=Count("id", filter=_phone_filter()),
        )
        .order_by("day")
    )
    daily_map = {row["day"]: row for row in daily_rows}

    daily: list[dict] = []
    for offset in range(7):
        day = (week_start + timedelta(days=offset)).date()
        row = daily_map.get(day, {})
        daily.append(
            {
                "date": day.isoformat(),
                "total": int(row.get("total") or 0),
                "google": int(row.get("google") or 0),
                "phone": int(row.get("phone") or 0),
            }
        )

    recent_users = (
        base.order_by("-date_joined")
        .only(
            "id",
            "full_name",
            "first_name",
            "last_name",
            "phone",
            "email",
            "google_sub",
            "date_joined",
        )[:recent_limit]
    )
    recent = []
    for user in recent_users:
        name = (user.full_name or f"{user.first_name} {user.last_name}").strip()
        recent.append(
            {
                "id": user.id,
                "full_name": name or f"Mijoz #{user.id}",
                "phone": user.phone,
                "display_email": None if is_internal_email(user.email) else user.email,
                "signup_method": detect_signup_method(user),
                "date_joined": user.date_joined.isoformat() if user.date_joined else None,
            }
        )

    return {
        "generated_at": now.isoformat(),
        "summary": {
            "total": total,
            "google": google_total,
            "phone": phone_total,
            "other": max(0, total - google_total - phone_total),
            "today_total": int(totals["today_total"] or 0),
            "today_google": int(period["today_google"] or 0),
            "today_phone": int(period["today_phone"] or 0),
            "week_total": int(totals["week_total"] or 0),
            "week_google": int(period["week_google"] or 0),
            "week_phone": int(period["week_phone"] or 0),
        },
        "daily": daily,
        "recent": recent,
    }
