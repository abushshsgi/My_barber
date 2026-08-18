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
        "price_uzs": Decimal("9990"),
        "period_days": 30,
        "morph_ai_monthly": 5,
        "morph_studio_monthly": 0,
        "morph_chat_tokens_monthly": 50_000,
        "family_members_max": 0,
        "morph_care": False,
        "badge": "basic",
        "sort_order": 1,
        "highlight": False,
        "features": [
            _feat("morph_ai", "Morph AI try-on — oyiga 5 marta", "Morph AI try-on — 5 раз в месяц", "Morph AI try-on — 5 times / month"),
            _feat("chat", "Morf AI chat — 50 000 token / oy", "Morf AI чат — 50 000 токенов / мес", "Morf AI chat — 50,000 tokens / month"),
            _feat("voice", "Jonli ovozli suhbat", "Живой голосовой чат", "Live voice chat"),
            _feat("badge", "Oddiy tasdiqlangan belgi", "Обычный значок подтверждения", "Standard verified badge"),
            _feat("studio", "Morph AI Studio — yo'q", "Morph AI Studio — нет", "Morph AI Studio — not included", included=False),
            _feat("family", "Oila a'zolari — yo'q", "Члены семьи — нет", "Family members — not included", included=False),
            _feat("care", "Morph AI Parvarish — yo'q", "Morph AI Уход — нет", "Morph AI Care — not included", included=False),
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
        "morph_chat_tokens_monthly": 150_000,
        "family_members_max": 2,
        "morph_care": False,
        "badge": "plus",
        "sort_order": 2,
        "highlight": True,
        "features": [
            _feat("morph_ai", "Morph AI try-on — oyiga 20 marta", "Morph AI try-on — 20 раз в месяц", "Morph AI try-on — 20 times / month"),
            _feat("chat", "Morf AI chat — 150 000 token / oy", "Morf AI чат — 150 000 токенов / мес", "Morf AI chat — 150,000 tokens / month"),
            _feat("voice", "Jonli ovozli suhbat", "Живой голосовой чат", "Live voice chat"),
            _feat("studio", "Morph AI Studio — 30 marta", "Morph AI Studio — 30 раз", "Morph AI Studio — 30 times"),
            _feat("family", "Oila a'zolari — 2 kishi (qo'shish va bron)", "Семья — 2 человека (добавить и записаться)", "Family members — 2 people (add and book)"),
            _feat("badge", "Premium tasdiqlangan belgi", "Премиум значок подтверждения", "Premium verified badge"),
            _feat("care", "Morph AI Parvarish — yo'q", "Morph AI Уход — нет", "Morph AI Care — not included", included=False),
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
        "morph_chat_tokens_monthly": 500_000,
        "family_members_max": FAMILY_UNLIMITED,
        "morph_care": True,
        "badge": "pro",
        "sort_order": 3,
        "highlight": False,
        "features": [
            _feat("morph_ai", "Morph AI try-on — oyiga 100 marta", "Morph AI try-on — 100 раз в месяц", "Morph AI try-on — 100 times / month"),
            _feat("chat", "Morf AI chat — 500 000 token / oy", "Morf AI чат — 500 000 токенов / мес", "Morf AI chat — 500,000 tokens / month"),
            _feat("voice", "Jonli ovozli suhbat", "Живой голосовой чат", "Live voice chat"),
            _feat("studio", "Morph AI Studio — 150 marta", "Morph AI Studio — 150 раз", "Morph AI Studio — 150 times"),
            _feat("family", "Oila a'zolari — cheksiz qo'shish va bron", "Семья — безлимитное добавление и запись", "Family members — unlimited add and book"),
            _feat("care", "Morph AI Parvarish", "Morph AI Уход", "Morph AI Care"),
            _feat("badge", "Eng yuqori tasdiqlangan belgi", "Максимальный значок подтверждения", "Highest verified badge"),
            _feat("priority", "Ustuvor qo'llab-quvvatlash", "Приоритетная поддержка", "Priority support"),
        ],
    },
}

# Yangi user — try-on yo'q, chat uchun 10k token.
FREE_MORPH_AI_MONTHLY = 0
FREE_MORPH_STUDIO_MONTHLY = 0
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
