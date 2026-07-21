"""Yangi foydalanuvchi uchun 1 kunlik chegirma — promokod yo'q, server avtomatik."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.utils import timezone

from accounts.models import User
from subscriptions.models import SubscriptionPayment
from subscriptions.plans import get_plan

# Yangi hisob: ro'yxatdan o'tgandan keyin 24 soat ichida 2–3 tarifga −30%.
NEW_USER_DISCOUNT_PCT = Decimal("30")
NEW_USER_WINDOW = timedelta(hours=24)
NEW_USER_PLANS = ("starter", "plus", "pro")
# Admin audit uchun ichki belgi (foydalanuvchiga ko'rsatilmaydi).
NEW_USER_OFFER_KEY = "NEW_USER"


def _user_joined_at(user: User):
    joined = getattr(user, "date_joined", None)
    if joined is None:
        return None
    if timezone.is_naive(joined):
        return timezone.make_aware(joined)
    return joined


def user_has_paid_subscription(user: User) -> bool:
    return SubscriptionPayment.objects.filter(
        user=user,
        status=SubscriptionPayment.Status.PAID,
    ).exists()


def get_new_user_offer(user: User | None, *, now=None) -> dict[str, Any] | None:
    """
    Yangi user — 24 soat ichida, hali hech qachon to'lov qilmagan.
    Promokod kiritish shart emas: checkoutda avtomatik qo'llanadi.
    """
    if user is None:
        return None
    now = now or timezone.now()
    joined = _user_joined_at(user)
    if joined is None:
        return None
    ends_at = joined + NEW_USER_WINDOW
    if now > ends_at:
        return None
    if user_has_paid_subscription(user):
        return None

    seconds_left = max(0, int((ends_at - now).total_seconds()))
    return {
        "eligible": True,
        "discount_pct": int(NEW_USER_DISCOUNT_PCT),
        "plans": list(NEW_USER_PLANS),
        "ends_at": ends_at.isoformat(),
        "seconds_left": seconds_left,
        "label_uz": f"Yangi hisob — −{int(NEW_USER_DISCOUNT_PCT)}%",
        "hint_uz": "Birinchi 24 soat ichida tanlangan tariflarga chegirma.",
    }


def list_public_promos() -> list[dict[str, Any]]:
    """Eski promokod API — bo'sh (kodlar olib tashlangan)."""
    return []


def resolve_checkout_price(
    *,
    plan_code: str,
    promo_code: str | None = None,
    user: User | None = None,
) -> dict[str, Any]:
    """
    Yakuniy narx. `promo_code` e'tiborsiz — chegirma faqat yangi user offeridan.
    """
    del promo_code  # klient ishonchsiz; kodlar yo'q
    plan = get_plan(plan_code)
    if not plan:
        raise ValueError("Noto'g'ri obuna rejasi.")

    base = Decimal(plan["price_uzs"])
    empty = {
        "plan_code": plan_code,
        "base_uzs": int(base),
        "amount_uzs": int(base),
        "discount_uzs": 0,
        "discount_pct": 0,
        "promo_code": None,
        "promo_label": None,
        "ends_at": None,
        "seconds_left": None,
        "urgency_uz": None,
        "discount_kind": None,
    }

    offer = get_new_user_offer(user)
    if not offer or plan_code not in NEW_USER_PLANS:
        return empty

    pct = NEW_USER_DISCOUNT_PCT
    discount = (base * pct / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    amount = max(Decimal("0"), base - discount)

    return {
        "plan_code": plan_code,
        "base_uzs": int(base),
        "amount_uzs": int(amount),
        "discount_uzs": int(discount),
        "discount_pct": int(pct),
        # Admin monitoring uchun ichki kalit; UI da kod sifatida ko'rsatilmaydi.
        "promo_code": NEW_USER_OFFER_KEY,
        "promo_label": offer["label_uz"],
        "ends_at": offer["ends_at"],
        "seconds_left": offer["seconds_left"],
        "urgency_uz": None,
        "discount_kind": "new_user",
    }
