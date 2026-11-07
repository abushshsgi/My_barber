"""Obuna narxi — faqat katalog. Chegirma Payme summasini o'zgartirmaydi."""

from __future__ import annotations

from typing import Any

from accounts.models import User
from subscriptions.plans import get_plan, official_price_uzs


def get_new_user_offer(user: User | None, *, now=None) -> dict[str, Any] | None:
    """
    Chegirma o'chiq. Ilova va Payme bitta katalog narxini ko'rsatadi:
    Starter 9 990, Plus 29 990, Pro 69 990.
    """
    del user, now
    return None


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
    Yakuniy narx katalogdagi so'm. Promokod va yangi-hisob chegirmasi qo'llanmaydi.
    """
    del promo_code, user
    plan = get_plan(plan_code)
    if not plan:
        raise ValueError("Noto'g'ri obuna rejasi.")

    base = official_price_uzs(plan_code)
    return {
        "plan_code": plan_code,
        "base_uzs": base,
        "amount_uzs": base,
        "discount_uzs": 0,
        "discount_pct": 0,
        "promo_code": None,
        "promo_label": None,
        "ends_at": None,
        "seconds_left": None,
        "urgency_uz": None,
        "discount_kind": None,
    }
