"""Obuna aktivatsiya, muddat, limitlar — barcha cheklovlar serverda."""

from __future__ import annotations

import logging
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.models import User
from subscriptions.models import (
    SubscriptionEvent,
    SubscriptionPayment,
    SubscriptionUsagePeriod,
    UserSubscription,
)
from subscriptions.messages import (
    CANCEL_BLOCK_REBUY_MESSAGE,
    CANCEL_MISSING_MESSAGE,
    CANCEL_STILL_PREMIUM_MESSAGE,
    NOT_AN_UPGRADE_MESSAGE,
    PLAN_CODE_INVALID,
    request_lang,
)
from subscriptions.plans import (
    CHAT_TOKEN_MIN_TURN,
    FREE_MORPH_AI_MONTHLY,
    FREE_MORPH_CHAT_TOKENS,
    FREE_MORPH_STUDIO_MONTHLY,
    FREE_MORPH_TRYON,
    FREE_TRYON_LAUNCH_AT,
    PLAN_CODES,
    PLAN_FREE,
    PLAN_PRO,
    free_plan,
    get_plan,
    is_plan_upgrade,
    plan_rank,
    serialize_plan,
)

logger = logging.getLogger(__name__)


def referral_generation_enabled() -> bool:
    """Admin Morf AI sozlamasi: 1 referal = 1 generatsiya."""
    try:
        from ai.models import MorphAiSettings

        return bool(MorphAiSettings.load().referral_generation_enabled)
    except Exception:
        return True


def _no_subscription_message() -> str:
    if referral_generation_enabled():
        return (
            "Generatsiya uchun obuna kerak yoki 1 ta do'stingizni taklif qiling "
            "(1 referal = 1 generatsiya)."
        )
    return "Generatsiya uchun obuna kerak."


def _raw_referral_credits(user: User) -> int:
    try:
        return max(0, int(getattr(user, "morph_referral_credits", 0) or 0))
    except (TypeError, ValueError):
        return 0


def _referral_credits(user: User) -> int:
    """Admin o'chirganida kreditlar ishlamaydi (0 deb hisoblanadi)."""
    if not referral_generation_enabled():
        return 0
    return _raw_referral_credits(user)


def _spend_referral_credit(user: User) -> bool:
    if not referral_generation_enabled():
        return False
    from django.db.models import F

    updated = User.objects.filter(pk=user.pk, morph_referral_credits__gt=0).update(
        morph_referral_credits=F("morph_referral_credits") - 1
    )
    if not updated:
        return False
    user.refresh_from_db(fields=["morph_referral_credits"])
    return True


def free_tryon_available(user: User) -> bool:
    """Bir martalik bepul try-on o'chirilgan — faqat obuna yoki referal."""
    return False


def free_tryon_payload(user: User, *, has_subscription: bool) -> dict[str, Any]:
    used_at = getattr(user, "morph_free_tryon_used_at", None)
    return {
        "eligible": False,
        "available": False,
        "used": used_at is not None,
        "used_at": used_at.isoformat() if used_at else None,
    }


def _consume_free_tryon(user: User) -> bool:
    """Atomik: faqat birinchi muvaffaqiyatli generatsiya bepul hisoblanadi."""
    now = timezone.now()
    updated = User.objects.filter(
        pk=user.pk,
        morph_free_tryon_eligible=True,
        morph_free_tryon_used_at__isnull=True,
    ).update(morph_free_tryon_used_at=now)
    if updated:
        user.morph_free_tryon_used_at = now
    return bool(updated)


def _notify_free_tryon_used(user_id: int) -> None:
    try:
        from notifications.utils import notify_user

        u = User.objects.filter(pk=user_id).first()
        if not u:
            return
        notify_user(
            u,
            "morph_free_tryon_used",
            "Bepul try-on natijangiz tayyor ✨",
            "Yangi obrazingizni ko'rib chiqing! Yana uslublarni sinash uchun "
            "obunani tanlang yoki do'stingizni taklif qiling.",
            payload={"screen": "morph"},
        )
    except Exception:
        pass


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
        "morph_chat_tokens_monthly": int(plan.get("morph_chat_tokens_monthly") or 0),
        "morph_voice": bool(plan.get("morph_voice", True)),
        "family_members_max": plan["family_members_max"],
        "morph_care": plan["morph_care"],
        "morph_care_pro": bool(plan.get("morph_care_pro")),
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
    """Muddati o'tgan faol yoki bekor qilingan obunani expired qilish."""
    if not sub.ends_at:
        return sub
    if timezone.now() < sub.ends_at:
        return sub
    can_expire = sub.status == UserSubscription.Status.ACTIVE or sub.is_user_cancelled
    if not can_expire:
        return sub

    with transaction.atomic():
        locked = UserSubscription.objects.select_for_update().get(pk=sub.pk)
        still_open = locked.status == UserSubscription.Status.ACTIVE or locked.is_user_cancelled
        if still_open and locked.ends_at and timezone.now() >= locked.ends_at:
            locked.status = UserSubscription.Status.EXPIRED
            locked.save(update_fields=["status", "updated_at"])
            log_event(
                action=SubscriptionEvent.Action.EXPIRED,
                user=locked.user,
                subscription=locked,
                detail={"ends_at": locked.ends_at.isoformat()},
            )
        return locked


def subscription_payment_is_valid(sub: UserSubscription) -> bool:
    """Refunded to'lov Premium bermaydi. Admin/trial to'lovsiz ham yaroqli."""
    if sub.status == UserSubscription.Status.REFUNDED:
        return False
    return not sub.payments.filter(status=SubscriptionPayment.Status.REFUNDED).exists()


def has_premium_access(sub: UserSubscription | None, now=None) -> bool:
    """Faol yoki bekor qilingan, lekin muddati tugamagan va to'lovi yaroqli."""
    if sub is None:
        return False
    now = now or timezone.now()
    if sub.ends_at and now >= sub.ends_at:
        expire_if_needed(sub)
        return False
    if not sub.grants_premium_at(now):
        return False
    return subscription_payment_is_valid(sub)


def get_active_subscription(user: User) -> UserSubscription | None:
    qs = UserSubscription.objects.filter(user=user).filter(
        Q(status=UserSubscription.Status.ACTIVE)
        | Q(status=UserSubscription.Status.CANCELLED, cancelled_at__isnull=False)
    ).order_by("-ends_at", "-created_at")
    for sub in qs[:8]:
        sub = expire_if_needed(sub)
        if has_premium_access(sub):
            return sub
    return None


def get_latest_subscription(user: User) -> UserSubscription | None:
    return UserSubscription.objects.filter(user=user).order_by("-created_at", "-ends_at").first()


# Matnlar subscriptions.messages da — testlar shu nomlarni services dan import qiladi.


@transaction.atomic
def cancel_user_subscription(*, user: User, request=None) -> UserSubscription:
    """Foydalanuvchi o'z obunasini bekor qiladi.

    Payme refund/cancel chaqirilmaydi, to'lov yozuvi o'zgarmaydi.
    Takroriy so'rov xato qaytarmaydi. Qator qulfi bir vaqtdagi so'rovlarni ketma-ket qiladi.
    """
    now = timezone.now()
    rows = list(
        UserSubscription.objects.select_for_update()
        .filter(user=user)
        .filter(
            Q(status=UserSubscription.Status.ACTIVE)
            | Q(status=UserSubscription.Status.CANCELLED, cancelled_at__isnull=False)
        )
        .order_by("-ends_at", "-created_at")
    )
    rows = rows[:8]
    chosen: UserSubscription | None = None
    for row in rows:
        if row.ends_at and now >= row.ends_at:
            row.status = UserSubscription.Status.EXPIRED
            row.save(update_fields=["status", "updated_at"])
            log_event(
                action=SubscriptionEvent.Action.EXPIRED,
                user=row.user,
                subscription=row,
                detail={"ends_at": row.ends_at.isoformat(), "via": "cancel"},
                request=request,
            )
            continue
        if not row.grants_premium_at(now) or not subscription_payment_is_valid(row):
            continue
        chosen = row
        break

    if chosen is None:
        raise ValueError(CANCEL_MISSING_MESSAGE)

    if chosen.is_user_cancelled:
        return chosen

    ends_at = chosen.ends_at
    chosen.status = UserSubscription.Status.CANCELLED
    chosen.cancelled_at = now
    chosen.auto_renew = False
    chosen.ends_at = ends_at
    chosen.save(update_fields=["status", "cancelled_at", "auto_renew", "ends_at", "updated_at"])
    log_event(
        action=SubscriptionEvent.Action.CANCELLED,
        user=user,
        subscription=chosen,
        actor=f"user:{user.pk}",
        detail={
            "ends_at": chosen.ends_at.isoformat() if chosen.ends_at else None,
            "payme_untouched": True,
            "refund": False,
        },
        request=request,
    )
    return chosen


def checkout_plan_error(*, user: User, plan_code: str) -> str | None:
    """Klient tarif kodini yuboradi — narx va daraja faqat serverda."""
    code = (plan_code or "").strip().lower()
    if code not in PLAN_CODES:
        return PLAN_CODE_INVALID
    sub = get_active_subscription(user)
    if not sub:
        return None
    if sub.is_user_cancelled:
        return CANCEL_BLOCK_REBUY_MESSAGE
    if not is_plan_upgrade(code, sub.plan_code):
        return NOT_AN_UPGRADE_MESSAGE
    return None


def get_or_create_usage(user: User) -> SubscriptionUsagePeriod:
    start, end = current_period_bounds()
    usage, _ = SubscriptionUsagePeriod.objects.get_or_create(
        user=user,
        period_start=start,
        defaults={"period_end": end},
    )
    return usage


def quota_for_subscription(sub: UserSubscription) -> dict[str, Any]:
    """Faol tarifning joriy katalogi.

    Obuna yozuvidagi eski entitlements (0 yoki pastki tarif) yangi tarif
    limitini bosib qo'ymaydi.
    """
    live = entitlement_snapshot(sub.plan_code)
    if live:
        return live
    return dict(sub.entitlements or {})


def _quota_int(quota: dict[str, Any], key: str) -> int:
    raw = quota.get(key)
    try:
        return max(0, int(raw or 0))
    except (TypeError, ValueError):
        return 0


def _usage_predates_plan(usage: SubscriptionUsagePeriod, sub: UserSubscription) -> bool:
    """Hisoblagich shu obuna boshlanishidan oldin yig'ilgan."""
    started = sub.starts_at
    touched = usage.updated_at
    if not started or not touched or touched >= started:
        return False
    return bool(usage.morph_ai_used or usage.morph_studio_used or usage.morph_chat_tokens_used)


def align_usage_to_plan(user: User, sub: UserSubscription) -> SubscriptionUsagePeriod:
    """Oylik hisoblagichni faol tarifga moslash.

    Bepul → Starter, Starter → Plus, Plus → Pro: oldingi kvota yangi tarifga
    ko'chmaydi. Shu tarif ichida sarf o'zgarishsiz qoladi.
    """
    start, end = current_period_bounds()
    code = (sub.plan_code or "").strip().lower()
    with transaction.atomic():
        usage, _ = SubscriptionUsagePeriod.objects.select_for_update().get_or_create(
            user=user,
            period_start=start,
            defaults={"period_end": end, "plan_code": code},
        )
        current = (usage.plan_code or "").strip().lower()
        predates = _usage_predates_plan(usage, sub)
        # Tarif kodi yozilgan bo‘lsa ham, hisoblagich obuna boshlanishidan oldingi
        # bo‘lsa — yangi tarif kvotasini yemasin.
        if current == code and code and not predates:
            return usage
        reset = bool(current and current != code) or predates
        fields = ["plan_code", "updated_at"]
        if reset:
            usage.morph_ai_used = 0
            usage.morph_studio_used = 0
            usage.morph_chat_tokens_used = 0
            fields.extend(["morph_ai_used", "morph_studio_used", "morph_chat_tokens_used"])
        usage.plan_code = code
        if usage.period_end != end:
            usage.period_end = end
            fields.append("period_end")
        usage.save(update_fields=fields)
        return usage


def reset_usage_for_plan(user: User, plan_code: str) -> SubscriptionUsagePeriod:
    """Tarif yoqilganda shu oygi try-on, studio va chat hisoblagichini 0 qilish."""
    start, end = current_period_bounds()
    code = (plan_code or "").strip().lower()
    with transaction.atomic():
        usage, _ = SubscriptionUsagePeriod.objects.select_for_update().get_or_create(
            user=user,
            period_start=start,
            defaults={"period_end": end, "plan_code": code},
        )
        usage.plan_code = code
        usage.period_end = end
        usage.morph_ai_used = 0
        usage.morph_studio_used = 0
        usage.morph_chat_tokens_used = 0
        usage.save(
            update_fields=[
                "plan_code",
                "period_end",
                "morph_ai_used",
                "morph_studio_used",
                "morph_chat_tokens_used",
                "updated_at",
            ]
        )
        return usage


def chat_token_limit_for_user(user: User) -> int:
    """Obuna: joriy tarifning oylik tokeni. Obunasiz: bir martalik 10k."""
    sub = get_active_subscription(user)
    if not sub:
        return FREE_MORPH_CHAT_TOKENS
    return _quota_int(quota_for_subscription(sub), "morph_chat_tokens_monthly")


def _free_chat_tokens_used(user: User) -> int:
    raw = getattr(user, "morph_chat_free_tokens_used", None)
    if raw is not None:
        try:
            return max(0, int(raw or 0))
        except (TypeError, ValueError):
            pass
    stored = (
        User.objects.filter(pk=user.pk)
        .values_list("morph_chat_free_tokens_used", flat=True)
        .first()
    )
    return max(0, int(stored or 0))


def _free_tryon_used(user: User) -> int:
    used_at = getattr(user, "morph_free_tryon_used_at", None)
    if used_at is not None:
        return 1
    stored = (
        User.objects.filter(pk=user.pk)
        .values_list("morph_free_tryon_used_at", flat=True)
        .first()
    )
    return 1 if stored else 0


def free_tryon_snapshot(user: User) -> dict[str, Any]:
    """Bepul try-on kvotasi 0 — yangi user ham to'lovsiz generatsiya olmaydi."""
    used = _free_tryon_used(user)
    limit = FREE_MORPH_TRYON
    remaining = max(0, limit - used)
    return {
        "morph_free_tryon_used": used,
        "morph_free_tryon_limit": limit,
        "morph_free_tryon_remaining": remaining,
    }


def chat_token_snapshot(user: User) -> dict[str, Any]:
    sub = get_active_subscription(user)
    if sub:
        usage = align_usage_to_plan(user, sub)
        limit = _quota_int(quota_for_subscription(sub), "morph_chat_tokens_monthly")
        used = int(usage.morph_chat_tokens_used or 0)
        period = "month"
    else:
        limit = FREE_MORPH_CHAT_TOKENS
        used = _free_chat_tokens_used(user)
        period = "lifetime"
    remaining = max(0, limit - used)
    return {
        "morph_chat_tokens_used": used,
        "morph_chat_tokens_limit": limit,
        "morph_chat_tokens_remaining": remaining,
        "morph_chat_tokens_period": period,
    }


def usage_snapshot(user: User, entitlements: dict[str, Any] | None) -> dict[str, Any]:
    sub = get_active_subscription(user)
    if sub:
        # Chaqiruvchi eski snapshot bersa ham, limit faol tarif katalogidan olinadi.
        entitlements = quota_for_subscription(sub)
        usage = align_usage_to_plan(user, sub)
    else:
        usage = get_or_create_usage(user)
    ai_limit = int((entitlements or {}).get("morph_ai_monthly") or 0)
    studio_limit = int((entitlements or {}).get("morph_studio_monthly") or 0)
    chat = chat_token_snapshot(user)
    live_plan = (sub.plan_code if sub else PLAN_FREE) or ""
    return {
        "period_start": usage.period_start.isoformat(),
        "period_end": usage.period_end.isoformat(),
        "plan_code": (usage.plan_code or live_plan).strip().lower(),
        "morph_ai_used": usage.morph_ai_used,
        "morph_ai_limit": ai_limit,
        "morph_ai_remaining": max(0, ai_limit - usage.morph_ai_used) if ai_limit else 0,
        "morph_studio_used": usage.morph_studio_used,
        "morph_studio_limit": studio_limit,
        "morph_studio_remaining": max(0, studio_limit - usage.morph_studio_used)
        if studio_limit
        else 0,
        **chat,
    }


def current_plan_for_subscription(sub: UserSubscription | None) -> dict[str, Any]:
    """Pullik obuna bo'lmasa joriy tarif Free. Ro'yxatdan keyin avtomatik."""
    if sub is not None:
        paid = get_plan(sub.plan_code)
        if paid is not None:
            return paid
    return free_plan()


def serialize_current_plan(sub: UserSubscription | None) -> dict[str, Any]:
    from subscriptions.plans import serialize_plan

    return serialize_plan(current_plan_for_subscription(sub))


def build_me_payload(user: User) -> dict[str, Any]:
    from subscriptions.payme_service import reconcile_pending_payme

    reconcile_pending_payme(user)
    sub = get_active_subscription(user)
    # Katalog flaglari jonli reja asosida — eski entitlements snapshot chetlab o'tmasin.
    entitlements = entitlement_snapshot(sub.plan_code) if sub else {}
    ref_on = referral_generation_enabled()
    credits = _referral_credits(user)
    free_tryon = free_tryon_payload(user, has_subscription=bool(sub))
    free_left = 1 if free_tryon["available"] else 0
    if sub:
        usage = {
            **usage_snapshot(user, entitlements),
            "referral_credits": credits,
        }
    else:
        tryon_counts = free_tryon_snapshot(user)
        free_left = int(tryon_counts["morph_free_tryon_remaining"]) if free_tryon_available(user) else 0
        period = usage_snapshot(
            user,
            {
                "morph_ai_monthly": FREE_MORPH_AI_MONTHLY,
                "morph_studio_monthly": FREE_MORPH_STUDIO_MONTHLY,
            },
        )
        gen_limit = int(free_plan().get("morph_ai_monthly") or FREE_MORPH_TRYON)
        gen_used = int(tryon_counts["morph_free_tryon_used"])
        usage = {
            **period,
            **tryon_counts,
            "is_free_tier": True,
            "plan_code": PLAN_FREE,
            "locked": credits <= 0 and not free_left,
            "referral_credits": credits,
            "free_tryon_remaining": free_left,
            "morph_ai_limit": gen_limit,
            "morph_ai_used": gen_used,
            "morph_ai_remaining": free_left + credits,
        }
    from subscriptions.promos import get_new_user_offer

    now = timezone.now()
    days_remaining = None
    if sub and sub.ends_at:
        delta = sub.ends_at - now
        days_remaining = max(0, int(delta.total_seconds() // 86400))

    plan_code = sub.plan_code if sub else PLAN_FREE
    current_plan = serialize_current_plan(sub)
    free_ents = entitlement_snapshot(PLAN_FREE)
    next_upgrade = None
    if plan_code == PLAN_FREE:
        next_upgrade = {
            "plan_code": "starter",
            "label_uz": "Starter ga o'tish",
            "label_ru": "Перейти на Starter",
            "label_en": "Move to Starter",
        }
    elif plan_code == "starter":
        next_upgrade = {
            "plan_code": "plus",
            "label_uz": "Plus ga upgrade",
            "label_ru": "Перейти на Plus",
            "label_en": "Upgrade to Plus",
        }
    elif plan_code == "plus":
        next_upgrade = {
            "plan_code": "pro",
            "label_uz": "Pro ga upgrade",
            "label_ru": "Перейти на Pro",
            "label_en": "Upgrade to Pro",
        }

    from subscriptions.flash_tryon import flash_snapshot

    flash = flash_snapshot(user)
    if flash.get("can_generate") and not sub:
        usage["morph_ai_remaining"] = int(usage.get("morph_ai_remaining") or 0) + 1
        usage["locked"] = False
    elif flash.get("can_generate") and sub:
        usage["morph_ai_remaining"] = int(usage.get("morph_ai_remaining") or 0) + 1
    allowed = bool(sub) or credits > 0 or bool(free_left) or bool(flash.get("can_generate"))
    live_ents = entitlements if sub else free_ents
    studio_paused = bool(getattr(settings, "MORPH_STUDIO_TEMPORARILY_DISABLED", True))
    studio_feature = (
        (not studio_paused) and bool(sub) and _quota_int(live_ents, "morph_studio_monthly") > 0
    )
    chat = usage
    chat_remaining = int(chat.get("morph_chat_tokens_remaining") or 0)
    last = None
    last_status = "none"
    if not sub:
        last_row = get_latest_subscription(user)
        if last_row:
            last = serialize_subscription(last_row)
            last_status = last_row.status
    return {
        "has_active": bool(sub),
        "is_premium": bool(sub),
        "status": sub.status if sub else last_status,
        "auto_renew": bool(sub.auto_renew) if sub else False,
        "expires_at": sub.ends_at.isoformat() if sub and sub.ends_at else None,
        "cancelled_at": sub.cancelled_at.isoformat() if sub and sub.cancelled_at else None,
        "can_cancel": bool(sub and sub.status == UserSubscription.Status.ACTIVE and not sub.cancelled_at),
        "subscription": serialize_subscription(sub) if sub else None,
        "last_subscription": last,
        "current_plan_code": plan_code,
        "current_plan": current_plan,
        "entitlements": entitlements if sub else free_ents,
        "usage": usage,
        "badge": entitlements.get("badge") if sub else free_ents.get("badge"),
        "morph_care": bool(entitlements.get("morph_care")) if sub else False,
        "morph_care_pro": bool(entitlements.get("morph_care_pro")) if sub else False,
        "family_members_max": entitlements.get("family_members_max") if sub else 0,
        "family_unlimited": entitlements.get("family_members_max") is None if sub else False,
        "days_remaining": days_remaining,
        "referral_credits": credits,
        "referral_generation_enabled": ref_on,
        "free_tryon": free_tryon,
        "flash_tryon": flash,
        "access": {
            "morph_ai_allowed": allowed,
            "morph_chat_allowed": chat_remaining >= CHAT_TOKEN_MIN_TURN,
            "morph_voice_allowed": bool(sub)
            and not getattr(settings, "MORPH_VOICE_TEMPORARILY_DISABLED", True),
            "morph_studio_allowed": studio_feature,
            "morph_care_allowed": bool(live_ents.get("morph_care")) if sub else False,
            "morph_care_pro_allowed": bool(live_ents.get("morph_care_pro")) if sub else False,
            "reason": None if allowed else "subscription_required",
            "message": None
            if allowed
            else (
                "1 000 so'm — 1 ta rasm. 30 daqiqa ichida Payme orqali to'lang."
                if flash.get("can_buy")
                else _no_subscription_message()
            ),
            "referral_credits": credits,
            "referral_generation_enabled": ref_on,
            "free_tryon_available": free_tryon["available"],
            "free_tryon_remaining": free_left,
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
    premium = has_premium_access(sub, now)
    can_cancel = (
        sub.status == UserSubscription.Status.ACTIVE
        and not sub.cancelled_at
        and premium
    )
    return {
        "id": str(sub.pk),
        "plan_code": sub.plan_code,
        "plan": serialize_plan(plan) if plan else None,
        "status": sub.status,
        "source": sub.source,
        "is_trial": is_trial,
        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
        "expires_at": sub.ends_at.isoformat() if sub.ends_at else None,
        "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
        "days_remaining": days_remaining,
        "price_uzs": int(sub.price_uzs),
        "auto_renew": bool(sub.auto_renew),
        "is_premium": premium,
        "can_cancel": can_cancel,
        "payment_provider": sub.payment_provider or "",
        "payment_id": sub.payment_order_id or sub.payment_transaction_id or "",
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

    # Mavjud faol obunalarni to'xtatish (upgrade/replace) — user-cancel emas.
    active_qs = UserSubscription.objects.select_for_update().filter(
        user=user,
        status=UserSubscription.Status.ACTIVE,
    )
    for old in active_qs:
        old.status = UserSubscription.Status.DEACTIVATED
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
    if source in {
        UserSubscription.Source.PAYME,
        UserSubscription.Source.WALLET,
        UserSubscription.Source.CLICK,
    }:
        lang = request_lang(request)
        user_id = user.pk
        bought = plan_code
        transaction.on_commit(
            lambda: _notify_subscription_purchased(
                user_id=user_id,
                plan_code=bought,
                lang=lang,
            )
        )
    # Yangi yoki yuqori tarif — oldingi (bepul/starter/plus) hisoblagich yangi limitni yemaydi.
    reset_usage_for_plan(user, plan_code)
    try:
        from analytics.hooks import note_subscription_activated

        note_subscription_activated(sub.pk)
    except Exception:
        logger.exception("analytics activation hook failed")
    return sub


_PLAN_LABEL = {"starter": "Starter", "plus": "Plus", "pro": "Pro"}
_PAID_COPY = {
    "uz": (
        "Obuna muvaffaqiyatli sotib olindi",
        "{plan} tarifi yoqildi. Morf AI limitlari ochiq.",
    ),
    "ru": (
        "Подписка успешно оформлена",
        "Тариф {plan} включён. Лимиты Morf AI открыты.",
    ),
    "en": (
        "Subscription purchased",
        "The {plan} plan is on. Morf AI limits are unlocked.",
    ),
}


def _notify_subscription_purchased(*, user_id: int, plan_code: str, lang: str) -> None:
    """Ilova ichidagi bildirishnoma va telefonga push (Expo + FCM)."""
    try:
        from notifications.utils import notify_user

        buyer = User.objects.filter(pk=user_id).first()
        if not buyer:
            return
        title, body = _PAID_COPY.get(lang) or _PAID_COPY["uz"]
        plan = _PLAN_LABEL.get(plan_code, plan_code)
        notify_user(
            buyer,
            "subscription_paid",
            title,
            body.format(plan=plan),
            payload={"screen": "subscriptions", "plan_code": plan_code},
        )
    except Exception:
        logger.warning("subscription purchase push failed user=%s", user_id)


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
    locked.starts_at = now
    locked.ends_at = ends
    locked.deactivated_at = None
    locked.deactivated_reason = ""
    locked.deactivated_by = ""
    snap = entitlement_snapshot(locked.plan_code)
    if snap:
        locked.entitlements = snap
    locked.save(
        update_fields=[
            "status",
            "starts_at",
            "ends_at",
            "deactivated_at",
            "deactivated_reason",
            "deactivated_by",
            "entitlements",
            "updated_at",
        ]
    )
    reset_usage_for_plan(locked.user, locked.plan_code)
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
    return quota_for_subscription(sub).get("family_members_max", 0)


CARE_PLUS_REQUIRED = "Morf AI Parvarish Plus obunasida mavjud."
CARE_PRO_REQUIRED = "SOS va Javon faqat Pro obunasida mavjud."


def can_use_morph_care(user: User) -> bool:
    from django.conf import settings

    if getattr(settings, "MORPH_ENTITLEMENT_BYPASS", False):
        return True
    if getattr(settings, "MORPH_CARE_ACCESS_DEBUG", False):
        return True

    sub = get_active_subscription(user)
    if not sub:
        return False
    plan = get_plan(sub.plan_code)
    return bool(plan and plan.get("morph_care"))


def can_use_morph_care_pro(user: User) -> bool:
    """SOS / Javon — faqat Pro."""
    from django.conf import settings

    if getattr(settings, "MORPH_ENTITLEMENT_BYPASS", False):
        return True
    if getattr(settings, "MORPH_CARE_ACCESS_DEBUG", False):
        return True

    sub = get_active_subscription(user)
    if not sub:
        return False
    plan = get_plan(sub.plan_code)
    if plan and "morph_care_pro" in plan:
        return bool(plan.get("morph_care_pro"))
    return plan_rank(sub.plan_code) >= plan_rank(PLAN_PRO)


def morph_care_block(*, user: User, pro: bool = False) -> dict[str, str] | None:
    """None = ruxsat. Aks holda 403 JSON."""
    if pro:
        if can_use_morph_care_pro(user):
            return None
        if can_use_morph_care(user):
            return {"detail": CARE_PRO_REQUIRED, "code": "care_pro"}
        return {"detail": CARE_PLUS_REQUIRED, "code": "care_plus"}
    if can_use_morph_care(user):
        return None
    return {"detail": CARE_PLUS_REQUIRED, "code": "care_plus"}


def can_use_morph_voice(user: User) -> bool:
    """Jonli ovoz — vaqtincha yopiq; ochilganda faqat faol pullik obuna."""
    if getattr(settings, "MORPH_VOICE_TEMPORARILY_DISABLED", True):
        return False
    return get_active_subscription(user) is not None


def _had_any_subscription(user: User) -> bool:
    """Biror obuna bo‘lgan user — yangi hisoblanmaydi (bepul 1× yo‘q)."""
    return UserSubscription.objects.filter(user=user).exists()


def _is_new_account_for_free_tryon(user: User) -> bool:
    """Faqat launch sanasidan keyin ochilgan yangi hisoblar."""
    joined = getattr(user, "date_joined", None)
    if joined is None:
        return True
    if timezone.is_naive(joined):
        joined = timezone.make_aware(joined, timezone.get_current_timezone())
    return joined >= FREE_TRYON_LAUNCH_AT


def _had_prior_paid_tryon(user: User) -> bool:
    return SubscriptionUsagePeriod.objects.filter(user=user, morph_ai_used__gt=0).exists()


def check_morph_entitlement(*, user: User, kind: str, flash_inflight: bool = False) -> str | None:
    """
    Morf AI:
    - analyze / face_check — obunasiz ochiq (tahlil → keyin generatsiya paywall).
    - chat — obunasiz bir martalik 10k token; tugagach obuna majburiy.
    - voice — faqat faol pullik obuna.
    - tryon — faol obuna kvotasi, referal krediti, yoki to'langan 30 daqiqalik 1 rasm.
    - studio — faol obuna majburiy. 1 000 so'mlik rasm studio ochmaydi.
    """
    if kind not in ("tryon", "studio", "analyze", "face_check", "chat", "voice"):
        return None

    from django.conf import settings

    if getattr(settings, "MORPH_ENTITLEMENT_BYPASS", False):
        return None

    if kind in ("analyze", "face_check"):
        return None

    sub = get_active_subscription(user)

    if kind == "voice":
        if getattr(settings, "MORPH_VOICE_TEMPORARILY_DISABLED", True):
            return "Ovozli suhbat tez orada."
        if not can_use_morph_voice(user):
            return "Ovozli suhbat Starter, Plus yoki Pro obunasida mavjud."
        return check_morph_entitlement(user=user, kind="chat")

    if kind == "chat":
        snap = chat_token_snapshot(user)
        used = snap["morph_chat_tokens_used"]
        limit = snap["morph_chat_tokens_limit"]
        remaining = snap["morph_chat_tokens_remaining"]
        if remaining < CHAT_TOKEN_MIN_TURN:
            log_event(
                action=SubscriptionEvent.Action.LIMIT_HIT,
                user=user,
                subscription=sub,
                detail={"kind": "morph_chat_tokens", "used": used, "limit": limit},
            )
            if not sub:
                return (
                    f"Bepul Morf AI chat tokenlari tugadi ({used}/{limit}). "
                    "Chatbotdan foydalanish uchun obuna sotib oling."
                )
            return (
                f"Oylik Morf AI chat token limiti tugadi ({used}/{limit}). "
                "Tarifni yangilang — ko'proq token olasiz."
            )
        return None

    if kind == "studio":
        if getattr(settings, "MORPH_STUDIO_TEMPORARILY_DISABLED", True):
            return "Morf AI Studio hozircha o'chirilgan."
        if not sub:
            return _no_subscription_message()
        usage = align_usage_to_plan(user, sub)
        limit = _quota_int(quota_for_subscription(sub), "morph_studio_monthly")
        if limit <= 0:
            return "Morf AI Studio Plus yoki Pro obunasida mavjud."
        if usage.morph_studio_used >= limit:
            log_event(
                action=SubscriptionEvent.Action.LIMIT_HIT,
                user=user,
                subscription=sub,
                detail={"kind": "morph_studio", "used": usage.morph_studio_used, "limit": limit},
            )
            return f"Oylik Morf AI Studio limiti tugadi ({limit}/{limit}). Tarifni yangilang."
        return None

    # tryon — tarif kvotasi tugasa ham 1 referal krediti bitta generatsiyani ochadi.
    credits = _referral_credits(user)
    if sub:
        usage = align_usage_to_plan(user, sub)
        limit = _quota_int(quota_for_subscription(sub), "morph_ai_monthly")
        if limit > 0 and usage.morph_ai_used < limit:
            return None
        if credits > 0:
            return None
        from subscriptions.flash_tryon import flash_tryon_block

        if flash_tryon_block(user, allow_reserved=flash_inflight) == "":
            return None
        if limit <= 0:
            return "Bu reja Morf AI generatsiyasini qo'llab-quvvatlamaydi. Tarifni yangilang."
        log_event(
            action=SubscriptionEvent.Action.LIMIT_HIT,
            user=user,
            subscription=sub,
            detail={"kind": "morph_ai", "used": usage.morph_ai_used, "limit": limit},
        )
        return (
            f"Oylik Morf AI limiti tugadi ({limit}/{limit}). "
            + (
                "Tarifni yangilang yoki do'st taklif qilib kredit oling."
                if referral_generation_enabled()
                else "Tarifni yangilang."
            )
        )

    if credits > 0:
        return None
    from subscriptions.flash_tryon import flash_tryon_block

    blocked = flash_tryon_block(user, allow_reserved=flash_inflight)
    if blocked == "":
        return None
    if blocked:
        return blocked
    return _no_subscription_message()


@transaction.atomic
def record_morph_usage(*, user: User, kind: str) -> None:
    if kind not in ("tryon", "studio"):
        return

    if kind == "tryon":
        from subscriptions.flash_tryon import commit_flash_tryon

        if commit_flash_tryon(user):
            log_event(
                action=SubscriptionEvent.Action.USAGE,
                user=user,
                actor="system",
                detail={"kind": "tryon", "source": "flash_1000"},
            )
            return

    sub = get_active_subscription(user)
    free_used = False
    if kind == "tryon" and sub:
        usage = align_usage_to_plan(user, sub)
        limit = _quota_int(quota_for_subscription(sub), "morph_ai_monthly")
        if limit > 0 and int(usage.morph_ai_used or 0) < limit:
            usage.morph_ai_used = int(usage.morph_ai_used or 0) + 1
            usage.save(update_fields=["morph_ai_used", "updated_at"])
        elif not _spend_referral_credit(user):
            return
    elif kind == "tryon":
        start, end = current_period_bounds()
        usage, _ = SubscriptionUsagePeriod.objects.select_for_update().get_or_create(
            user=user,
            period_start=start,
            defaults={"period_end": end},
        )
        if not _spend_referral_credit(user):
            return
    elif sub:
        usage = align_usage_to_plan(user, sub)
        usage.morph_studio_used = int(usage.morph_studio_used or 0) + 1
        usage.save(update_fields=["morph_studio_used", "updated_at"])
    else:
        start, end = current_period_bounds()
        usage, _ = SubscriptionUsagePeriod.objects.select_for_update().get_or_create(
            user=user,
            period_start=start,
            defaults={"period_end": end},
        )
        usage.morph_studio_used = usage.morph_studio_used + 1
        usage.save(update_fields=["morph_studio_used", "updated_at"])

    log_event(
        action=SubscriptionEvent.Action.USAGE,
        user=user,
        subscription=sub,
        detail={
            "kind": kind,
            "morph_ai_used": usage.morph_ai_used,
            "morph_studio_used": usage.morph_studio_used,
            "morph_chat_tokens_used": usage.morph_chat_tokens_used,
            "referral_credits": _referral_credits(user),
            "free_tryon": free_used,
        },
    )


@transaction.atomic
def record_morph_chat_tokens(*, user: User, tokens: int) -> dict[str, Any]:
    """Chat javobidan keyin token hisoblagichini oshirish (obuna: oy, bepul: umrbod)."""
    added = max(0, int(tokens or 0))
    sub = get_active_subscription(user)
    if sub:
        usage = align_usage_to_plan(user, sub)
        if added:
            usage.morph_chat_tokens_used = int(usage.morph_chat_tokens_used or 0) + added
            usage.save(update_fields=["morph_chat_tokens_used", "updated_at"])
            log_event(
                action=SubscriptionEvent.Action.USAGE,
                user=user,
                subscription=sub,
                detail={
                    "kind": "morph_chat_tokens",
                    "added": added,
                    "used": usage.morph_chat_tokens_used,
                    "period": "month",
                },
            )
        return chat_token_snapshot(user)

    locked = User.objects.select_for_update().get(pk=user.pk)
    if added:
        locked.morph_chat_free_tokens_used = int(locked.morph_chat_free_tokens_used or 0) + added
        locked.save(update_fields=["morph_chat_free_tokens_used"])
        user.morph_chat_free_tokens_used = locked.morph_chat_free_tokens_used
        log_event(
            action=SubscriptionEvent.Action.USAGE,
            user=user,
            subscription=None,
            detail={
                "kind": "morph_chat_tokens",
                "added": added,
                "used": locked.morph_chat_free_tokens_used,
                "period": "lifetime",
            },
        )
    return chat_token_snapshot(user)


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
        "usage_totals": {
            "morph_ai": usage_agg["ai"] or 0,
            "morph_studio": usage_agg["studio"] or 0,
        },
        "recent_events": list(
            events_qs.select_related("user", "subscription").order_by("-created_at")[:30]
        ),
    }


def subscription_lifecycle_analytics() -> dict[str, Any]:
    """Obuna sotib olish, foydalanish, limit tugashi va yangilanish statistikasi."""
    from django.db.models.functions import TruncMonth

    now = timezone.now()
    period_start, _period_end = current_period_bounds(now)

    active_qs = UserSubscription.objects.filter(
        status=UserSubscription.Status.ACTIVE
    ).filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))

    paid_qs = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID)
    paid_user_ids = set(paid_qs.values_list("user_id", flat=True).distinct())

    # Joriy oy usage
    usage_rows = {
        u.user_id: u
        for u in SubscriptionUsagePeriod.objects.filter(period_start=period_start).only(
            "user_id", "morph_ai_used", "morph_studio_used"
        )
    }

    limit_exhausted: list[dict[str, Any]] = []
    active_using = 0
    active_never_used = 0
    by_plan_active: dict[str, dict[str, int]] = {}

    for sub in active_qs.select_related("user").iterator(chunk_size=200):
        ents = sub.entitlements or entitlement_snapshot(sub.plan_code)
        ai_limit = int(ents.get("morph_ai_monthly") or 0)
        studio_limit = int(ents.get("morph_studio_monthly") or 0)
        usage = usage_rows.get(sub.user_id)
        ai_used = usage.morph_ai_used if usage else 0
        studio_used = usage.morph_studio_used if usage else 0

        plan_bucket = by_plan_active.setdefault(
            sub.plan_code,
            {
                "plan_code": sub.plan_code,
                "active": 0,
                "limit_exhausted": 0,
                "never_used": 0,
                "using": 0,
            },
        )
        plan_bucket["active"] += 1

        if ai_used > 0 or studio_used > 0:
            active_using += 1
            plan_bucket["using"] += 1
        else:
            active_never_used += 1
            plan_bucket["never_used"] += 1

        ai_exhausted = ai_limit > 0 and ai_used >= ai_limit
        studio_exhausted = studio_limit > 0 and studio_used >= studio_limit
        if ai_exhausted or studio_exhausted:
            plan_bucket["limit_exhausted"] += 1
            if len(limit_exhausted) < 50:
                u = sub.user
                limit_exhausted.append(
                    {
                        "user_id": sub.user_id,
                        "user_name": u.full_name or u.phone or u.email or "",
                        "plan_code": sub.plan_code,
                        "morph_ai_used": ai_used,
                        "morph_ai_limit": ai_limit,
                        "morph_studio_used": studio_used,
                        "morph_studio_limit": studio_limit,
                        "subscription_id": str(sub.pk),
                        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
                        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
                    }
                )

    # Sotib olgan lekin hech qachon Morph ishlatmagan
    lifetime_usage = {
        row["user_id"]: row["ai"] or 0
        for row in SubscriptionUsagePeriod.objects.values("user_id")
        .annotate(ai=Sum("morph_ai_used"))
        .filter(user_id__in=paid_user_ids or [0])
    }
    buyers_never_used = sum(1 for uid in paid_user_ids if lifetime_usage.get(uid, 0) <= 0)
    buyers_used = len(paid_user_ids) - buyers_never_used

    # Har oy sotib olish
    purchases_by_month_raw = (
        paid_qs.annotate(month=TruncMonth("paid_at"))
        .values("month")
        .annotate(
            count=Count("id"),
            buyers=Count("user_id", distinct=True),
            revenue_uzs=Sum("amount_uzs"),
        )
        .order_by("-month")[:18]
    )
    purchases_by_month = [
        {
            "month": (row["month"].date().isoformat() if row["month"] else None),
            "count": row["count"],
            "buyers": row["buyers"],
            "revenue_uzs": int(row["revenue_uzs"] or 0),
        }
        for row in purchases_by_month_raw
    ]

    # Yangilanish: 2+ marta to'laganlar
    renew_rows = list(
        paid_qs.values("user_id")
        .annotate(payments=Count("id"))
        .filter(payments__gte=2)
        .order_by("-payments")
    )
    renewers = len(renew_rows)
    payment_count_dist = {"1": 0, "2": 0, "3+": 0}
    for row in paid_qs.values("user_id").annotate(payments=Count("id")):
        n = int(row["payments"] or 0)
        if n <= 1:
            payment_count_dist["1"] += 1
        elif n == 2:
            payment_count_dist["2"] += 1
        else:
            payment_count_dist["3+"] += 1

    # Limit hit events (oxirgi 30 kun)
    since = now - timedelta(days=30)
    limit_hit_events = SubscriptionEvent.objects.filter(
        action=SubscriptionEvent.Action.LIMIT_HIT,
        created_at__gte=since,
    ).count()
    limit_hit_users_30d = (
        SubscriptionEvent.objects.filter(
            action=SubscriptionEvent.Action.LIMIT_HIT,
            created_at__gte=since,
        )
        .values("user_id")
        .distinct()
        .count()
    )

    # Faol obunalarning o'rtacha yoshi (kun)
    ages: list[int] = []
    for sub in active_qs.only("starts_at", "created_at").iterator(chunk_size=300):
        start_at = sub.starts_at or sub.created_at
        if start_at:
            ages.append(max(0, (now - start_at).days))
    avg_active_days = int(sum(ages) / len(ages)) if ages else 0

    return {
        "as_of": now.isoformat(),
        "period_start": period_start.isoformat(),
        "active_subscriptions": active_qs.count(),
        "active_using_morph": active_using,
        "active_never_used_morph": active_never_used,
        "limit_exhausted_count": sum(v["limit_exhausted"] for v in by_plan_active.values()),
        "limit_exhausted_users": limit_exhausted,
        "by_plan": sorted(by_plan_active.values(), key=lambda x: x["plan_code"]),
        "buyers_total": len(paid_user_ids),
        "buyers_used_morph": buyers_used,
        "buyers_never_used_morph": buyers_never_used,
        "renewers_count": renewers,
        "payment_count_distribution": payment_count_dist,
        "purchases_by_month": purchases_by_month,
        "limit_hit_events_30d": limit_hit_events,
        "limit_hit_users_30d": limit_hit_users_30d,
        "avg_active_subscription_days": avg_active_days,
        "top_renewers": [
            {"user_id": r["user_id"], "payments": r["payments"]} for r in renew_rows[:20]
        ],
    }