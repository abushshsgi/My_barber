"""Salon qo'shilishi analitikasi — platformaga real vaqt."""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.uz_regions import UzRegion
from salons.models import Salon


def _salon_region_label(salon: Salon) -> str:
    owner = getattr(salon, "owner_barber", None)
    if not owner or not owner.region:
        return ""
    return dict(UzRegion.choices).get(owner.region, owner.region)


def build_salon_platform_analytics(*, recent_limit: int = 100) -> dict:
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    base = Salon.objects.select_related("owner_barber")
    published_q = Q(is_published=True)
    pending_q = Q(is_published=False)

    total = base.count()
    published_total = base.filter(published_q).count()
    pending_total = base.filter(pending_q).count()

    today = base.filter(created_at__gte=today_start)
    week = base.filter(created_at__gte=week_start)

    daily_rows = (
        base.filter(created_at__gte=week_start)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(
            total=Count("id"),
            published=Count("id", filter=published_q),
            pending=Count("id", filter=pending_q),
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
                "published": int(row.get("published") or 0),
                "pending": int(row.get("pending") or 0),
            }
        )

    recent_salons = base.order_by("-created_at").only(
        "id",
        "name",
        "address",
        "phone",
        "is_published",
        "created_at",
        "owner_barber_id",
    )[:recent_limit]

    owner_ids = {s.owner_barber_id for s in recent_salons if s.owner_barber_id}
    owners: dict[int, object] = {}
    if owner_ids:
        from barbers.models import Barber

        owners = {b.id: b for b in Barber.objects.filter(id__in=owner_ids).only("id", "full_name", "region")}

    recent = []
    for salon in recent_salons:
        owner = owners.get(salon.owner_barber_id) if salon.owner_barber_id else None
        region = owner.region if owner and owner.region else ""
        recent.append(
            {
                "id": salon.id,
                "name": salon.name,
                "address": salon.address or "",
                "phone": salon.phone or "",
                "region": region,
                "region_label": dict(UzRegion.choices).get(region, region) if region else "",
                "is_published": salon.is_published,
                "owner_name": (owner.full_name if owner else "") or "",
                "created_at": salon.created_at.isoformat() if salon.created_at else None,
            }
        )

    return {
        "summary": {
            "total": total,
            "published": published_total,
            "pending": pending_total,
            "today_total": today.count(),
            "today_published": today.filter(published_q).count(),
            "today_pending": today.filter(pending_q).count(),
            "week_total": week.count(),
            "week_published": week.filter(published_q).count(),
            "week_pending": week.filter(pending_q).count(),
        },
        "daily": daily,
        "recent": recent,
    }
