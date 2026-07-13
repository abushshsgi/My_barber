"""Platforma statistikasi — admin panel uchun B2B/B2C real vaqt analitikasi."""

from __future__ import annotations

from datetime import datetime, timedelta

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils import timezone

from accounts.models import User
from accounts.uz_regions import UzRegion
from barbers.models import Barber
from bookings.earnings import (
    completed_bookings_qs,
    filter_bookings_by_earnings_period,
    payment_breakdown,
)
from bookings.models import Booking
from salons.models import Salon
from wallet.models import GiftTransfer, LedgerEntry

from .barber_segments import barber_segment_counts
from .models import Payout

DEFAULT_RANGE_DAYS = 30

_MONTH_LABELS_UZ = [
    "Yan",
    "Fev",
    "Mar",
    "Apr",
    "May",
    "Iyn",
    "Iyl",
    "Avg",
    "Sen",
    "Okt",
    "Noy",
    "Dek",
]


def _decimal_sum(field: str, condition: Q | None = None):
    expr = Sum(field, filter=condition) if condition is not None else Sum(field)
    return Coalesce(expr, Value(0), output_field=DecimalField(max_digits=16, decimal_places=2))


def resolve_range(start_raw: str | None, end_raw: str | None) -> tuple[datetime, datetime]:
    """`YYYY-MM-DD` stringlarni to'liq kunlik aware datetime oralig'iga aylantiradi."""
    tz = timezone.get_current_timezone()
    today = timezone.localdate()

    def _parse(value: str | None):
        if not value:
            return None
        try:
            return datetime.strptime(value.strip(), "%Y-%m-%d").date()
        except (ValueError, AttributeError):
            return None

    end_date = _parse(end_raw) or today
    start_date = _parse(start_raw) or (end_date - timedelta(days=DEFAULT_RANGE_DAYS - 1))
    if start_date > end_date:
        start_date, end_date = end_date, start_date

    start_dt = timezone.make_aware(datetime.combine(start_date, datetime.min.time()), tz)
    end_dt = timezone.make_aware(datetime.combine(end_date, datetime.max.time()), tz)
    return start_dt, end_dt


def _float(value) -> float:
    return float(value or 0)


def build_platform_overview(start_dt: datetime, end_dt: datetime) -> dict:
    """B2C + B2B umumiy ko'rsatkichlar (tanlangan davr uchun)."""
    completed_all = completed_bookings_qs()
    completed_range = filter_bookings_by_earnings_period(completed_all, start_dt, end_dt)

    # Davr ichidagi barcha bronlar (yaratilgan sana bo'yicha).
    bookings_range = Booking.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    total_bookings = bookings_range.count()
    completed_count = bookings_range.filter(status=Booking.Status.COMPLETED).count()
    cancelled_count = bookings_range.filter(
        status__in=[Booking.Status.CANCELLED, Booking.Status.REJECTED]
    ).count()

    breakdown = payment_breakdown(completed_range)

    # GMV = barcha yakunlangan (naqd + onlayn); platforma daromadi = onlayn to'langan.
    gmv = breakdown["total_income"]
    online_revenue = breakdown["online_total"]
    cash_revenue = breakdown["cash_total"]

    clients_total = User.objects.filter(role=User.Role.USER).count()
    active_clients = (
        bookings_range.values("customer_id").distinct().count()
    )

    segments = barber_segment_counts()
    salons_total = Salon.objects.count()
    salons_published = Salon.objects.filter(is_published=True).count()

    pending_payouts = Payout.objects.filter(status=Payout.Status.PENDING).aggregate(
        s=_decimal_sum("amount")
    )["s"]

    success_rate = (
        round(completed_count / total_bookings * 100, 1) if total_bookings else 0.0
    )

    return {
        "range": {
            "start": start_dt.date().isoformat(),
            "end": end_dt.date().isoformat(),
        },
        "b2c": {
            "clients_total": clients_total,
            "active_clients": active_clients,
            "total_bookings": total_bookings,
            "completed_bookings": completed_count,
            "cancelled_bookings": cancelled_count,
            "success_rate": success_rate,
            "cash_count": breakdown["cash_count"],
            "online_count": breakdown["online_count"],
        },
        "b2b": {
            "barbers_total": segments["total"],
            "barbers_independent": segments["independent"],
            "barbers_salon_owner": segments["salon_owner"],
            "barbers_salon_employee": segments["salon_employee"],
            "barbers_mybarber_salon": segments["mybarber_salon"],
            "salons_total": salons_total,
            "salons_published": salons_published,
            "pending_payouts": _float(pending_payouts),
        },
        "revenue": {
            "gmv": _float(gmv),
            "cash_total": _float(cash_revenue),
            "online_total": _float(online_revenue),
            "cash_count": breakdown["cash_count"],
            "online_count": breakdown["online_count"],
        },
    }


def build_revenue_analytics(
    start_dt: datetime, end_dt: datetime, granularity: str = "month"
) -> dict:
    """Kunlik / haftalik / oyma-oy daromad va naqd/onlayn ajratish."""
    completed_range = filter_bookings_by_earnings_period(completed_bookings_qs(), start_dt, end_dt)

    cash_q = Q(payment_method=Booking.PaymentMethod.CASH)
    online_q = Q(
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    )

    trunc = TruncMonth if granularity == "month" else TruncDate
    from bookings.earnings import earnings_event_at_field

    rows = (
        completed_range.annotate(bucket=trunc(earnings_event_at_field()))
        .values("bucket")
        .annotate(
            cash=_decimal_sum("total_price", cash_q),
            online=_decimal_sum("total_price", online_q),
            count=Count("id"),
        )
        .order_by("bucket")
    )

    series: list[dict] = []
    for row in rows:
        bucket = row["bucket"]
        if bucket is None:
            continue
        if granularity == "month":
            label = f"{_MONTH_LABELS_UZ[bucket.month - 1]} {bucket.year}"
            key = bucket.strftime("%Y-%m")
        else:
            label = bucket.strftime("%d.%m")
            key = bucket.strftime("%Y-%m-%d")
        cash = _float(row["cash"])
        online = _float(row["online"])
        series.append(
            {
                "key": key,
                "label": label,
                "cash": cash,
                "online": online,
                "total": cash + online,
                "count": row["count"],
            }
        )

    breakdown = payment_breakdown(completed_range)

    top_barbers = [
        {
            "id": r["barber_id"],
            "name": r["barber__full_name"] or "—",
            "revenue": _float(r["rev"]),
            "count": r["cnt"],
        }
        for r in (
            completed_range.values("barber_id", "barber__full_name")
            .annotate(rev=_decimal_sum("total_price"), cnt=Count("id"))
            .order_by("-rev")[:10]
        )
    ]

    top_salons = [
        {
            "id": r["salon_id"],
            "name": r["salon__name"] or "—",
            "revenue": _float(r["rev"]),
            "count": r["cnt"],
        }
        for r in (
            completed_range.filter(salon__isnull=False)
            .values("salon_id", "salon__name")
            .annotate(rev=_decimal_sum("total_price"), cnt=Count("id"))
            .order_by("-rev")[:10]
        )
    ]

    return {
        "granularity": granularity,
        "series": series,
        "summary": {
            "gmv": _float(breakdown["total_income"]),
            "cash_total": _float(breakdown["cash_total"]),
            "online_total": _float(breakdown["online_total"]),
            "cash_count": breakdown["cash_count"],
            "online_count": breakdown["online_count"],
        },
        "top_barbers": top_barbers,
        "top_salons": top_salons,
    }


def build_wallet_analytics(start_dt: datetime, end_dt: datetime, recent_limit: int = 100) -> dict:
    """Hamyon oqimi — to'ldirish, sarf, sovg'a (LedgerEntry asosida)."""
    entries = LedgerEntry.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)

    topups = entries.filter(entry_type=LedgerEntry.EntryType.TOPUP)
    booking_pays = entries.filter(entry_type=LedgerEntry.EntryType.BOOKING_PAY)
    gifts_out = entries.filter(entry_type=LedgerEntry.EntryType.GIFT_OUT)
    refunds = entries.filter(entry_type=LedgerEntry.EntryType.REFUND)

    topup_total = topups.aggregate(s=_decimal_sum("amount"))["s"]
    # sarf summalari manfiy — absolyut qiymat uchun -Sum.
    spend_total = booking_pays.aggregate(s=_decimal_sum("amount"))["s"]
    gift_total = gifts_out.aggregate(s=_decimal_sum("amount"))["s"]
    refund_total = refunds.aggregate(s=_decimal_sum("amount"))["s"]

    topup_users = topups.values("wallet__user_id").distinct().count()
    spend_users = booking_pays.values("wallet__user_id").distinct().count()

    # To'ldirish manbasi bo'yicha (metadata.source).
    source_rows: dict[str, dict] = {}
    for entry in topups.only("amount", "metadata"):
        source = (entry.metadata or {}).get("source", "unknown")
        row = source_rows.setdefault(source, {"source": source, "amount": 0.0, "count": 0})
        row["amount"] += _float(entry.amount)
        row["count"] += 1
    topup_sources = sorted(source_rows.values(), key=lambda r: r["amount"], reverse=True)

    spend_types = [
        {"type": "booking_pay", "label": "Bron to'lovi", "amount": abs(_float(spend_total)), "count": booking_pays.count()},
        {"type": "gift_out", "label": "Sovg'a", "amount": abs(_float(gift_total)), "count": gifts_out.count()},
        {"type": "refund", "label": "Qaytarish", "amount": _float(refund_total), "count": refunds.count()},
    ]

    recent = []
    for entry in (
        entries.select_related("wallet__user")
        .order_by("-created_at")[:recent_limit]
    ):
        user = entry.wallet.user if entry.wallet_id else None
        recent.append(
            {
                "id": str(entry.id),
                "user_name": (user.full_name if user else "") or (user.phone if user else "") or "—",
                "entry_type": entry.entry_type,
                "amount": _float(entry.amount),
                "balance_after": _float(entry.balance_after),
                "source": (entry.metadata or {}).get("source", ""),
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            }
        )

    return {
        "summary": {
            "topup_total": _float(topup_total),
            "topup_users": topup_users,
            "spend_total": abs(_float(spend_total)),
            "spend_users": spend_users,
            "gift_total": abs(_float(gift_total)),
            "gift_count": GiftTransfer.objects.filter(
                created_at__gte=start_dt, created_at__lte=end_dt
            ).count(),
            "refund_total": _float(refund_total),
        },
        "topup_sources": topup_sources,
        "spend_types": spend_types,
        "recent": recent,
    }


def build_bookings_analytics(start_dt: datetime, end_dt: datetime) -> dict:
    """Bron funneli, muvaffaqiyat va to'lov usuli statistikasi."""
    bookings = Booking.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)

    status_counts = {row["status"]: row["c"] for row in bookings.values("status").annotate(c=Count("id"))}

    def _s(key: str) -> int:
        return int(status_counts.get(key, 0))

    total = bookings.count()
    completed = _s(Booking.Status.COMPLETED)
    cancelled = _s(Booking.Status.CANCELLED)
    rejected = _s(Booking.Status.REJECTED)
    finished = completed + cancelled + rejected
    success_rate = round(completed / finished * 100, 1) if finished else 0.0

    completed_qs = bookings.filter(status=Booking.Status.COMPLETED)
    cash_count = completed_qs.filter(payment_method=Booking.PaymentMethod.CASH).count()
    online_count = completed_qs.filter(
        payment_method=Booking.PaymentMethod.ONLINE,
        payment_status=Booking.PaymentStatus.PAID,
    ).count()

    cash_barbers = (
        completed_qs.filter(payment_method=Booking.PaymentMethod.CASH)
        .values("barber_id")
        .distinct()
        .count()
    )
    cash_salons = (
        completed_qs.filter(
            payment_method=Booking.PaymentMethod.CASH, salon__isnull=False
        )
        .values("salon_id")
        .distinct()
        .count()
    )

    funnel = [
        {"status": "pending", "label": "Kutilmoqda", "count": _s(Booking.Status.PENDING)},
        {"status": "accepted", "label": "Qabul qilindi", "count": _s(Booking.Status.ACCEPTED)},
        {"status": "in_progress", "label": "Jarayonda", "count": _s(Booking.Status.IN_PROGRESS)},
        {"status": "completed", "label": "Yakunlandi", "count": completed},
        {"status": "cancelled", "label": "Bekor qilindi", "count": cancelled},
        {"status": "rejected", "label": "Rad etildi", "count": rejected},
    ]

    return {
        "summary": {
            "total": total,
            "completed": completed,
            "cancelled": cancelled + rejected,
            "success_rate": success_rate,
            "cash_count": cash_count,
            "online_count": online_count,
            "cash_barbers": cash_barbers,
            "cash_salons": cash_salons,
        },
        "funnel": funnel,
    }


def build_bookings_rows(start_dt, end_dt, *, status="", payment_method=""):
    """CSV / jadval uchun bron qatorlari querysetini qaytaradi."""
    qs = (
        Booking.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .select_related("customer", "barber", "salon")
        .order_by("-created_at")
    )
    if status:
        qs = qs.filter(status=status)
    if payment_method:
        qs = qs.filter(payment_method=payment_method)
    return qs
