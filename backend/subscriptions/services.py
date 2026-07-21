"""Obuna aktivatsiya, muddat, limitlar — barcha cheklovlar serverda."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.models import User
from subscriptions.models import (
    ReferralTrialGrant,
    SubscriptionEvent,
    SubscriptionPayment,
    SubscriptionUsagePeriod,
    UserSubscription,
)
from subscriptions.plans import (
    FREE_MORPH_AI_MONTHLY,
    FREE_MORPH_STUDIO_MONTHLY,
    REFERRAL_TRIAL_DAYS,
    REFERRAL_TRIAL_PLAN,
    REFERRAL_TRIAL_REQUIRED,
    get_plan,
    serialize_plan,
)


def _client_meta(request=None) -> dict[str, str]:
    if request is None:
        return {}
    ip = ""
    xff = request.META.get("HTTP_X_FORWARDED_FOR") or ""
    if xff:
        ip = xff.split(",")[0].strip()
    else:
        ip = (request.META.get("REMOTE_ADDR") or "").strip()
    ua = (request.META.get("HTTP_USER_AGENT") or "")[:512]
    return {"ip_address": ip or None, "user_agent": ua}


def log_event(
    *,
    action: str,
    user: User | None = None,
    subscription: UserSubscription | None = None,
    actor: str = "system",
    detail: dict | None = None,
    request=None,
) -> SubscriptionEvent:
    meta = _client_meta(request)
    return SubscriptionEvent.objects.create(
        user=user,
        subscription=subscription,
        action=action,
        actor=actor,
        detail=detail or {},
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent") or "",
    )


def entitlement_snapshot(plan_code: str) -> dict[str, Any]:
    plan = get_plan(plan_code)
    if not plan:
        return {}
    return {
        "plan_code": plan["code"],
        "morph_ai_monthly": plan["morph_ai_monthly"],
        "morph_studio_monthly": plan["morph_studio_monthly"],
        "family_members_max": plan["family_members_max"],
        "morph_care": plan["morph_care"],
        "badge": plan["badge"],
        "period_days": plan["period_days"],
    }


def current_period_bounds(now=None) -> tuple[date, date]:
    now = now or timezone.localtime(timezone.now())
    start = now.date().replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end = start.replace(month=start.month + 1, day=1) - timedelta(days=1)
    return start, end


def expire_if_needed(sub: UserSubscription) -> UserSubscription:
    """Muddati o'tgan faol obunani expired qilish."""
    if sub.status != UserSubscription.Status.ACTIVE or not sub.ends_at:
        return sub
    if timezone.now() < sub.ends_at:
        return sub

    with transaction.atomic():
        locked = UserSubscription.objects.select_for_update().get(pk=sub.pk)
        if locked.status == UserSubscription.Status.ACTIVE and locked.ends_at:
            if timezone.now() >= locked.ends_at:
                locked.status = UserSubscription.Status.EXPIRED
                locked.save(update_fields=["status", "updated_at"])
                log_event(
                    action=SubscriptionEvent.Action.EXPIRED,
                    user=locked.user,
                    subscription=locked,
                    detail={"ends_at": locked.ends_at.isoformat()},
                )
        return locked


def get_active_subscription(user: User) -> UserSubscription | None:
    qs = UserSubscription.objects.filter(
        user=user, status=UserSubscription.Status.ACTIVE
    ).order_by("-ends_at", "-created_at")
    for sub in qs[:5]:
        sub = expire_if_needed(sub)
        if sub.is_currently_active:
            return sub
    return None


def get_or_create_usage(user: User) -> SubscriptionUsagePeriod:
    start, end = current_period_bounds()
    usage, _ = SubscriptionUsagePeriod.objects.get_or_create(
        user=user,
        period_start=start,
        defaults={"period_end": end},
    )
    return usage


def usage_snapshot(user: User, entitlements: dict[str, Any] | None) -> dict[str, Any]:
    usage = get_or_create_usage(user)
    ai_limit = int((entitlements or {}).get("morph_ai_monthly") or 0)
    studio_limit = int((entitlements or {}).get("morph_studio_monthly") or 0)
    return {
        "period_start": usage.period_start.isoformat(),
        "period_end": usage.period_end.isoformat(),
        "morph_ai_used": usage.morph_ai_used,
        "morph_ai_limit": ai_limit,
        "morph_ai_remaining": max(0, ai_limit - usage.morph_ai_used) if ai_limit else 0,
        "morph_studio_used": usage.morph_studio_used,
        "morph_studio_limit": studio_limit,
        "morph_studio_remaining": max(0, studio_limit - usage.morph_studio_used)
        if studio_limit
        else 0,
    }


def _no_subscription_message() -> str:
    return (
        f"Morph AI faqat obuna bilan ishlaydi. "
        f"{REFERRAL_TRIAL_REQUIRED} ta do'stingizni taklif qiling — "
        f"{REFERRAL_TRIAL_DAYS} kunlik Starter sinov, yoki obuna sotib oling."
    )


def build_me_payload(user: User) -> dict[str, Any]:
    sub = get_active_subscription(user)
    entitlements = (sub.entitlements if sub else None) or (
        entitlement_snapshot(sub.plan_code) if sub else {}
    )
    if sub:
        usage = usage_snapshot(user, entitlements)
    else:
        period = usage_snapshot(
            user,
            {
                "morph_ai_monthly": FREE_MORPH_AI_MONTHLY,
                "morph_studio_monthly": FREE_MORPH_STUDIO_MONTHLY,
            },
        )
        usage = {
            **period,
            "is_free_tier": True,
            "locked": True,
        }
    trial = ReferralTrialGrant.objects.filter(user=user).first()
    from accounts.models import ReferralAttribution
    from subscriptions.promos import get_new_user_offer

    invite_count = ReferralAttribution.objects.filter(referrer=user).count()
    now = timezone.now()
    days_remaining = None
    if sub and sub.ends_at:
        delta = sub.ends_at - now
        days_remaining = max(0, int(delta.total_seconds() // 86400))

    plan_code = sub.plan_code if sub else None
    next_upgrade = None
    if plan_code == "starter":
        next_upgrade = {"plan_code": "plus", "label_uz": "Plus ga upgrade"}
    elif plan_code == "plus":
        next_upgrade = {"plan_code": "pro", "label_uz": "Pro ga upgrade"}

    return {
        "has_active": bool(sub),
        "subscription": serialize_subscription(sub) if sub else None,
        "entitlements": entitlements if sub else {},
        "usage": usage,
        "badge": entitlements.get("badge") if sub else None,
        "morph_care": bool(entitlements.get("morph_care")) if sub else False,
        "family_members_max": entitlements.get("family_members_max") if sub else 0,
        "family_unlimited": entitlements.get("family_members_max") is None if sub else False,
        "days_remaining": days_remaining,
        "access": {
            "morph_ai_allowed": bool(sub),
            "reason": None if sub else "subscription_required",
            "message": None if sub else _no_subscription_message(),
        },
        "referral_trial": {
            "granted": bool(trial),
            "ends_at": trial.ends_at.isoformat() if trial else None,
            "required_referrals": REFERRAL_TRIAL_REQUIRED,
            "trial_days": REFERRAL_TRIAL_DAYS,
            "trial_plan": REFERRAL_TRIAL_PLAN,
            "invite_count": invite_count,
            "progress": min(invite_count, REFERRAL_TRIAL_REQUIRED),
            "eligible": invite_count >= REFERRAL_TRIAL_REQUIRED,
            "remaining_invites": max(0, REFERRAL_TRIAL_REQUIRED - invite_count),
        },
        "welcome_offer": get_new_user_offer(user),
        "upgrade": next_upgrade,
    }


def serialize_subscription(sub: UserSubscription) -> dict[str, Any]:
    plan = get_plan(sub.plan_code)
    now = timezone.now()
    days_remaining = None
    if sub.ends_at:
        delta = sub.ends_at - now
        days_remaining = max(0, int(delta.total_seconds() // 86400))
    is_trial = sub.source == UserSubscription.Source.REFERRAL_TRIAL
    return {
        "id": str(sub.pk),
        "plan_code": sub.plan_code,
        "plan": serialize_plan(plan) if plan else None,
        "status": sub.status,
        "source": sub.source,
        "is_trial": is_trial,
        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
        "days_remaining": days_remaining,
        "price_uzs": int(sub.price_uzs),
        "auto_renew": sub.auto_renew,
        "entitlements": sub.entitlements or entitlement_snapshot(sub.plan_code),
        "deactivated_at": sub.deactivated_at.isoformat() if sub.deactivated_at else None,
        "deactivated_reason": sub.deactivated_reason,
        "created_at": sub.created_at.isoformat(),
    }


@transaction.atomic
def activate_subscription(
    *,
    user: User,
    plan_code: str,
    source: str,
    price_uzs: Decimal,
    period_days: int | None = None,
    payment_provider: str = "",
    payment_order_id: str = "",
    payment_transaction_id: str = "",
    wallet_entry_id: str = "",
    actor: str = "system",
    request=None,
    notes: str = "",
) -> UserSubscription:
    plan = get_plan(plan_code)
    if not plan:
        raise ValueError("Noto'g'ri obuna rejasi.")

    days = int(period_days if period_days is not None else plan["period_days"])
    now = timezone.now()
    ends = now + timedelta(days=days)

    # Mavjud faol obunalarni to'xtatish (upgrade/replace)
    active_qs = UserSubscription.objects.select_for_update().filter(
        user=user,
        status=UserSubscription.Status.ACTIVE,
    )
    for old in active_qs:
        old.status = UserSubscription.Status.CANCELLED
        old.deactivated_at = now
        old.deactivated_reason = "Replaced by new subscription"
        old.deactivated_by = actor
        old.save(
            update_fields=[
                "status",
                "deactivated_at",
                "deactivated_reason",
                "deactivated_by",
                "updated_at",
            ]
        )

    snap = entitlement_snapshot(plan_code)
    sub = UserSubscription.objects.create(
        user=user,
        plan_code=plan_code,
        status=UserSubscription.Status.ACTIVE,
        source=source,
        starts_at=now,
        ends_at=ends,
        price_uzs=price_uzs,
        entitlements=snap,
        payment_provider=payment_provider,
        payment_order_id=payment_order_id,
        payment_transaction_id=payment_transaction_id,
        wallet_entry_id=wallet_entry_id,
        notes=notes,
    )
    log_event(
        action=SubscriptionEvent.Action.ACTIVATED,
        user=user,
        subscription=sub,
        actor=actor,
        detail={
            "plan_code": plan_code,
            "source": source,
            "ends_at": ends.isoformat(),
            "price_uzs": str(price_uzs),
        },
        request=request,
    )
    return sub


@transaction.atomic
def deactivate_subscription(
    *,
    subscription: UserSubscription,
    actor: str,
    reason: str = "",
    request=None,
) -> UserSubscription:
    locked = UserSubscription.objects.select_for_update().get(pk=subscription.pk)
    locked.status = UserSubscription.Status.DEACTIVATED
    locked.deactivated_at = timezone.now()
    locked.deactivated_reason = (reason or "")[:255]
    locked.deactivated_by = actor[:64]
    locked.save(
        update_fields=[
            "status",
            "deactivated_at",
            "deactivated_reason",
            "deactivated_by",
            "updated_at",
        ]
    )
    log_event(
        action=SubscriptionEvent.Action.DEACTIVATED,
        user=locked.user,
        subscription=locked,
        actor=actor,
        detail={"reason": reason},
        request=request,
    )
    return locked


@transaction.atomic
def reactivate_subscription(
    *,
    subscription: UserSubscription,
    actor: str,
    extend_days: int | None = None,
    request=None,
) -> UserSubscription:
    locked = UserSubscription.objects.select_for_update().get(pk=subscription.pk)
    now = timezone.now()
    if locked.ends_at and locked.ends_at > now:
        ends = locked.ends_at
    else:
        days = extend_days or int((locked.entitlements or {}).get("period_days") or 30)
        ends = now + timedelta(days=days)
    locked.status = UserSubscription.Status.ACTIVE
    locked.starts_at = locked.starts_at or now
    locked.ends_at = ends
    locked.deactivated_at = None
    locked.deactivated_reason = ""
    locked.deactivated_by = ""
    locked.save(
        update_fields=[
            "status",
            "starts_at",
            "ends_at",
            "deactivated_at",
            "deactivated_reason",
            "deactivated_by",
            "updated_at",
        ]
    )
    log_event(
        action=SubscriptionEvent.Action.REACTIVATED,
        user=locked.user,
        subscription=locked,
        actor=actor,
        detail={"ends_at": ends.isoformat()},
        request=request,
    )
    return locked


def family_member_limit_for(user: User) -> int | None:
    """None = cheksiz, 0 = ruxsat yo'q, N = max."""
    sub = get_active_subscription(user)
    if not sub:
        return 0
    ents = sub.entitlements or entitlement_snapshot(sub.plan_code)
    return ents.get("family_members_max", 0)


def can_use_morph_care(user: User) -> bool:
    sub = get_active_subscription(user)
    if not sub:
        return False
    ents = sub.entitlements or entitlement_snapshot(sub.plan_code)
    return bool(ents.get("morph_care"))


def check_morph_entitlement(*, user: User, kind: str) -> str | None:
    """
    Morph AI (analyze / try-on / studio): faol obuna majburiy.
    Yangi user — 0 kvota. Ochilishi: pullik obuna yoki 3 referal → 7 kun Starter trial.
    """
    if kind not in ("tryon", "studio", "analyze", "face_check"):
        return None

    sub = get_active_subscription(user)
    if not sub:
        return _no_subscription_message()

    # Analyze / face_check — faqat obuna borligini tekshiramiz.
    if kind in ("analyze", "face_check"):
        return None

    usage = get_or_create_usage(user)
    ents = sub.entitlements or entitlement_snapshot(sub.plan_code)

    if kind == "tryon":
        limit = int(ents.get("morph_ai_monthly") or 0)
        if limit <= 0:
            return "Bu reja Morph AI generatsiyasini qo'llab-quvvatlamaydi."
        if usage.morph_ai_used >= limit:
            log_event(
                action=SubscriptionEvent.Action.LIMIT_HIT,
                user=user,
                subscription=sub,
                detail={"kind": "morph_ai", "used": usage.morph_ai_used, "limit": limit},
            )
            return f"Oylik Morph AI limiti tugadi ({limit}/{limit})."
        return None

    # studio
    limit = int(ents.get("morph_studio_monthly") or 0)
    if limit <= 0:
        return "Morph AI Studio Plus yoki Pro obunasida mavjud."
    if usage.morph_studio_used >= limit:
        log_event(
            action=SubscriptionEvent.Action.LIMIT_HIT,
            user=user,
            subscription=sub,
            detail={"kind": "morph_studio", "used": usage.morph_studio_used, "limit": limit},
        )
        return f"Oylik Morph AI Studio limiti tugadi ({limit}/{limit})."
    return None


@transaction.atomic
def record_morph_usage(*, user: User, kind: str) -> None:
    if kind not in ("tryon", "studio"):
        return
    start, end = current_period_bounds()
    usage, _ = SubscriptionUsagePeriod.objects.select_for_update().get_or_create(
        user=user,
        period_start=start,
        defaults={"period_end": end},
    )
    if kind == "tryon":
        usage.morph_ai_used = usage.morph_ai_used + 1
        usage.save(update_fields=["morph_ai_used", "updated_at"])
    else:
        usage.morph_studio_used = usage.morph_studio_used + 1
        usage.save(update_fields=["morph_studio_used", "updated_at"])

    sub = get_active_subscription(user)
    log_event(
        action=SubscriptionEvent.Action.USAGE,
        user=user,
        subscription=sub,
        detail={"kind": kind, "morph_ai_used": usage.morph_ai_used, "morph_studio_used": usage.morph_studio_used},
    )


@transaction.atomic
def maybe_grant_referral_trial(referrer: User) -> UserSubscription | None:
    """3 ta muvaffaqiyatli referal → 7 kun Starter sinov (bir marta)."""
    if ReferralTrialGrant.objects.filter(user=referrer).exists():
        return None

    from accounts.models import ReferralAttribution

    count = ReferralAttribution.objects.filter(referrer=referrer).count()
    if count < REFERRAL_TRIAL_REQUIRED:
        return None

    # Allaqachon pullik faol Pro/Plus bo'lsa ham trial berilmasin — faqat grant yo'qligini tekshiramiz.
    # Agar faol pullik obuna bo'lsa, trialni skip qilamiz (yoki baribir grant yozamiz lekin aktivatsiya qilmaymiz).
    active = get_active_subscription(referrer)
    if active and active.source not in (
        UserSubscription.Source.REFERRAL_TRIAL,
    ):
        # Pullik obuna bor — grantni yozib qo'yamiz (qayta urinmaslik), lekin yangi sub yaratmaymiz.
        ends = timezone.now() + timedelta(days=REFERRAL_TRIAL_DAYS)
        ReferralTrialGrant.objects.create(
            user=referrer,
            subscription=None,
            referral_count_at_grant=count,
            ends_at=ends,
        )
        log_event(
            action=SubscriptionEvent.Action.REFERRAL_TRIAL,
            user=referrer,
            detail={"skipped": True, "reason": "already_paid", "count": count},
        )
        return None

    plan = get_plan(REFERRAL_TRIAL_PLAN)
    if not plan:
        return None

    sub = activate_subscription(
        user=referrer,
        plan_code=REFERRAL_TRIAL_PLAN,
        source=UserSubscription.Source.REFERRAL_TRIAL,
        price_uzs=Decimal("0"),
        period_days=REFERRAL_TRIAL_DAYS,
        actor="referral_system",
        notes=f"Referral trial after {count} invites",
    )
    ReferralTrialGrant.objects.create(
        user=referrer,
        subscription=sub,
        referral_count_at_grant=count,
        ends_at=sub.ends_at,
    )
    log_event(
        action=SubscriptionEvent.Action.REFERRAL_TRIAL,
        user=referrer,
        subscription=sub,
        detail={"count": count, "days": REFERRAL_TRIAL_DAYS, "plan": REFERRAL_TRIAL_PLAN},
    )
    return sub


def _payment_promo_fields(meta: dict | None) -> dict[str, Any]:
    m = meta or {}
    promo = m.get("promo_code") or None
    if isinstance(promo, str):
        promo = promo.strip().upper() or None
    try:
        discount_uzs = int(m.get("discount_uzs") or 0)
    except (TypeError, ValueError):
        discount_uzs = 0
    try:
        base_uzs = int(m.get("base_uzs") or 0)
    except (TypeError, ValueError):
        base_uzs = 0
    try:
        discount_pct = int(m.get("discount_pct") or 0)
    except (TypeError, ValueError):
        discount_pct = 0
    return {
        "promo_code": promo,
        "discount_uzs": discount_uzs,
        "base_uzs": base_uzs,
        "discount_pct": discount_pct,
        "has_discount": bool(promo) or discount_uzs > 0,
    }


def admin_stats(*, start=None, end=None) -> dict[str, Any]:
    now = timezone.now()
    today_start = timezone.localtime(now).replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    active = UserSubscription.objects.filter(status=UserSubscription.Status.ACTIVE)
    # muddati o'tganlarni ham hisoblash uchun filter
    active_live = active.filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))

    payments = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID)
    if start:
        payments = payments.filter(paid_at__gte=start)
        events_qs = SubscriptionEvent.objects.filter(created_at__gte=start)
        subs_created = UserSubscription.objects.filter(created_at__gte=start)
    else:
        events_qs = SubscriptionEvent.objects.all()
        subs_created = UserSubscription.objects.all()
    if end:
        payments = payments.filter(paid_at__lte=end)
        events_qs = events_qs.filter(created_at__lte=end)
        subs_created = subs_created.filter(created_at__lte=end)

    revenue = payments.aggregate(total=Sum("amount_uzs"))["total"] or Decimal("0")
    unique_buyers = payments.values("user_id").distinct().count()

    by_plan = list(
        active_live.values("plan_code")
        .annotate(count=Count("id"))
        .order_by("plan_code")
    )
    by_plan_purchases = list(
        payments.values("plan_code")
        .annotate(
            count=Count("id"),
            buyers=Count("user_id", distinct=True),
            revenue=Sum("amount_uzs"),
        )
        .order_by("-count")
    )
    by_source = list(
        UserSubscription.objects.values("source")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    by_provider = list(
        payments.values("provider")
        .annotate(count=Count("id"), revenue=Sum("amount_uzs"))
        .order_by("-count")
    )

    # Kunlik sotuvlar (vaqt oralig'i yoki oxirgi 30 kun)
    day_qs = payments
    if not start:
        day_qs = payments.filter(paid_at__gte=today_start - timedelta(days=29))
    purchases_by_day = []
    for row in (
        day_qs.annotate(day=TruncDate("paid_at"))
        .values("day")
        .annotate(
            count=Count("id"),
            buyers=Count("user_id", distinct=True),
            revenue=Sum("amount_uzs"),
        )
        .order_by("day")
    ):
        if not row["day"]:
            continue
        purchases_by_day.append(
            {
                "date": row["day"].isoformat(),
                "count": row["count"],
                "buyers": row["buyers"],
                "revenue_uzs": int(row["revenue"] or 0),
            }
        )

    # Chegirma / promokod statistikasi (metadata JSON)
    promo_map: dict[str, dict[str, Any]] = {}
    discount_total = 0
    discounted_count = 0
    discounted_buyers: set[int] = set()
    recent_purchases: list[dict[str, Any]] = []
    recent_discounted: list[dict[str, Any]] = []

    paid_rows = list(
        payments.select_related("user").order_by("-paid_at", "-created_at")[:500]
    )
    for p in paid_rows:
        promo = _payment_promo_fields(p.metadata)
        user = p.user
        row = {
            "id": str(p.pk),
            "user_id": p.user_id,
            "user_name": (user.full_name or user.phone or user.email or "") if user else "",
            "user_phone": (user.phone or "") if user else "",
            "plan_code": p.plan_code,
            "amount_uzs": int(p.amount_uzs),
            "provider": p.provider,
            "paid_at": p.paid_at.isoformat() if p.paid_at else p.created_at.isoformat(),
            "subscription_id": str(p.subscription_id) if p.subscription_id else None,
            **promo,
        }
        if len(recent_purchases) < 40:
            recent_purchases.append(row)
        if promo["has_discount"]:
            discounted_count += 1
            discount_total += promo["discount_uzs"]
            discounted_buyers.add(p.user_id)
            code = promo["promo_code"] or "UNKNOWN"
            bucket = promo_map.setdefault(
                code,
                {
                    "promo_code": code,
                    "count": 0,
                    "buyers": set(),
                    "discount_uzs": 0,
                    "revenue_uzs": 0,
                },
            )
            bucket["count"] += 1
            bucket["buyers"].add(p.user_id)
            bucket["discount_uzs"] += promo["discount_uzs"]
            bucket["revenue_uzs"] += int(p.amount_uzs)
            if len(recent_discounted) < 40:
                recent_discounted.append(row)

    # Agar range katta bo'lsa — to'liq discounted count uchun qayta skan (faqat metadata)
    if payments.count() > len(paid_rows):
        discounted_count = 0
        discount_total = 0
        discounted_buyers = set()
        promo_map = {}
        for p in payments.only("id", "user_id", "amount_uzs", "metadata").iterator(
            chunk_size=500
        ):
            promo = _payment_promo_fields(p.metadata)
            if not promo["has_discount"]:
                continue
            discounted_count += 1
            discount_total += promo["discount_uzs"]
            discounted_buyers.add(p.user_id)
            code = promo["promo_code"] or "UNKNOWN"
            bucket = promo_map.setdefault(
                code,
                {
                    "promo_code": code,
                    "count": 0,
                    "buyers": set(),
                    "discount_uzs": 0,
                    "revenue_uzs": 0,
                },
            )
            bucket["count"] += 1
            bucket["buyers"].add(p.user_id)
            bucket["discount_uzs"] += promo["discount_uzs"]
            bucket["revenue_uzs"] += int(p.amount_uzs)

    by_promo = [
        {
            "promo_code": v["promo_code"],
            "count": v["count"],
            "buyers": len(v["buyers"]),
            "discount_uzs": v["discount_uzs"],
            "revenue_uzs": v["revenue_uzs"],
        }
        for v in sorted(promo_map.values(), key=lambda x: -x["count"])
    ]

    all_paid = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID)
    trials = ReferralTrialGrant.objects.count()
    usage_agg = SubscriptionUsagePeriod.objects.aggregate(
        ai=Sum("morph_ai_used"),
        studio=Sum("morph_studio_used"),
    )

    return {
        "active_count": active_live.count(),
        "expired_count": UserSubscription.objects.filter(
            status=UserSubscription.Status.EXPIRED
        ).count(),
        "deactivated_count": UserSubscription.objects.filter(
            status=UserSubscription.Status.DEACTIVATED
        ).count(),
        "pending_payments": SubscriptionPayment.objects.filter(
            status=SubscriptionPayment.Status.PENDING
        ).count(),
        "revenue_uzs": int(revenue),
        "paid_count": payments.count(),
        "unique_buyers": unique_buyers,
        "new_subscriptions": subs_created.count(),
        "purchases_today": all_paid.filter(paid_at__gte=today_start).count(),
        "purchases_this_week": all_paid.filter(paid_at__gte=week_start).count(),
        "purchases_this_month": all_paid.filter(paid_at__gte=month_start).count(),
        "buyers_today": all_paid.filter(paid_at__gte=today_start)
        .values("user_id")
        .distinct()
        .count(),
        "buyers_this_week": all_paid.filter(paid_at__gte=week_start)
        .values("user_id")
        .distinct()
        .count(),
        "buyers_this_month": all_paid.filter(paid_at__gte=month_start)
        .values("user_id")
        .distinct()
        .count(),
        "discounted_count": discounted_count,
        "discounted_buyers": len(discounted_buyers),
        "discount_total_uzs": discount_total,
        "by_plan": by_plan,
        "by_plan_purchases": [
            {
                "plan_code": r["plan_code"],
                "count": r["count"],
                "buyers": r["buyers"],
                "revenue_uzs": int(r["revenue"] or 0),
            }
            for r in by_plan_purchases
        ],
        "by_source": by_source,
        "by_provider": [
            {
                "provider": r["provider"],
                "count": r["count"],
                "revenue_uzs": int(r["revenue"] or 0),
            }
            for r in by_provider
        ],
        "by_promo": by_promo,
        "purchases_by_day": purchases_by_day,
        "recent_purchases": recent_purchases,
        "recent_discounted": recent_discounted,
        "referral_trials_granted": trials,
        "usage_totals": {
            "morph_ai": usage_agg["ai"] or 0,
            "morph_studio": usage_agg["studio"] or 0,
        },
        "recent_events": list(
            events_qs.select_related("user", "subscription").order_by("-created_at")[:30]
        ),
    }
