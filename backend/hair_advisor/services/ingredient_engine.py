"""Deterministic ingredient normalization and classification."""

from __future__ import annotations

from typing import Any

from ai.services.care_match import (
    enrich_ingredient_rows,
    parse_ingredients_text,
    score_against_hair,
    suitability_for_user,
)
from ai.services.care_match import INGREDIENT_ALIASES
from ai.services.ingredient_facts import ingredient_fact, is_known_fact
from hair_advisor.models import Ingredient, IngredientEvidence

FUNCTION_TAGS = frozenset(
    {
        "surfactant",
        "conditioning",
        "humectant",
        "emollient",
        "preservative",
        "fragrance",
        "chelating",
        "ph_adjuster",
        "film_forming",
        "protein",
        "oil_botanical",
        "other",
    }
)


def normalize_ingredient_list(raw: str | list[str] | None) -> list[str]:
    if isinstance(raw, list):
        items = [str(x).strip() for x in raw if str(x).strip()]
        if items:
            return items
    text = str(raw or "").strip()
    if not text:
        return []
    return parse_ingredients_text(text)


def classify_ingredient(inci: str) -> list[str]:
    fact = ingredient_fact(inci)
    if not fact:
        return ["other"]
    role = (fact.get("role") or "").lower()
    mapping = {
        "yuvuvchi": "surfactant",
        "yumshoq yuvuvchi": "surfactant",
        "yumshatuvchi": "conditioning",
        "namlagich": "humectant",
        "silliqlagich": "emollient",
        "emulsifier": "emollient",
        "hid": "fragrance",
        "konservant": "preservative",
        "ph": "ph_adjuster",
        "barqarorlashtirgich": "chelating",
        "protein": "protein",
        "yog": "oil_botanical",
        "bosh terisi": "other",
    }
    for key, tag in mapping.items():
        if key in role:
            return [tag]
    return ["other"]


def build_deterministic_analysis(
    product_like: Any,
    ingredients: list[str],
    profile: Any,
) -> dict[str, Any]:
    scored = score_against_hair(product_like, ingredients, profile, "")
    fit = suitability_for_user(product_like, profile) if product_like is not None else {}
    hair_fit = scored.get("hair_fit") if isinstance(scored.get("hair_fit"), dict) else {}
    rows = hair_fit.get("ingredients")
    if isinstance(rows, list) and rows:
        enrich_ingredient_rows(rows)

    recommendation = "INSUFFICIENT_DATA"
    readable = bool(scored.get("readable"))
    if not ingredients:
        recommendation = "INSUFFICIENT_DATA"
    elif readable:
        verdict = str(scored.get("verdict") or "")
        if verdict in ("good", "excellent"):
            recommendation = "POTENTIAL_MATCH"
        elif verdict in ("caution", "ok", "poor"):
            recommendation = "CAUTION"

    return {
        "recommendation": recommendation,
        "safety_score": scored.get("safety_score"),
        "verdict": scored.get("verdict"),
        "flags": scored.get("flags") or [],
        "ingredients_source": scored.get("ingredients_source") or "none",
        "readable": readable,
        "hair_fit": hair_fit,
        "catalog_fit": {
            "match_percent": fit.get("match_percent"),
            "fit_verdict": fit.get("fit_verdict"),
            "fit_reasons": fit.get("fit_reasons") or [],
        },
        "key_ingredients": [
            {
                "inci": row.get("name") or row.get("inci"),
                "functions": classify_ingredient(str(row.get("name") or "")),
                "note": row.get("note") or row.get("about"),
            }
            for row in (rows or [])[:12]
            if isinstance(row, dict)
        ],
        "limitations": [
            "Ingredient ro'yxati tahlili mahsulotning shaxsiy xavfsizligi yoki samaradorligini kafolatlamaydi.",
            "Jiddiy bosh terisi belgilari uchun dermatolog bilan maslahatlashish tavsiya etiladi.",
        ],
    }


def _canon_for_inci(inci: str) -> str:
    key = str(inci or "").strip().lower()
    if not key:
        return ""
    return INGREDIENT_ALIASES.get(key, key)


def attach_db_evidence(key_ingredients: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Attach IngredientEvidence rows when DB has curated data (no fabrication)."""
    out: list[dict[str, Any]] = []
    for row in key_ingredients:
        inci = str(row.get("inci") or "")
        canon = _canon_for_inci(inci)
        item: dict[str, Any] = {**row, "evidence": [], "known_fact": is_known_fact(canon)}
        if canon:
            ing = Ingredient.objects.filter(normalized_name=canon).first()
            if ing is not None:
                ev_rows = (
                    IngredientEvidence.objects.filter(ingredient=ing)
                    .order_by("-reviewed_at", "id")[:2]
                )
                item["evidence"] = [
                    {
                        "claim": e.claim,
                        "source_title": e.source_title,
                        "source_url": e.source_url,
                        "limitations": e.limitations,
                    }
                    for e in ev_rows
                ]
        out.append(item)
    return out