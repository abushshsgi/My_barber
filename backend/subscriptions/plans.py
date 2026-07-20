"""Server-side plan katalogi — narx va limitlar faqat shu yerda (klient ishonchsiz)."""

from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
from typing import Any

PLAN_STARTER = "starter"
PLAN_PLUS = "plus"
PLAN_PRO = "pro"

PLAN_CODES = (PLAN_STARTER, PLAN_PLUS, PLAN_PRO)

# Unlimited oila a'zolari uchun sentinel (DB/JSON da None saqlanadi).
FAMILY_UNLIMITED = None

_PLANS: dict[str, dict[str, Any]] = {
    PLAN_STARTER: {
        "code": PLAN_STARTER,
        "name_uz": "Starter",
        "name_ru": "Starter",
        "name_en": "Starter",
        "price_uzs": Decimal("19990"),
        "period_days": 30,
        "morph_ai_monthly": 10,
        "morph_studio_monthly": 0,
        "family_members_max": 0,
        "morph_care": False,
        "badge": "basic",
        "sort_order": 1,
        "highlight": False,
        "features": [
            {"key": "morph_ai", "label_uz": "Morph AI — oyiga 10 marta"},
            {"key": "badge", "label_uz": "Oddiy tasdiqlangan belgi"},
            {"key": "studio", "label_uz": "Morph AI Studio — yo'q", "included": False},
            {"key": "family", "label_uz": "Oila a'zolari — yo'q", "included": False},
            {"key": "care", "label_uz": "Morph AI Parvarish — yo'q", "included": False},
        ],
    },
    PLAN_PLUS: {
        "code": PLAN_PLUS,
        "name_uz": "Plus",
        "name_ru": "Plus",
        "name_en": "Plus",
        "price_uzs": Decimal("39990"),
        "period_days": 30,
        "morph_ai_monthly": 20,
        "morph_studio_monthly": 30,
        "family_members_max": 2,
        "morph_care": False,
        "badge": "plus",
        "sort_order": 2,
        "highlight": True,
        "features": [
            {"key": "morph_ai", "label_uz": "Morph AI — oyiga 20 marta"},
            {"key": "studio", "label_uz": "Morph AI Studio — 30 marta"},
            {"key": "family", "label_uz": "Oila a'zolari — 2 kishi (qo'shish va bron)"},
            {"key": "badge", "label_uz": "Premium tasdiqlangan belgi"},
            {"key": "care", "label_uz": "Morph AI Parvarish — yo'q", "included": False},
        ],
    },
    PLAN_PRO: {
        "code": PLAN_PRO,
        "name_uz": "Pro",
        "name_ru": "Pro",
        "name_en": "Pro",
        "price_uzs": Decimal("89990"),
        "period_days": 30,
        "morph_ai_monthly": 100,
        "morph_studio_monthly": 150,
        "family_members_max": FAMILY_UNLIMITED,
        "morph_care": True,
        "badge": "pro",
        "sort_order": 3,
        "highlight": False,
        "features": [
            {"key": "morph_ai", "label_uz": "Morph AI — oyiga 100 marta"},
            {"key": "studio", "label_uz": "Morph AI Studio — 150 marta"},
            {"key": "family", "label_uz": "Oila a'zolari — cheksiz qo'shish va bron"},
            {"key": "care", "label_uz": "Morph AI Parvarish"},
            {"key": "badge", "label_uz": "Eng yuqori tasdiqlangan belgi"},
            {"key": "priority", "label_uz": "Ustuvor qo'llab-quvvatlash"},
        ],
    },
}

REFERRAL_TRIAL_REQUIRED = 3
REFERRAL_TRIAL_DAYS = 7
REFERRAL_TRIAL_PLAN = PLAN_PLUS

# Yangi user — Morph AI umuman yo'q. Faqat pullik obuna yoki 3 referal → 7 kun trial.
FREE_MORPH_AI_MONTHLY = 0
FREE_MORPH_STUDIO_MONTHLY = 0


def get_plan(code: str) -> dict[str, Any] | None:
    plan = _PLANS.get((code or "").strip().lower())
    if not plan:
        return None
    return deepcopy(plan)


def list_plans() -> list[dict[str, Any]]:
    plans = [deepcopy(p) for p in _PLANS.values()]
    plans.sort(key=lambda p: p["sort_order"])
    return plans


def serialize_plan(plan: dict[str, Any]) -> dict[str, Any]:
    """API uchun JSON-safe plan."""
    out = deepcopy(plan)
    out["price_uzs"] = int(plan["price_uzs"])
    fam = plan.get("family_members_max")
    out["family_members_max"] = fam  # None = unlimited
    out["family_unlimited"] = fam is None
    return out


def plan_price(code: str) -> Decimal | None:
    plan = get_plan(code)
    if not plan:
        return None
    return Decimal(plan["price_uzs"])
