"""Sartarosh ro'yxatdan o'tishi analitikasi — platformaga real vaqt."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.uz_regions import UzRegion
from barbers.models import Barber

from .barber_segments import annotate_barber_segment_fields, segment_for_barber


def build_barber_platform_analytics(*, recent_limit: int = 100) -> dict:
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    base = annotate_barber_segment_fields(Barber.objects.all())
    independent_q = Q(work_mode=Barber.WorkMode.INDEPENDENT)
    mybarber_q = Q(onboarding_flow=Barber.OnboardingFlow.MYBARBER) & ~independent_q
    owner_q = Q(_owned_cnt__gt=0) & ~independent_q & ~mybarber_q
    employee_q = Q(_owned_cnt=0, _ext_mem=True) & ~independent_q & ~mybarber_q

    total = base.count()
    independent_total = base.filter(independent_q).count()
    mybarber_total = base.filter(mybarber_q).count()
    owner_total = base.filter(owner_q).count()
    employee_total = base.filter(employee_q).count()
    other_total = max(0, total - independent_total - mybarber_total - owner_total - employee_total)

    today = base.filter(date_joined__gte=today_start)
    week = base.filter(date_joined__gte=week_start)

    daily_rows = (
        base.filter(date_joined__gte=week_start)
        .annotate(day=TruncDate("date_joined"))
        .values("day")
        .annotate(
            total=Count("id"),
            independent=Count("id", filter=independent_q),
            salon=Count("id", filter=owner_q | employee_q | mybarber_q),
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
                "independent": int(row.get("independent") or 0),
                "salon": int(row.get("salon") or 0),
            }
        )

    recent_barbers = base.order_by("-date_joined").only(
        "id",
        "full_name",
        "phone",
        "region",
        "work_mode",
        "onboarding_flow",
        "date_joined",
    )[:recent_limit]

    recent = []
    for barber in recent_barbers:
        recent.append(
            {
                "id": barber.id,
                "full_name": barber.full_name or f"Sartarosh #{barber.id}",
                "phone": barber.phone or "",
                "region": barber.region or "",
                "region_label": dict(UzRegion.choices).get(barber.region, barber.region)
                if barber.region
                else "",
                "segment": segment_for_barber(barber),
                "created_at": barber.date_joined.isoformat() if barber.date_joined else None,
            }
        )

    return {
        "summary": {
            "total": total,
            "independent": independent_total,
            "mybarber_salon": mybarber_total,
            "salon_owner": owner_total,
            "salon_employee": employee_total,
            "other": other_total,
            "today_total": today.count(),
            "today_independent": today.filter(independent_q).count(),
            "today_salon": today.filter(owner_q | employee_q | mybarber_q).count(),
            "week_total": week.count(),
            "week_independent": week.filter(independent_q).count(),
            "week_salon": week.filter(owner_q | employee_q | mybarber_q).count(),
        },
        "daily": daily,
        "recent": recent,
    }
