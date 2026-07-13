"""Platforma real vaqt ro'yxatdan o'tish — mijoz, sartarosh, salon birlashtirilgan."""

from __future__ import annotations

from django.utils import timezone

from .barber_growth import build_barber_platform_analytics
from .salon_growth import build_salon_platform_analytics
from .user_signups import build_user_signup_analytics


def build_live_platform_analytics(*, recent_limit: int = 50) -> dict:
    users = build_user_signup_analytics(recent_limit=recent_limit)
    salons = build_salon_platform_analytics(recent_limit=recent_limit)
    barbers = build_barber_platform_analytics(recent_limit=recent_limit)

    today_total = (
        users["summary"]["today_total"]
        + salons["summary"]["today_total"]
        + barbers["summary"]["today_total"]
    )
    week_total = (
        users["summary"]["week_total"]
        + salons["summary"]["week_total"]
        + barbers["summary"]["week_total"]
    )

    # Kunlik birlashgan trend (7 kun).
    combined_daily: list[dict] = []
    for i in range(7):
        u = users["daily"][i] if i < len(users["daily"]) else {}
        s = salons["daily"][i] if i < len(salons["daily"]) else {}
        b = barbers["daily"][i] if i < len(barbers["daily"]) else {}
        day = u.get("date") or s.get("date") or b.get("date") or ""
        users_n = int(u.get("total") or 0)
        salons_n = int(s.get("total") or 0)
        barbers_n = int(b.get("total") or 0)
        combined_daily.append(
            {
                "date": day,
                "users": users_n,
                "salons": salons_n,
                "barbers": barbers_n,
                "total": users_n + salons_n + barbers_n,
            }
        )

    return {
        "generated_at": timezone.now().isoformat(),
        "summary": {
            "clients_total": users["summary"]["total"],
            "barbers_total": barbers["summary"]["total"],
            "salons_total": salons["summary"]["total"],
            "today_signups": today_total,
            "week_signups": week_total,
            "today_clients": users["summary"]["today_total"],
            "today_barbers": barbers["summary"]["today_total"],
            "today_salons": salons["summary"]["today_total"],
        },
        "combined_daily": combined_daily,
        "users": users,
        "barbers": barbers,
        "salons": salons,
    }
