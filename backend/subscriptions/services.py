"""Obuna aktivatsiya, muddat, limitlar — barcha cheklovlar serverda."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import Count, Q, Sum
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
        }
    trial = ReferralTrialGrant.objects.filter(user=user).first()
    return {
        "has_active": bool(sub),
        "subscription": serialize_subscription(sub) if sub else None,
        "entitlements": entitlements,
        "usage": usage,
        "badge": entitlements.get("badge") if sub else None,
        "morph_care": bool(entitlements.get("morph_care")) if sub else False,
        "family_members_max": entitlements.get("family_members_max") if sub else 0,
        "family_unlimited": entitlements.get("family_members_max") is None if sub else False,
        "referral_trial": {
            "granted": bool(trial),
            "ends_at": trial.ends_at.isoformat() if trial else None,
            "required_referrals": REFERRAL_TRIAL_REQUIRED,
            "trial_days": REFERRAL_TRIAL_DAYS,
            "trial_plan": REFERRAL_TRIAL_PLAN,
        },
    }


def serialize_subscription(sub: UserSubscription) -> dict[str, Any]:
    plan = get_plan(sub.plan_code)
    return {
        "id": str(sub.pk),
        "plan_code": sub.plan_code,
        "plan": serialize_plan(plan) if plan else None,
        "status": sub.status,
        "source": sub.source,
        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
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
    Try-on / studio: obuna limitlari yoki obunasiz freemium kvota.
    Analyze/face_check — obunasiz global MorphAiSettings limitlari ishlaydi.
    """
    if kind not in ("tryon", "studio"):
        return None

    usage = get_or_create_usage(user)
    sub = get_active_subscription(user)

    if not sub:
        if kind == "tryon":
            if usage.morph_ai_used >= FREE_MORPH_AI_MONTHLY:
                return (
                    f"Bepul Morph AI limiti tugadi ({FREE_MORPH_AI_MONTHLY}/{FREE_MORPH_AI_MONTHLY}). "
                    "Davom etish uchun obuna bo'ling."
                )
            return None
        if usage.morph_studio_used >= FREE_MORPH_STUDIO_MONTHLY:
            return (
                f"Bepul Morph AI Studio limiti tugadi ({FREE_MORPH_STUDIO_MONTHLY}/{FREE_MORPH_STUDIO_MONTHLY}). "
                "Plus yoki Pro obunasiga o'ting."
            )
        return None

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
    """3 ta muvaffaqiyatli referal → 7 kun Plus sinov (bir marta)."""
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


def admin_stats(*, start=None, end=None) -> dict[str, Any]:
    now = timezone.now()
    active = UserSubscription.objects.filter(status=UserSubscription.Status.ACTIVE)
    # muddati o'tganlarni ham hisoblash uchun filter
    active_live = active.filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))

    payments = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID)
    if start:
        payments = payments.filter(paid_at__gte=start)
        events_qs = SubscriptionEvent.objects.filter(created_at__gte=start)
    else:
        events_qs = SubscriptionEvent.objects.all()
    if end:
        payments = payments.filter(paid_at__lte=end)
        events_qs = events_qs.filter(created_at__lte=end)

    revenue = payments.aggregate(total=Sum("amount_uzs"))["total"] or Decimal("0")
    by_plan = list(
        active_live.values("plan_code")
        .annotate(count=Count("id"))
        .order_by("plan_code")
    )
    by_source = list(
        UserSubscription.objects.values("source")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
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
        "by_plan": by_plan,
        "by_source": by_source,
        "referral_trials_granted": trials,
        "usage_totals": {
            "morph_ai": usage_agg["ai"] or 0,
            "morph_studio": usage_agg["studio"] or 0,
        },
        "recent_events": list(
            events_qs.select_related("user", "subscription").order_by("-created_at")[:30]
        ),
    }
