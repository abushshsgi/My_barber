"""Morph obuna promokodlari — server-side (klient ishonchsiz)."""

from __future__ import annotations

from datetime import datetime, timezone as dt_timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from subscriptions.models import SubscriptionPayment
from subscriptions.plans import get_plan

# Launch / CTA promokodlari — muddatli (urgency).
# MORPH30: 2026-07-28 23:59:59 Asia/Tashkent ≈ UTC+5
_MORPH30_ENDS = datetime(2026, 7, 28, 18, 59, 59, tzinfo=dt_timezone.utc)

_PROMOS: dict[str, dict[str, Any]] = {
    "MORPH30": {
        "code": "MORPH30",
        "label_uz": "Morph ochilish — −30%",
        "urgency_uz": "Ulgutib qoling — muddat tugayapti",
        "discount_pct": Decimal("30"),
        "plans": ("starter", "plus", "pro"),
        "once_per_user": True,
        "active": True,
        "ends_at": _MORPH30_ENDS,
    },
}


def normalize_promo_code(raw: str | None) -> str:
    return (raw or "").strip().upper()


def _promo_still_valid(promo: dict[str, Any], *, now=None) -> bool:
    if not promo.get("active"):
        return False
    ends = promo.get("ends_at")
    if ends is None:
        return True
    now = now or timezone.now()
    if timezone.is_naive(ends):
        ends = timezone.make_aware(ends, dt_timezone.utc)
    return now <= ends


def get_promo(code: str | None) -> dict[str, Any] | None:
    key = normalize_promo_code(code)
    if not key:
        return None
    promo = _PROMOS.get(key)
    if not promo or not _promo_still_valid(promo):
        return None
    return dict(promo)


def _serialize_public_promo(p: dict[str, Any], *, now=None) -> dict[str, Any] | None:
    now = now or timezone.now()
    if not _promo_still_valid(p, now=now):
        return None
    ends = p.get("ends_at")
    ends_iso = None
    seconds_left = None
    if ends is not None:
        if timezone.is_naive(ends):
            ends = timezone.make_aware(ends, dt_timezone.utc)
        ends_iso = ends.isoformat()
        seconds_left = max(0, int((ends - now).total_seconds()))
    return {
        "code": p["code"],
        "label_uz": p["label_uz"],
        "urgency_uz": p.get("urgency_uz") or "Ulgutib qoling",
        "discount_pct": int(p["discount_pct"]),
        "ends_at": ends_iso,
        "seconds_left": seconds_left,
    }


def list_public_promos() -> list[dict[str, Any]]:
    """Marketing CTA uchun ochiq kodlar (foiz + muddat)."""
    now = timezone.now()
    out: list[dict[str, Any]] = []
    for p in _PROMOS.values():
        row = _serialize_public_promo(p, now=now)
        if row:
            out.append(row)
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
    Returns priced checkout payload.
    Raises ValueError on invalid / expired promo.
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
            "ends_at": None,
            "seconds_left": None,
            "urgency_uz": None,
        }

    raw_promo = _PROMOS.get(raw)
    if not raw_promo:
        raise ValueError("Promokod topilmadi.")
    if not _promo_still_valid(raw_promo):
        raise ValueError("Promokod muddati tugagan — ulgutib qolmadingiz.")

    promo = dict(raw_promo)

    if plan_code not in promo["plans"]:
        raise ValueError("Bu promokod ushbu tarif uchun emas.")

    if promo.get("once_per_user") and user is not None and user_already_used_promo(user=user, promo_code=raw):
        raise ValueError("Bu promokod allaqachon ishlatilgan.")

    pct = Decimal(promo["discount_pct"])
    discount = (base * pct / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    amount = max(Decimal("0"), base - discount)
    public = _serialize_public_promo(promo) or {}

    return {
        "plan_code": plan_code,
        "base_uzs": int(base),
        "amount_uzs": int(amount),
        "discount_uzs": int(discount),
        "discount_pct": int(pct),
        "promo_code": promo["code"],
        "promo_label": promo["label_uz"],
        "ends_at": public.get("ends_at"),
        "seconds_left": public.get("seconds_left"),
        "urgency_uz": public.get("urgency_uz"),
    }
