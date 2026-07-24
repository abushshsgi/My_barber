"""Sartarosh / salon SaaS tariflari — narx va cheklovlar faqat serverda."""

from __future__ import annotations

from copy import deepcopy
from decimal import Decimal
from typing import Any

PLAN_START = "start"
PLAN_BUSINESS = "business"
PLAN_PRO = "pro"

PLAN_CODES = (PLAN_START, PLAN_BUSINESS, PLAN_PRO)

# Mashhur tarif
HIGHLIGHT_PLAN = PLAN_START

_PLANS: dict[str, dict[str, Any]] = {
    PLAN_START: {
        "code": PLAN_START,
        "name_uz": "Start",
        "name_ru": "Start",
        "name_en": "Start",
        "tagline_uz": "Bron, mijozlar va daromad — asosiy ish oqimi",
        "price_uzs": Decimal("99990"),
        "period_days": 30,
        "badge": "start",
        "sort_order": 1,
        "highlight": True,
        "popular_label_uz": "Eng mashhur",
        "entitlements": {
            "panel_access": True,
            "bookings": True,
            "calendar": True,
            "clients": True,
            "chat": True,
            "reviews": True,
            "portfolio": True,
            "earnings": True,
            "qr_pay": True,
            "withdrawals": True,
            "invites_monthly": 50,
            "expenses": False,
            "inventory": False,
            "stats_basic": True,
            "stats_graphs": False,
            "goals": False,
            "marketing": False,
            "marketing_boost_week_included": 0,
            "marketing_boost_month_included": 0,
            "team_seats": 2,
            "salon_gallery": True,
            "salon_amenities": True,
            "priority_support": False,
            "featured_listing": False,
        },
        "features": [
            {"key": "bookings", "label_uz": "Online bron va kalendar", "included": True},
            {"key": "clients", "label_uz": "Mijozlar CRM (asosiy)", "included": True},
            {"key": "earnings", "label_uz": "Daromad, QR to'lov, yechib olish", "included": True},
            {"key": "invites", "label_uz": "Mijoz chaqirish — oyiga 50 ta", "included": True},
            {"key": "stats", "label_uz": "Asosiy statistika", "included": True},
            {"key": "team", "label_uz": "Jamoa — 2 o'rin", "included": True},
            {"key": "expenses", "label_uz": "Xarajatlar va inventar", "included": False},
            {"key": "graphs", "label_uz": "Grafiklar va maqsadlar", "included": False},
            {"key": "marketing", "label_uz": "Marketing / TOP boost", "included": False},
        ],
    },
    PLAN_BUSINESS: {
        "code": PLAN_BUSINESS,
        "name_uz": "Business",
        "name_ru": "Business",
        "name_en": "Business",
        "tagline_uz": "Biznes nazorati — inventar, analitika, jamoa",
        "price_uzs": Decimal("149990"),
        "period_days": 30,
        "badge": "business",
        "sort_order": 2,
        "highlight": False,
        "popular_label_uz": "",
        "entitlements": {
            "panel_access": True,
            "bookings": True,
            "calendar": True,
            "clients": True,
            "chat": True,
            "reviews": True,
            "portfolio": True,
            "earnings": True,
            "qr_pay": True,
            "withdrawals": True,
            "invites_monthly": None,
            "expenses": True,
            "inventory": True,
            "stats_basic": True,
            "stats_graphs": True,
            "goals": True,
            "marketing": True,
            "marketing_boost_week_included": 1,
            "marketing_boost_month_included": 0,
            "team_seats": 8,
            "salon_gallery": True,
            "salon_amenities": True,
            "priority_support": True,
            "featured_listing": False,
        },
        "features": [
            {"key": "all_start", "label_uz": "Start dagi barcha imkoniyatlar", "included": True},
            {"key": "invites", "label_uz": "Mijoz chaqirish — cheksiz", "included": True},
            {"key": "expenses", "label_uz": "Xarajatlar va inventar", "included": True},
            {"key": "graphs", "label_uz": "To'liq statistika + grafikler", "included": True},
            {"key": "goals", "label_uz": "Maqsadlar", "included": True},
            {"key": "team", "label_uz": "Jamoa — 8 o'rin", "included": True},
            {"key": "marketing", "label_uz": "Marketing + 1 haftalik TOP / oy", "included": True},
            {"key": "support", "label_uz": "Ustuvor qo'llab-quvvatlash", "included": True},
            {"key": "featured", "label_uz": "Katalogda Pro belgi", "included": False},
        ],
    },
    PLAN_PRO: {
        "code": PLAN_PRO,
        "name_uz": "Pro",
        "name_ru": "Pro",
        "name_en": "Pro",
        "tagline_uz": "To'liq o'sish — cheksiz jamoa va ustuvor joylashuv",
        "price_uzs": Decimal("199990"),
        "period_days": 30,
        "badge": "pro",
        "sort_order": 3,
        "highlight": False,
        "popular_label_uz": "",
        "entitlements": {
            "panel_access": True,
            "bookings": True,
            "calendar": True,
            "clients": True,
            "chat": True,
            "reviews": True,
            "portfolio": True,
            "earnings": True,
            "qr_pay": True,
            "withdrawals": True,
            "invites_monthly": None,
            "expenses": True,
            "inventory": True,
            "stats_basic": True,
            "stats_graphs": True,
            "goals": True,
            "marketing": True,
            "marketing_boost_week_included": 0,
            "marketing_boost_month_included": 1,
            "team_seats": None,
            "salon_gallery": True,
            "salon_amenities": True,
            "priority_support": True,
            "featured_listing": True,
        },
        "features": [
            {"key": "all_biz", "label_uz": "Business dagi barcha imkoniyatlar", "included": True},
            {"key": "team", "label_uz": "Jamoa — cheksiz", "included": True},
            {"key": "marketing", "label_uz": "1 oylik TOP joylashuv / oy", "included": True},
            {"key": "featured", "label_uz": "Katalogda Pro / ustuvor belgi", "included": True},
            {"key": "support", "label_uz": "Eng yuqori ustuvorlik", "included": True},
            {"key": "analytics", "label_uz": "To'liq analitika va maqsadlar", "included": True},
        ],
    },
}


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
    out = deepcopy(plan)
    out["price_uzs"] = int(plan["price_uzs"])
    ents = out.get("entitlements") or {}
    out["invites_unlimited"] = ents.get("invites_monthly") is None
    out["team_unlimited"] = ents.get("team_seats") is None
    return out


def plan_price(code: str) -> Decimal | None:
    plan = get_plan(code)
    if not plan:
        return None
    return Decimal(plan["price_uzs"])


def entitlement_snapshot(plan_code: str) -> dict[str, Any]:
    plan = get_plan(plan_code)
    if not plan:
        return {}
    ents = deepcopy(plan["entitlements"])
    ents["plan_code"] = plan["code"]
    ents["badge"] = plan["badge"]
    ents["period_days"] = plan["period_days"]
    return ents
