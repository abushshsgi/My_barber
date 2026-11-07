"""Server-side plan katalogi — narx va limitlar faqat shu yerda (klient ishonchsiz)."""

from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
from typing import Any

PLAN_STARTER = "starter"
PLAN_PLUS = "plus"
PLAN_PRO = "pro"

PLAN_CODES = (PLAN_STARTER, PLAN_PLUS, PLAN_PRO)
PLAN_RANK = {
    PLAN_STARTER: 1,
    PLAN_PLUS: 2,
    PLAN_PRO: 3,
}
# Yagona narx. Ilova, preview va Payme shu so'mni ko'rsatadi. Chegirma qo'shilmaydi.
OFFICIAL_PRICE_UZS = {
    PLAN_STARTER: 9990,
    PLAN_PLUS: 29990,
    PLAN_PRO: 69990,
}

# Unlimited oila a'zolari uchun sentinel (DB/JSON da None saqlanadi).
FAMILY_UNLIMITED = None


def _feat(key: str, uz: str, ru: str, en: str, *, included: bool = True) -> dict[str, Any]:
    row: dict[str, Any] = {"key": key, "label_uz": uz, "label_ru": ru, "label_en": en}
    if not included:
        row["included"] = False
    return row


_PLANS: dict[str, dict[str, Any]] = {
    PLAN_STARTER: {
        "code": PLAN_STARTER,
        "name_uz": "Starter",
        "name_ru": "Starter",
        "name_en": "Starter",
        "price_uzs": Decimal(OFFICIAL_PRICE_UZS[PLAN_STARTER]),
        "period_days": 30,
        "morph_ai_monthly": 5,
        "morph_studio_monthly": 0,
        "morph_chat_tokens_monthly": 50_000,
        "family_members_max": 0,
        "morph_care": False,
        "morph_care_pro": False,
        "badge": "basic",
        "sort_order": 1,
        "highlight": False,
        "features": [
            _feat("morph_ai", "Morf AI try-on — oyiga 5 marta", "Morf AI try-on — 5 раз в месяц", "Morf AI try-on — 5 times / month"),
            _feat("chat", "Morf AI chat — 50 000 token / oy", "Morf AI чат — 50 000 токенов / мес", "Morf AI chat — 50,000 tokens / month"),
            _feat("studio", "Morf AI Studio — yo'q", "Morf AI Studio — нет", "Morf AI Studio — not included", included=False),
            _feat("care", "Parvarish, Tarkib, ob-havo — yo'q", "Уход, состав, погода — нет", "Care, scan, weather — not included", included=False),
            _feat("sos", "SOS va Javon — yo'q", "SOS и полка — нет", "SOS and Shelf — not included", included=False),
        ],
    },
    PLAN_PLUS: {
        "code": PLAN_PLUS,
        "name_uz": "Plus",
        "name_ru": "Plus",
        "name_en": "Plus",
        "price_uzs": Decimal(OFFICIAL_PRICE_UZS[PLAN_PLUS]),
        "period_days": 30,
        "morph_ai_monthly": 20,
        "morph_studio_monthly": 30,
        "morph_chat_tokens_monthly": 150_000,
        "family_members_max": 2,
        "morph_care": True,
        "morph_care_pro": False,
        "badge": "plus",
        "sort_order": 2,
        "highlight": True,
        "features": [
            _feat("morph_ai", "Morf AI try-on — oyiga 20 marta", "Morf AI try-on — 20 раз в месяц", "Morf AI try-on — 20 times / month"),
            _feat("chat", "Morf AI chat — 150 000 token / oy", "Morf AI чат — 150 000 токенов / мес", "Morf AI chat — 150,000 tokens / month"),
            _feat("studio", "Morf AI Studio — sochni AI tahriri (30 marta)", "Morf AI Studio — ИИ-редактор (30 раз)", "Morf AI Studio — AI edits (30 times)"),
            _feat("care", "Shaxsiy parvarish rejasi", "Личный план ухода", "Personal care plan"),
            _feat("scan", "Tarkib skani — mahsulot sizga mosmi", "Скан состава — подходит ли продукт", "Ingredient scan — does it fit you"),
            _feat("weather", "Ob-havo bo'yicha soch himoyasi", "Защита волос по погоде", "Weather-based hair protection"),
            _feat("growth", "Soch o'sish prognozi", "Прогноз роста волос", "Hair growth forecast"),
            _feat("sos", "SOS — faqat Pro", "SOS — только Pro", "SOS — Pro only", included=False),
            _feat("shelf", "Javon — faqat Pro", "Полка — только Pro", "Shelf — Pro only", included=False),
        ],
    },
    PLAN_PRO: {
        "code": PLAN_PRO,
        "name_uz": "Pro",
        "name_ru": "Pro",
        "name_en": "Pro",
        "price_uzs": Decimal(OFFICIAL_PRICE_UZS[PLAN_PRO]),
        "period_days": 30,
        "morph_ai_monthly": 100,
        "morph_studio_monthly": 150,
        "morph_chat_tokens_monthly": 500_000,
        "family_members_max": FAMILY_UNLIMITED,
        "morph_care": True,
        "morph_care_pro": True,
        "badge": "pro",
        "sort_order": 3,
        "highlight": False,
        "features": [
            _feat("morph_ai", "Morf AI try-on — oyiga 100 marta", "Morf AI try-on — 100 раз в месяц", "Morf AI try-on — 100 times / month"),
            _feat("chat", "Morf AI chat — 500 000 token / oy", "Morf AI чат — 500 000 токенов / мес", "Morf AI chat — 500,000 tokens / month"),
            _feat("studio", "Morf AI Studio — 150 ta tahrir", "Morf AI Studio — 150 правок", "Morf AI Studio — 150 edits"),
            _feat("care", "Shaxsiy parvarish rejasi", "Личный план ухода", "Personal care plan"),
            _feat("scan", "Tarkib skani — mahsulot sizga mosmi", "Скан состава — подходит ли продукт", "Ingredient scan — does it fit you"),
            _feat("weather", "Ob-havo bo'yicha soch himoyasi", "Защита волос по погоде", "Weather-based hair protection"),
            _feat("growth", "Soch o'sish prognozi", "Прогноз роста волос", "Hair growth forecast"),
            _feat("sos", "SOS — 60 soniyada yomon kun yechimi", "SOS — решение за 60 секунд", "SOS — 60-second bad-hair fix"),
            _feat("shelf", "Javon — mahsulot tugashini kuzatish", "Полка — когда закончится средство", "Shelf — refill tracker"),
        ],
    },
}

# Yangi user — 1 marta bepul try-on (umrbod); chat uchun bir martalik 10k token.
# Shu sanadan oldin ro‘yxatdan o‘tgan hisoblar bepul 1× olmaydi.
from datetime import datetime, timezone as dt_timezone

FREE_TRYON_LAUNCH_AT = datetime(2026, 10, 21, tzinfo=dt_timezone.utc)
FREE_MORPH_AI_MONTHLY = 0
FREE_MORPH_STUDIO_MONTHLY = 0
FREE_MORPH_TRYON = 1
FREE_MORPH_CHAT_TOKENS = 10_000
# Bitta chat javobi uchun minimal qoldiq (system prompt + javob).
CHAT_TOKEN_MIN_TURN = 200


def plan_rank(code: str) -> int:
    return PLAN_RANK.get((code or "").strip().lower(), 0)


def is_plan_upgrade(plan_code: str, active_code: str | None) -> bool:
    if not active_code:
        return True
    return plan_rank(plan_code) > plan_rank(active_code)


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
    out["price_uzs"] = official_price_uzs(str(plan["code"]))
    fam = plan.get("family_members_max")
    out["family_members_max"] = fam  # None = unlimited
    out["family_unlimited"] = fam is None
    return out


def official_price_uzs(code: str) -> int:
    """Payme va UI uchun yagona so'm. Boshqa summa yuborilmaydi."""
    key = (code or "").strip().lower()
    price = OFFICIAL_PRICE_UZS.get(key)
    if price is None:
        raise ValueError("Noto'g'ri obuna rejasi.")
    return int(price)


def plan_price(code: str) -> Decimal | None:
    key = (code or "").strip().lower()
    if key not in OFFICIAL_PRICE_UZS:
        return None
    return Decimal(OFFICIAL_PRICE_UZS[key])
