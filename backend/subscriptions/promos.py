"""Morph obuna promokodlari — server-side (klient ishonchsiz)."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db.models import Q

from accounts.models import User
from subscriptions.models import SubscriptionPayment
from subscriptions.plans import get_plan

# Launch / CTA promokodlari
_PROMOS: dict[str, dict[str, Any]] = {
    "MORPH30": {
        "code": "MORPH30",
        "label_uz": "Morph ochilish — −30%",
        "discount_pct": Decimal("30"),
        "plans": ("starter", "plus", "pro"),
        "once_per_user": True,
        "active": True,
    },
}


def normalize_promo_code(raw: str | None) -> str:
    return (raw or "").strip().upper()


def get_promo(code: str | None) -> dict[str, Any] | None:
    key = normalize_promo_code(code)
    if not key:
        return None
    promo = _PROMOS.get(key)
    if not promo or not promo.get("active"):
        return None
    return dict(promo)


def list_public_promos() -> list[dict[str, Any]]:
    """Marketing CTA uchun ochiq kodlar (foiz + label)."""
    out = []
    for p in _PROMOS.values():
        if not p.get("active"):
            continue
        out.append(
            {
                "code": p["code"],
                "label_uz": p["label_uz"],
                "discount_pct": int(p["discount_pct"]),
            }
        )
    return out


def user_already_used_promo(*, user: User, promo_code: str) -> bool:
    code = normalize_promo_code(promo_code)
    if not code:
        return False
    return SubscriptionPayment.objects.filter(
        user=user,
        status=SubscriptionPayment.Status.PAID,
    ).filter(
        Q(metadata__promo_code=code) | Q(metadata__promo_code=code.lower())
    ).exists()


def resolve_checkout_price(
    *,
    plan_code: str,
    promo_code: str | None = None,
    user: User | None = None,
) -> dict[str, Any]:
    """
    Returns:
      plan_code, base_uzs, amount_uzs, discount_uzs, promo_code|None, promo_label|None
    Raises ValueError on invalid promo.
    """
    plan = get_plan(plan_code)
    if not plan:
        raise ValueError("Noto'g'ri obuna rejasi.")

    base = Decimal(plan["price_uzs"])
    raw = normalize_promo_code(promo_code)
    if not raw:
        return {
            "plan_code": plan_code,
            "base_uzs": int(base),
            "amount_uzs": int(base),
            "discount_uzs": 0,
            "discount_pct": 0,
            "promo_code": None,
            "promo_label": None,
        }

    promo = get_promo(raw)
    if not promo:
        raise ValueError("Promokod topilmadi yoki muddati tugagan.")

    if plan_code not in promo["plans"]:
        raise ValueError("Bu promokod ushbu tarif uchun emas.")

    if promo.get("once_per_user") and user is not None and user_already_used_promo(user=user, promo_code=raw):
        raise ValueError("Bu promokod allaqachon ishlatilgan.")

    pct = Decimal(promo["discount_pct"])
    discount = (base * pct / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    amount = max(Decimal("0"), base - discount)

    return {
        "plan_code": plan_code,
        "base_uzs": int(base),
        "amount_uzs": int(amount),
        "discount_uzs": int(discount),
        "discount_pct": int(pct),
        "promo_code": promo["code"],
        "promo_label": promo["label_uz"],
    }
