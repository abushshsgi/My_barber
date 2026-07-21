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


def _today_bounds() -> tuple[datetime, datetime]:
    tz = timezone.get_current_timezone()
    today_start = timezone.make_aware(
        datetime.combine(timezone.localdate(), datetime.min.time()), tz
    )
    return today_start, timezone.now()


def build_wallet_analytics(start_dt: datetime, end_dt: datetime, recent_limit: int = 100) -> dict:
    """Hamyon oqimi — to'ldirish, sarf, sovg'a (LedgerEntry asosida)."""
    entries = LedgerEntry.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)

    topups = entries.filter(entry_type=LedgerEntry.EntryType.TOPUP)
    booking_pays = entries.filter(entry_type=LedgerEntry.EntryType.BOOKING_PAY)
    gifts_out = entries.filter(entry_type=LedgerEntry.EntryType.GIFT_OUT)
    refunds = entries.filter(entry_type=LedgerEntry.EntryType.REFUND)
    subscriptions = entries.filter(entry_type=LedgerEntry.EntryType.SUBSCRIPTION)

    topup_total = topups.aggregate(s=_decimal_sum("amount"))["s"]
    # sarf summalari manfiy — absolyut qiymat uchun -Sum.
    spend_total = booking_pays.aggregate(s=_decimal_sum("amount"))["s"]
    gift_total = gifts_out.aggregate(s=_decimal_sum("amount"))["s"]
    refund_total = refunds.aggregate(s=_decimal_sum("amount"))["s"]
    subscription_total = subscriptions.aggregate(s=_decimal_sum("amount"))["s"]

    topup_users = topups.values("wallet__user_id").distinct().count()
    spend_users = booking_pays.values("wallet__user_id").distinct().count()

    topup_abs = abs(_float(topup_total))
    spend_abs = abs(_float(spend_total))
    gift_abs = abs(_float(gift_total))
    refund_abs = abs(_float(refund_total))
    subscription_abs = abs(_float(subscription_total))
    flow_total = topup_abs + spend_abs + gift_abs + refund_abs + subscription_abs

    # Bugungi oqim (live delta)
    today_flow = None
    today_topup = None
    if start_dt.date() <= timezone.localdate() <= end_dt.date():
        today_start, today_end = _today_bounds()
        today_entries = LedgerEntry.objects.filter(
            created_at__gte=today_start, created_at__lte=today_end
        )
        today_topup = _float(
            today_entries.filter(entry_type=LedgerEntry.EntryType.TOPUP).aggregate(
                s=_decimal_sum("amount")
            )["s"]
        )
        today_spend = abs(
            _float(
                today_entries.filter(entry_type=LedgerEntry.EntryType.BOOKING_PAY).aggregate(
                    s=_decimal_sum("amount")
                )["s"]
            )
        )
        today_gift = abs(
            _float(
                today_entries.filter(entry_type=LedgerEntry.EntryType.GIFT_OUT).aggregate(
                    s=_decimal_sum("amount")
                )["s"]
            )
        )
        today_flow = today_topup + today_spend + today_gift

    # To'ldirish manbasi bo'yicha (metadata.source).
    source_rows: dict[str, dict] = {}
    for entry in topups.only("amount", "metadata"):
        source = (entry.metadata or {}).get("source", "unknown")
        row = source_rows.setdefault(source, {"source": source, "amount": 0.0, "count": 0})
        row["amount"] += _float(entry.amount)
        row["count"] += 1
    topup_sources = sorted(source_rows.values(), key=lambda r: r["amount"], reverse=True)

    spend_types = [
        {
            "type": "booking_pay",
            "label": "Bron to'lovi",
            "amount": spend_abs,
            "count": booking_pays.count(),
        },
        {
            "type": "gift_out",
            "label": "Sovg'a",
            "amount": gift_abs,
            "count": gifts_out.count(),
        },
        {
            "type": "subscription",
            "label": "Obuna",
            "amount": subscription_abs,
            "count": subscriptions.count(),
        },
        {
            "type": "refund",
            "label": "Qaytarish",
            "amount": refund_abs,
            "count": refunds.count(),
        },
    ]

    # Eng faol foydalanuvchilar — kim qancha pul harakatlantirgan.
    actor_map: dict[int, dict] = {}
    for entry in entries.select_related("wallet__user"):
        user = entry.wallet.user if entry.wallet_id else None
        if not user:
            continue
        row = actor_map.setdefault(
            user.pk,
            {
                "user_id": user.pk,
                "user_name": (user.full_name or user.phone or str(user.pk)).strip(),
                "phone": user.phone or None,
                "wallet_number": entry.wallet.wallet_number if entry.wallet_id else "",
                "volume": 0.0,
                "count": 0,
                "last_type": entry.entry_type,
            },
        )
        row["volume"] += abs(_float(entry.amount))
        row["count"] += 1
        row["last_type"] = entry.entry_type
    top_actors = sorted(actor_map.values(), key=lambda r: r["volume"], reverse=True)[:12]

    recent = []
    for entry in (
        entries.select_related("wallet__user").order_by("-created_at")[:recent_limit]
    ):
        user = entry.wallet.user if entry.wallet_id else None
        meta = entry.metadata or {}
        recent.append(
            {
                "id": str(entry.id),
                "user_id": user.pk if user else None,
                "user_name": (
                    (user.full_name if user else "")
                    or (user.phone if user else "")
                    or "—"
                ),
                "user_phone": (user.phone if user else None) or None,
                "wallet_number": entry.wallet.wallet_number if entry.wallet_id else "",
                "entry_type": entry.entry_type,
                "amount": _float(entry.amount),
                "balance_after": _float(entry.balance_after),
                "source": meta.get("source", ""),
                "reference_type": entry.reference_type or "",
                "reference_id": entry.reference_id or "",
                "merchant_tx_id": entry.reference_id or str(entry.id),
                "idempotency_key": entry.idempotency_key or "",
                "entry_hash": (entry.entry_hash or "")[:16],
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            }
        )

    return {
        "summary": {
            "flow_total": flow_total,
            "today_flow": today_flow,
            "today_topup": today_topup,
            "topup_total": topup_abs,
            "topup_users": topup_users,
            "spend_total": spend_abs,
            "spend_users": spend_users,
            "gift_total": gift_abs,
            "gift_count": GiftTransfer.objects.filter(
                created_at__gte=start_dt, created_at__lte=end_dt
            ).count(),
            "refund_total": refund_abs,
            "subscription_total": subscription_abs,
            "entry_count": entries.count(),
        },
        "topup_sources": topup_sources,
        "spend_types": spend_types,
        "top_actors": top_actors,
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


def build_platform_income(start_dt: datetime, end_dt: datetime) -> dict:
    """
    Faqat platforma sof daromadi (aylanma/GMV emas).

    Manbalar:
    - Sovg'a karta dizayn to'lovlari
    - B2C obuna to'lovlari
    - B2B TOP reklama to'lovlari
    - Boshqa (platforma wallet adjustment)
    """
    from barbers.models import BarberPromotion
    from subscriptions.models import SubscriptionPayment
    from wallet.gift_designs import get_gift_design
    from wallet.services.wallet_service import WalletService

    gifts = (
        GiftTransfer.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
        .select_related("sender_wallet__user")
        .order_by("-created_at")
    )
    gift_agg = gifts.aggregate(
        fee_total=_decimal_sum("design_fee"),
        count=Count("id"),
    )
    design_rows: dict[str, dict] = {}
    for row in gifts.values("design_id").annotate(
        count=Count("id"),
        fee_total=_decimal_sum("design_fee"),
    ):
        design_id = (row["design_id"] or "").strip() or "unknown"
        design = get_gift_design(design_id)
        design_rows[design_id] = {
            "design_id": design_id,
            "design_name": design.name_uz if design else design_id,
            "count": row["count"],
            "fee_total": _float(row["fee_total"]),
        }

    subs = (
        SubscriptionPayment.objects.filter(
            status=SubscriptionPayment.Status.PAID,
            paid_at__gte=start_dt,
            paid_at__lte=end_dt,
        )
        .select_related("user")
        .order_by("-paid_at")
    )
    sub_agg = subs.aggregate(total=_decimal_sum("amount_uzs"), count=Count("id"))
    by_provider = [
        {
            "provider": r["provider"] or "unknown",
            "count": r["count"],
            "revenue_uzs": _float(r["rev"]),
        }
        for r in (
            subs.values("provider")
            .annotate(count=Count("id"), rev=_decimal_sum("amount_uzs"))
            .order_by("-rev")
        )
    ]

    promos = (
        BarberPromotion.objects.filter(
            created_at__gte=start_dt,
            created_at__lte=end_dt,
        )
        .exclude(amount_paid=0)
        .select_related("barber")
        .order_by("-created_at")
    )
    promo_agg = promos.aggregate(total=_decimal_sum("amount_paid"), count=Count("id"))

    other_total = 0.0
    other_count = 0
    other_events: list[dict] = []
    try:
        platform_wallet = WalletService.ensure_platform_wallet()
        other_qs = LedgerEntry.objects.filter(
            wallet=platform_wallet,
            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
            created_at__gte=start_dt,
            created_at__lte=end_dt,
            amount__gt=0,
        ).order_by("-created_at")
        other_agg = other_qs.aggregate(total=_decimal_sum("amount"), count=Count("id"))
        other_total = _float(other_agg["total"])
        other_count = int(other_agg["count"] or 0)
        for entry in other_qs[:10]:
            other_events.append(
                {
                    "id": f"adj-{entry.id}",
                    "kind": "other",
                    "label": "Boshqa (adjustment)",
                    "payer_name": "Platforma",
                    "payer_type": "system",
                    "amount": _float(entry.amount),
                    "created_at": entry.created_at.isoformat() if entry.created_at else None,
                }
            )
    except Exception:
        pass

    gift_fee_total = _float(gift_agg["fee_total"])
    subscription_total = _float(sub_agg["total"])
    b2b_promotions = _float(promo_agg["total"])
    platform_net = gift_fee_total + subscription_total + b2b_promotions + other_total

    # Bugungi sof daromad (live delta)
    today_start = timezone.make_aware(
        datetime.combine(timezone.localdate(), datetime.min.time()),
        timezone.get_current_timezone(),
    )
    today_end = timezone.now()
    today_payload = None
    if start_dt.date() <= timezone.localdate() <= end_dt.date():
        today_gifts = GiftTransfer.objects.filter(
            created_at__gte=today_start, created_at__lte=today_end
        ).aggregate(fee_total=_decimal_sum("design_fee"))
        today_subs = SubscriptionPayment.objects.filter(
            status=SubscriptionPayment.Status.PAID,
            paid_at__gte=today_start,
            paid_at__lte=today_end,
        ).aggregate(total=_decimal_sum("amount_uzs"))
        today_promos = BarberPromotion.objects.filter(
            created_at__gte=today_start, created_at__lte=today_end
        ).exclude(amount_paid=0).aggregate(total=_decimal_sum("amount_paid"))
        today_payload = (
            _float(today_gifts["fee_total"])
            + _float(today_subs["total"])
            + _float(today_promos["total"])
        )

    recent: list[dict] = []
    for gift in gifts[:25]:
        if _float(gift.design_fee) <= 0:
            continue
        sender = gift.sender_wallet.user if gift.sender_wallet_id else None
        design = get_gift_design(gift.design_id)
        recent.append(
            {
                "id": f"gift-{gift.id}",
                "kind": "gift_design",
                "label": f"Sovg'a dizayn — {design.name_uz if design else gift.design_id}",
                "payer_name": (
                    (sender.full_name or sender.phone or str(sender.pk)).strip()
                    if sender
                    else "—"
                ),
                "payer_type": "user",
                "payer_id": sender.pk if sender else None,
                "amount": _float(gift.design_fee),
                "created_at": gift.created_at.isoformat() if gift.created_at else None,
            }
        )
    for pay in subs[:25]:
        user = pay.user
        recent.append(
            {
                "id": f"sub-{pay.id}",
                "kind": "subscription",
                "label": f"Obuna — {pay.plan_code}",
                "payer_name": (
                    (user.full_name or user.phone or str(user.pk)).strip() if user else "—"
                ),
                "payer_type": "user",
                "payer_id": user.pk if user else None,
                "amount": _float(pay.amount_uzs),
                "created_at": (pay.paid_at or pay.created_at).isoformat()
                if (pay.paid_at or pay.created_at)
                else None,
            }
        )
    for promo in promos[:25]:
        barber = promo.barber
        recent.append(
            {
                "id": f"promo-{promo.id}",
                "kind": "promotion",
                "label": "TOP reklama",
                "payer_name": (
                    (barber.full_name or barber.phone or str(barber.pk)).strip()
                    if barber
                    else "—"
                ),
                "payer_type": "barber",
                "payer_id": barber.pk if barber else None,
                "amount": _float(promo.amount_paid),
                "created_at": promo.created_at.isoformat() if promo.created_at else None,
            }
        )
    recent.extend(other_events)
    recent.sort(key=lambda r: r.get("created_at") or "", reverse=True)
    recent = recent[:40]

    return {
        "range": {
            "start": start_dt.date().isoformat(),
            "end": end_dt.date().isoformat(),
        },
        "summary": {
            "platform_net": platform_net,
            "today_net": today_payload,
            "gift_design_fees": gift_fee_total,
            "subscriptions": subscription_total,
            "b2b_promotions": b2b_promotions,
            "other": other_total,
        },
        "sources": [
            {
                "key": "gift_design",
                "label": "Sovg'a dizayn",
                "amount": gift_fee_total,
                "count": int(gift_agg["count"] or 0),
            },
            {
                "key": "subscriptions",
                "label": "B2C obunalar",
                "amount": subscription_total,
                "count": int(sub_agg["count"] or 0),
            },
            {
                "key": "promotions",
                "label": "B2B TOP reklama",
                "amount": b2b_promotions,
                "count": int(promo_agg["count"] or 0),
            },
            {
                "key": "other",
                "label": "Boshqa",
                "amount": other_total,
                "count": other_count,
            },
        ],
        "gifts": {
            "design_fee_total": gift_fee_total,
            "count": int(gift_agg["count"] or 0),
            "by_design": sorted(design_rows.values(), key=lambda r: r["fee_total"], reverse=True),
        },
        "subscriptions": {
            "revenue_uzs": subscription_total,
            "count": int(sub_agg["count"] or 0),
            "by_provider": by_provider,
        },
        "promotions": {
            "revenue_uzs": b2b_promotions,
            "count": int(promo_agg["count"] or 0),
        },
        "other": {
            "revenue_uzs": other_total,
            "count": other_count,
        },
        "recent": recent,
    }


def build_platform_turnover(start_dt: datetime, end_dt: datetime) -> dict:
    """
    Platforma aylanmasi — bronlar / mijoz oqimi (sof daromad emas).

    - B2B: sartarosh bron to'lovlari (naqd + onlayn)
    - B2C: mijoz hamyon to'ldirish, sovg'a o'tkazmalari
    """
    completed_range = filter_bookings_by_earnings_period(completed_bookings_qs(), start_dt, end_dt)
    breakdown = payment_breakdown(completed_range)

    entries = LedgerEntry.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    topups = entries.filter(entry_type=LedgerEntry.EntryType.TOPUP)
    booking_pays = entries.filter(entry_type=LedgerEntry.EntryType.BOOKING_PAY)

    topup_total = _float(topups.aggregate(s=_decimal_sum("amount"))["s"])
    wallet_booking_spend = abs(_float(booking_pays.aggregate(s=_decimal_sum("amount"))["s"]))

    gifts = GiftTransfer.objects.filter(created_at__gte=start_dt, created_at__lte=end_dt)
    gift_count = gifts.count()
    gift_amount = _float(gifts.aggregate(s=_decimal_sum("amount"))["s"])

    cash_gmv = _float(breakdown["cash_total"])
    online_gmv = _float(breakdown["online_total"])
    booking_gmv = cash_gmv + online_gmv

    # Jami aylanma: bron GMV + P2P sovg'a summasi + hamyon to'ldirish
    # (onlayn bron allaqachon GMV da — wallet spend alohida ko'rsatiladi, qo'shilmaydi)
    total_turnover = booking_gmv + gift_amount + topup_total

    today_start = timezone.make_aware(
        datetime.combine(timezone.localdate(), datetime.min.time()),
        timezone.get_current_timezone(),
    )
    today_end = timezone.now()
    today_completed = filter_bookings_by_earnings_period(
        completed_bookings_qs(), today_start, today_end
    )
    today_bd = payment_breakdown(today_completed)
    today_gifts = _float(
        GiftTransfer.objects.filter(
            created_at__gte=today_start, created_at__lte=today_end
        ).aggregate(s=_decimal_sum("amount"))["s"]
    )
    today_topups = _float(
        LedgerEntry.objects.filter(
            entry_type=LedgerEntry.EntryType.TOPUP,
            created_at__gte=today_start,
            created_at__lte=today_end,
        ).aggregate(s=_decimal_sum("amount"))["s"]
    )
    today_turnover = (
        _float(today_bd["total_income"]) + today_gifts + today_topups
    )

    topup_sources: dict[str, dict] = {}
    for entry in topups.only("amount", "metadata"):
        source = (entry.metadata or {}).get("source", "unknown")
        row = topup_sources.setdefault(source, {"source": source, "amount": 0.0, "count": 0})
        row["amount"] += _float(entry.amount)
        row["count"] += 1

    return {
        "range": {
            "start": start_dt.date().isoformat(),
            "end": end_dt.date().isoformat(),
        },
        "summary": {
            "total_turnover": total_turnover,
            "today_turnover": today_turnover,
            "booking_gmv": booking_gmv,
            "cash_gmv": cash_gmv,
            "online_gmv": online_gmv,
            "topup_total": topup_total,
            "gift_amount_total": gift_amount,
            "wallet_booking_spend": wallet_booking_spend,
        },
        "b2b": {
            "label": "Sartaroshlar (bronlar)",
            "cash_total": cash_gmv,
            "cash_count": breakdown["cash_count"],
            "online_total": online_gmv,
            "online_count": breakdown["online_count"],
            "total": booking_gmv,
            "completed_count": breakdown["cash_count"] + breakdown["online_count"],
        },
        "b2c": {
            "label": "Mijozlar",
            "topup_total": topup_total,
            "topup_count": topups.count(),
            "gift_amount_total": gift_amount,
            "gift_count": gift_count,
            "wallet_booking_spend": wallet_booking_spend,
            "wallet_booking_count": booking_pays.count(),
            "topup_sources": sorted(
                topup_sources.values(), key=lambda r: r["amount"], reverse=True
            ),
        },
        "streams": [
            {
                "key": "b2b_cash",
                "label": "B2B naqd bronlar",
                "amount": cash_gmv,
                "count": breakdown["cash_count"],
            },
            {
                "key": "b2b_online",
                "label": "B2B onlayn bronlar",
                "amount": online_gmv,
                "count": breakdown["online_count"],
            },
            {
                "key": "b2c_topup",
                "label": "Mijoz to'ldirish",
                "amount": topup_total,
                "count": topups.count(),
            },
            {
                "key": "b2c_gift",
                "label": "Sovg'a o'tkazmalari",
                "amount": gift_amount,
                "count": gift_count,
            },
        ],
    }


def _user_brief(user) -> dict:
    if not user:
        return {"id": None, "name": "—", "phone": None}
    return {
        "id": user.pk,
        "name": (user.full_name or user.phone or str(user.pk)).strip(),
        "phone": user.phone or None,
    }


def _ledger_brief(entry: LedgerEntry | None) -> dict | None:
    if entry is None:
        return None
    return {
        "id": str(entry.id),
        "entry_type": entry.entry_type,
        "amount": _float(entry.amount),
        "balance_after": _float(entry.balance_after),
        "idempotency_key": entry.idempotency_key or "",
        "entry_hash": entry.entry_hash or "",
        "prev_hash": entry.prev_hash or "",
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


def build_gift_security_steps(gift: GiftTransfer) -> list[dict]:
    """Har bir sovg'a 5 bosqichli xavfsizlik zanjiri orqali o'tadi (ledger muhri bilan)."""
    fee = gift.design_fee_entry
    sender_e = gift.sender_entry
    recipient_e = gift.recipient_entry
    completed = gift.status == GiftTransfer.Status.COMPLETED

    def _status(ok: bool) -> str:
        if ok:
            return "passed"
        return "failed" if gift.status == GiftTransfer.Status.FAILED else "pending"

    return [
        {
            "key": "validate",
            "step": 1,
            "label": "Tekshiruv",
            "detail": "Dizayn, qabul qiluvchi, balans va idempotency tekshirildi",
            "status": _status(True),
            "merchant_tx_id": gift.idempotency_key or str(gift.id),
        },
        {
            "key": "design_fee",
            "step": 2,
            "label": "Dizayn to'lovi",
            "detail": f"Platformaga dizayn narxi — {_float(gift.design_fee):,.0f} so'm".replace(",", " "),
            "status": _status(bool(fee) or _float(gift.design_fee) == 0),
            "merchant_tx_id": str(fee.id) if fee else None,
            "entry_hash": (fee.entry_hash[:16] if fee and fee.entry_hash else None),
        },
        {
            "key": "debit_sender",
            "step": 3,
            "label": "Yuboruvchidan yechish",
            "detail": f"Sovg'a summasi yechildi — {_float(gift.amount):,.0f} so'm".replace(",", " "),
            "status": _status(bool(sender_e)),
            "merchant_tx_id": str(sender_e.id) if sender_e else None,
            "entry_hash": (sender_e.entry_hash[:16] if sender_e and sender_e.entry_hash else None),
        },
        {
            "key": "credit_recipient",
            "step": 4,
            "label": "Qabul qiluvchiga kirim",
            "detail": "Pul qabul qiluvchi hamyoniga tushdi",
            "status": _status(bool(recipient_e)),
            "merchant_tx_id": str(recipient_e.id) if recipient_e else None,
            "entry_hash": (
                recipient_e.entry_hash[:16] if recipient_e and recipient_e.entry_hash else None
            ),
        },
        {
            "key": "ledger_seal",
            "step": 5,
            "label": "Ledger muhri",
            "detail": "Hash zanjiri yozildi — yozuv o'zgartirilmaydi",
            "status": _status(completed and bool(sender_e) and bool(recipient_e)),
            "merchant_tx_id": str(gift.id),
            "entry_hash": (sender_e.entry_hash[:16] if sender_e and sender_e.entry_hash else None),
        },
    ]


def build_recipient_spend_trail(gift: GiftTransfer, limit: int = 20) -> dict:
    """Sovg'a pulidan keyin qabul qiluvchi nimaga sarflagani (hamyon bronlari)."""
    wallet = gift.recipient_wallet
    if wallet is None:
        return {"spent_total": 0.0, "remaining_estimate": _float(gift.amount), "items": []}

    spends = (
        LedgerEntry.objects.filter(
            wallet=wallet,
            entry_type=LedgerEntry.EntryType.BOOKING_PAY,
            created_at__gte=gift.created_at,
        )
        .order_by("created_at")[:limit]
    )

    booking_ids: list[int] = []
    for e in spends:
        rid = (e.reference_id or "").strip()
        if rid.isdigit():
            booking_ids.append(int(rid))

    bookings = {
        b.pk: b
        for b in Booking.objects.filter(pk__in=booking_ids)
        .select_related("salon", "barber")
        .prefetch_related("lines")
    }

    items: list[dict] = []
    spent_total = 0.0
    for entry in spends:
        amount = abs(_float(entry.amount))
        spent_total += amount
        rid = (entry.reference_id or "").strip()
        booking = bookings.get(int(rid)) if rid.isdigit() else None
        services: list[str] = []
        salon_name = None
        barber_name = None
        booking_id = None
        if booking:
            booking_id = booking.pk
            salon_name = booking.salon.name if booking.salon_id else None
            barber_name = (
                (booking.barber.full_name or booking.barber.phone or str(booking.barber_id))
                if booking.barber_id
                else None
            )
            services = [ln.service_name for ln in booking.lines.all() if ln.service_name]

        items.append(
            {
                "ledger_id": str(entry.id),
                "merchant_tx_id": entry.reference_id or str(entry.id),
                "amount": amount,
                "booking_id": booking_id,
                "salon_name": salon_name,
                "barber_name": barber_name,
                "services": services,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            }
        )

    gift_amount = _float(gift.amount)
    remaining = max(0.0, gift_amount - spent_total)
    return {
        "gift_amount": gift_amount,
        "spent_total": min(spent_total, gift_amount) if gift_amount else spent_total,
        "remaining_estimate": remaining,
        "items": items,
    }


def serialize_gift_transfer(gift: GiftTransfer, *, detail: bool = False) -> dict:
    from wallet.gift_designs import get_gift_design

    sender = gift.sender_wallet.user if gift.sender_wallet_id else None
    recipient = gift.recipient_wallet.user if gift.recipient_wallet_id else None
    design = get_gift_design(gift.design_id)

    payload = {
        "id": str(gift.id),
        "merchant_tx_id": str(gift.id),
        "idempotency_key": gift.idempotency_key or "",
        "sender": {
            **_user_brief(sender),
            "wallet_number": gift.sender_wallet.wallet_number if gift.sender_wallet_id else "",
        },
        "recipient": {
            **_user_brief(recipient),
            "wallet_number": (
                gift.recipient_wallet.wallet_number if gift.recipient_wallet_id else ""
            ),
        },
        "amount": _float(gift.amount),
        "design_id": gift.design_id or "",
        "design_name": design.name_uz if design else (gift.design_id or "—"),
        "design_fee": _float(gift.design_fee),
        "total_charged": _float(gift.total_charged),
        "message": gift.message or "",
        "status": gift.status,
        "created_at": gift.created_at.isoformat() if gift.created_at else None,
        "security_steps": build_gift_security_steps(gift),
        "ledger": {
            "design_fee": _ledger_brief(gift.design_fee_entry),
            "sender": _ledger_brief(gift.sender_entry),
            "recipient": _ledger_brief(gift.recipient_entry),
        },
    }

    if detail:
        payload["spend_trail"] = build_recipient_spend_trail(gift)
        # Yuboruvchi tomonida hamyon harakati qisqacha
        payload["sender_charge"] = {
            "gift_amount": _float(gift.amount),
            "design_fee": _float(gift.design_fee),
            "total_charged": _float(gift.total_charged),
        }

    return payload


def build_gifts_summary(start_dt: datetime | None = None, end_dt: datetime | None = None) -> dict:
    qs = GiftTransfer.objects.all()
    if start_dt is not None:
        qs = qs.filter(created_at__gte=start_dt)
    if end_dt is not None:
        qs = qs.filter(created_at__lte=end_dt)
    agg = qs.aggregate(
        amount_total=_decimal_sum("amount"),
        fee_total=_decimal_sum("design_fee"),
        charged_total=_decimal_sum("total_charged"),
        count=Count("id"),
    )

    today_count = 0
    today_amount = 0.0
    if start_dt is None or (
        start_dt.date() <= timezone.localdate()
        and (end_dt is None or end_dt.date() >= timezone.localdate())
    ):
        today_start, today_end = _today_bounds()
        today_qs = GiftTransfer.objects.filter(
            created_at__gte=today_start, created_at__lte=today_end
        )
        today_agg = today_qs.aggregate(
            amount_total=_decimal_sum("amount"),
            count=Count("id"),
        )
        today_count = int(today_agg["count"] or 0)
        today_amount = _float(today_agg["amount_total"])

    return {
        "count": int(agg["count"] or 0),
        "amount_total": _float(agg["amount_total"]),
        "design_fee_total": _float(agg["fee_total"]),
        "charged_total": _float(agg["charged_total"]),
        "today_count": today_count,
        "today_amount": today_amount,
    }


def build_gift_designs_analytics(
    start_dt: datetime | None = None, end_dt: datetime | None = None
) -> dict:
    """Sovg'a karta dizaynlari — narx, kolleksiya, sotuv va sarf statistikasi."""
    from wallet.gift_designs import list_gift_designs

    qs = GiftTransfer.objects.all()
    if start_dt is not None:
        qs = qs.filter(created_at__gte=start_dt)
    if end_dt is not None:
        qs = qs.filter(created_at__lte=end_dt)

    by_design: dict[str, dict] = {}
    for row in qs.values("design_id").annotate(
        sales_count=Count("id"),
        gift_amount_total=_decimal_sum("amount"),
        fee_total=_decimal_sum("design_fee"),
        charged_total=_decimal_sum("total_charged"),
        unique_senders=Count("sender_wallet_id", distinct=True),
        unique_recipients=Count("recipient_wallet_id", distinct=True),
    ):
        by_design[row["design_id"] or ""] = row

    # Sovg'adan keyin bron to'lovlari — qayerga ketgani
    spend_by_salon: dict[str, dict] = {}
    spend_by_service: dict[str, dict] = {}
    gifts = qs.select_related("recipient_wallet").only(
        "id", "amount", "created_at", "recipient_wallet_id"
    )[:500]
    for gift in gifts:
        trail = build_recipient_spend_trail(gift, limit=10)
        for item in trail["items"]:
            salon = item.get("salon_name") or "Noma'lum salon"
            srow = spend_by_salon.setdefault(
                salon, {"salon_name": salon, "amount": 0.0, "count": 0}
            )
            srow["amount"] += float(item["amount"])
            srow["count"] += 1
            for svc in item.get("services") or ["Noma'lum xizmat"]:
                vrow = spend_by_service.setdefault(
                    svc, {"service_name": svc, "amount": 0.0, "count": 0}
                )
                vrow["amount"] += float(item["amount"])
                vrow["count"] += 1

    designs = []
    for design in list_gift_designs():
        stats = by_design.get(design.id, {})
        designs.append(
            {
                "id": design.id,
                "name": design.name,
                "name_uz": design.name_uz,
                "fee": _float(design.fee),
                "preview": design.preview,
                "collection": (
                    "Premium"
                    if _float(design.fee) >= 250_000
                    else ("Standart" if _float(design.fee) >= 50_000 else "Asosiy")
                ),
                "sales_count": int(stats.get("sales_count") or 0),
                "gift_amount_total": _float(stats.get("gift_amount_total")),
                "fee_total": _float(stats.get("fee_total")),
                "charged_total": _float(stats.get("charged_total")),
                "unique_senders": int(stats.get("unique_senders") or 0),
                "unique_recipients": int(stats.get("unique_recipients") or 0),
            }
        )

    designs.sort(key=lambda d: d["sales_count"], reverse=True)
    top_design = designs[0] if designs and designs[0]["sales_count"] else None

    summary = build_gifts_summary(start_dt, end_dt)
    return {
        "summary": {
            **summary,
            "designs_count": len(designs),
            "top_design_id": top_design["id"] if top_design else None,
            "top_design_name": top_design["name_uz"] if top_design else None,
        },
        "designs": designs,
        "spend_by_salon": sorted(
            spend_by_salon.values(), key=lambda r: r["amount"], reverse=True
        )[:15],
        "spend_by_service": sorted(
            spend_by_service.values(), key=lambda r: r["amount"], reverse=True
        )[:15],
    }
