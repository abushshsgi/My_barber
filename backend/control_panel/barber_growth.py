"""Sartarosh ro'yxatdan o'tishi analitikasi — platformaga real vaqt."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Exists, OuterRef, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.uz_regions import UzRegion
from barbers.models import Barber
from salons.models import Salon, SalonMembership

from .barber_segments import segment_for_barber


def _segment_annotate(qs):
    """Exists (boolean) — TruncDate + FILTER group-by bilan ham ishlaydi (Count emas)."""
    owned = Salon.objects.filter(owner_barber_id=OuterRef("pk"))
    ext_mem = SalonMembership.objects.filter(
        barber_id=OuterRef("pk"),
        invite_state=SalonMembership.InviteState.ACTIVE,
    ).exclude(salon__owner_barber_id=OuterRef("pk"))
    return qs.annotate(_owned=Exists(owned), _ext_mem=Exists(ext_mem))


def build_barber_platform_analytics(*, recent_limit: int = 100) -> dict:
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    independent_q = Q(work_mode=Barber.WorkMode.INDEPENDENT)
    mybarber_q = Q(onboarding_flow=Barber.OnboardingFlow.MYBARBER) & ~independent_q
    owner_q = Q(_owned=True) & ~independent_q & ~mybarber_q
    employee_q = Q(_owned=False, _ext_mem=True) & ~independent_q & ~mybarber_q
    salonish_q = owner_q | employee_q | mybarber_q
    today_q = Q(date_joined__gte=today_start)
    week_q = Q(date_joined__gte=week_start)

    base = _segment_annotate(Barber.objects.all())
    agg = base.aggregate(
        total=Count("id"),
        independent=Count("id", filter=independent_q),
        mybarber_salon=Count("id", filter=mybarber_q),
        salon_owner=Count("id", filter=owner_q),
        salon_employee=Count("id", filter=employee_q),
        today_total=Count("id", filter=today_q),
        today_independent=Count("id", filter=today_q & independent_q),
        today_salon=Count("id", filter=today_q & salonish_q),
        week_total=Count("id", filter=week_q),
        week_independent=Count("id", filter=week_q & independent_q),
        week_salon=Count("id", filter=week_q & salonish_q),
    )
    total = int(agg["total"] or 0)
    independent_total = int(agg["independent"] or 0)
    mybarber_total = int(agg["mybarber_salon"] or 0)
    owner_total = int(agg["salon_owner"] or 0)
    employee_total = int(agg["salon_employee"] or 0)
    other_total = max(0, total - independent_total - mybarber_total - owner_total - employee_total)

    daily_rows = (
        _segment_annotate(Barber.objects.filter(date_joined__gte=week_start))
        .annotate(day=TruncDate("date_joined"))
        .values("day")
        .annotate(
            total=Count("id"),
            independent=Count("id", filter=independent_q),
            salon=Count("id", filter=salonish_q),
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

    recent_barbers = list(
        _segment_annotate(Barber.objects.all())
        .order_by("-date_joined")
        .only(
            "id",
            "full_name",
            "phone",
            "region",
            "work_mode",
            "onboarding_flow",
            "date_joined",
        )[:recent_limit]
    )

    # segment_for_barber reads _owned_cnt — map Exists → counts for compatibility
    recent = []
    for barber in recent_barbers:
        barber._owned_cnt = 1 if getattr(barber, "_owned", False) else 0
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
            "today_total": int(agg["today_total"] or 0),
            "today_independent": int(agg["today_independent"] or 0),
            "today_salon": int(agg["today_salon"] or 0),
            "week_total": int(agg["week_total"] or 0),
            "week_independent": int(agg["week_independent"] or 0),
            "week_salon": int(agg["week_salon"] or 0),
        },
        "daily": daily,
        "recent": recent,
    }
