"""Sartarosh SaaS obuna — aktivatsiya, muddat, entitlements."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db import transaction
from django.utils import timezone

from barbers.models import Barber, BarberShopSubscription, BarberShopSubscriptionEvent
from barbers.shop_plans import entitlement_snapshot, get_plan, serialize_plan


def _client_meta(request=None) -> dict[str, str | None]:
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
    barber: Barber | None = None,
    subscription: BarberShopSubscription | None = None,
    actor: str = "system",
    detail: dict | None = None,
    request=None,
) -> BarberShopSubscriptionEvent:
    meta = _client_meta(request)
    return BarberShopSubscriptionEvent.objects.create(
        barber=barber,
        subscription=subscription,
        action=action,
        actor=actor,
        detail=detail or {},
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent") or "",
    )


def expire_if_needed(sub: BarberShopSubscription) -> BarberShopSubscription:
    if sub.status != BarberShopSubscription.Status.ACTIVE or not sub.ends_at:
        return sub
    if timezone.now() < sub.ends_at:
        return sub
    with transaction.atomic():
        locked = BarberShopSubscription.objects.select_for_update().get(pk=sub.pk)
        if locked.status == BarberShopSubscription.Status.ACTIVE and locked.ends_at:
            if timezone.now() >= locked.ends_at:
                locked.status = BarberShopSubscription.Status.EXPIRED
                locked.save(update_fields=["status", "updated_at"])
                log_event(
                    action="expired",
                    barber=locked.barber,
                    subscription=locked,
                    detail={"ends_at": locked.ends_at.isoformat()},
                )
                return locked
        return locked


def get_active_subscription(barber: Barber) -> BarberShopSubscription | None:
    qs = (
        BarberShopSubscription.objects.filter(
            barber=barber, status=BarberShopSubscription.Status.ACTIVE
        )
        .order_by("-ends_at", "-created_at")
    )
    for sub in qs[:3]:
        sub = expire_if_needed(sub)
        if sub.is_currently_active:
            return sub
    return None


def has_active_subscription(barber: Barber) -> bool:
    return get_active_subscription(barber) is not None


def barber_has_customer_entitlement(barber: Barber) -> bool:
    """
    Mijozlarga ko‘rinish / bron: faol shop obuna YOKI egasi bo‘lgan salon
    trial/active (agent trial yoki to‘langan salon).
    """
    if has_active_subscription(barber):
        return True
    from django.db.models import Q
    from salons.models import Salon

    now = timezone.now()
    return (
        Salon.objects.filter(owner_barber_id=barber.pk, is_published=True)
        .filter(
            Q(subscription_status=Salon.SubscriptionStatus.ACTIVE)
            | Q(
                subscription_status=Salon.SubscriptionStatus.TRIAL,
                trial_ends_at__gt=now,
            )
        )
        .exists()
    )


def get_entitlements(barber: Barber) -> dict[str, Any]:
    sub = get_active_subscription(barber)
    if not sub:
        return {"panel_access": False, "plan_code": None, "active": False}
    ents = dict(sub.entitlements or {})
    if not ents:
        ents = entitlement_snapshot(sub.plan_code)
    ents["plan_code"] = sub.plan_code
    ents["active"] = True
    ents["subscription_id"] = str(sub.pk)
    ents["ends_at"] = sub.ends_at.isoformat() if sub.ends_at else None
    return ents


def has_entitlement(barber: Barber, key: str) -> bool:
    ents = get_entitlements(barber)
    if not ents.get("active") or not ents.get("panel_access"):
        return False
    val = ents.get(key)
    if val is None and key in ("invites_monthly", "team_seats"):
        # None = unlimited → allowed
        return key in ents
    return bool(val)


@transaction.atomic
def activate_subscription(
    *,
    barber: Barber,
    plan_code: str,
    source: str,
    price_uzs,
    payment_provider: str = "",
    payment_order_id: str = "",
    payment_transaction_id: str = "",
    wallet_entry_id: str = "",
    request=None,
    notes: str = "",
) -> BarberShopSubscription:
    plan = get_plan(plan_code)
    if not plan:
        raise ValueError("Noto'g'ri tarif.")

    now = timezone.now()
    # Mavjud faol obunani muddatiga qo'shamiz (upgrade/renew).
    current = get_active_subscription(barber)
    if current and current.ends_at and current.ends_at > now:
        starts = current.ends_at if current.plan_code == plan_code else now
        # Boshqa tarifga o'tsa — hozirdan yangi, eski deactivate
        if current.plan_code != plan_code:
            current.status = BarberShopSubscription.Status.CANCELLED
            current.deactivated_at = now
            current.deactivated_reason = "upgraded"
            current.save(
                update_fields=["status", "deactivated_at", "deactivated_reason", "updated_at"]
            )
            starts = now
            ends = now + timedelta(days=int(plan["period_days"]))
        else:
            ends = starts + timedelta(days=int(plan["period_days"]))
    else:
        starts = now
        ends = now + timedelta(days=int(plan["period_days"]))

    sub = BarberShopSubscription.objects.create(
        barber=barber,
        plan_code=plan_code,
        status=BarberShopSubscription.Status.ACTIVE,
        source=source,
        starts_at=starts,
        ends_at=ends,
        price_uzs=price_uzs,
        entitlements=entitlement_snapshot(plan_code),
        payment_provider=payment_provider,
        payment_order_id=payment_order_id or "",
        payment_transaction_id=payment_transaction_id or "",
        wallet_entry_id=wallet_entry_id or "",
        notes=notes or "",
    )
    log_event(
        action="activated",
        barber=barber,
        subscription=sub,
        actor=source,
        detail={
            "plan_code": plan_code,
            "starts_at": starts.isoformat(),
            "ends_at": ends.isoformat(),
            "price_uzs": str(price_uzs),
        },
        request=request,
    )
    try:
        from agents.finance import grant_agent_commission_on_paid

        grant_agent_commission_on_paid(barber=barber, subscription=sub)
    except Exception:
        pass
    try:
        from salons.visibility import sync_owned_salons_subscription_active

        sync_owned_salons_subscription_active(barber)
    except Exception:
        pass
    return sub


def serialize_subscription(sub: BarberShopSubscription | None) -> dict | None:
    if not sub:
        return None
    sub = expire_if_needed(sub)
    plan = get_plan(sub.plan_code)
    return {
        "id": str(sub.pk),
        "plan_code": sub.plan_code,
        "plan_name": plan["name_uz"] if plan else sub.plan_code,
        "status": sub.status,
        "source": sub.source,
        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
        "price_uzs": int(sub.price_uzs),
        "is_active": sub.is_currently_active,
        "entitlements": sub.entitlements or entitlement_snapshot(sub.plan_code),
        "badge": (sub.entitlements or {}).get("badge")
        or (plan or {}).get("badge")
        or sub.plan_code,
    }


def build_me_payload(barber: Barber) -> dict[str, Any]:
    active = get_active_subscription(barber)
    ents = get_entitlements(barber)
    from barbers.partner_trial import trial_claim_status_payload

    return {
        "has_subscription": bool(active),
        "subscription": serialize_subscription(active),
        "entitlements": ents,
        "required": True,
        "subscribe_path": "/barber/subscription",
        "agent_trial": trial_claim_status_payload(barber),
    }
