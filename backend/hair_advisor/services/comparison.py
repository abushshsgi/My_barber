"""Product comparison — conservative, evidence-aware."""

from __future__ import annotations

from typing import Any

from ai.models import CareProduct, HairCareProfile
from hair_advisor.services.ingredient_engine import build_deterministic_analysis, normalize_ingredient_list


def compare_care_products(
    products: list[CareProduct],
    profile: HairCareProfile | None,
) -> dict[str, Any]:
    if len(products) < 2:
        return {"error": "Kamida 2 ta mahsulot kerak."}

    rows: list[dict[str, Any]] = []
    limited = False
    for p in products:
        ingredients = normalize_ingredient_list(p.ingredients or p.ingredients_text)
        if not ingredients:
            limited = True
        det = build_deterministic_analysis(p, ingredients, profile)
        rows.append(
            {
                "care_product_id": p.pk,
                "name": p.name,
                "brand": p.brand,
                "recommendation": det.get("recommendation"),
                "safety_score": det.get("safety_score"),
                "ingredient_count": len(ingredients),
                "key_ingredients": det.get("key_ingredients") or [],
            }
        )

    note = ""
    if limited:
        note = "Ba'zi mahsulotlarda tarkib to'liq emas — solishtirish cheklangan."

    return {
        "products": rows,
        "summary_uz": _summary_uz(rows),
        "data_quality_note": note,
        "limitations": [
            "Solishtirish ingredient ro'yxatiga asoslangan; shaxsiy samaradorlik kafolatlanmaydi.",
        ],
    }


def _summary_uz(rows: list[dict[str, Any]]) -> str:
    names = [f"{r.get('brand', '')} {r.get('name', '')}".strip() for r in rows[:2]]
    if len(names) < 2:
        return "Solishtirish uchun yetarli ma'lumot yo'q."
    return (
        f"{names[0]} va {names[1]} tarkibi profilingiz bo'yicha har xil baholandi. "
        "To'liq qaror uchun ikkala mahsulotning INCI ro'yxati tekshirilgan bo'lishi kerak."
    )