"""Build customer-facing ingredient detail from curated DB + static facts."""

from __future__ import annotations

from typing import Any

from ai.services.care_match import INGREDIENT_ALIASES
from ai.services.ingredient_facts import ingredient_fact, is_known_fact
from hair_advisor.models import Ingredient, IngredientEvidence


def _canon(raw: str) -> str:
    key = str(raw or "").strip().lower()
    if not key:
        return ""
    return INGREDIENT_ALIASES.get(key, key)


def build_ingredient_detail(inci_query: str, product_name: str = "") -> dict[str, Any] | None:
    inci = str(inci_query or "").strip()
    if not inci:
        return None
    canon = _canon(inci)
    fact = ingredient_fact(canon)
    db = Ingredient.objects.filter(normalized_name=canon).first()
    if db is None and not canon:
        db = Ingredient.objects.filter(inci_name__iexact=inci).first()

    aliases: list[str] = []
    if db and isinstance(db.synonyms, list):
        aliases = [str(a) for a in db.synonyms if str(a).strip()]
    category = ""
    if db and isinstance(db.ingredient_functions, list) and db.ingredient_functions:
        category = str(db.ingredient_functions[0])

    evidence: list[dict[str, Any]] = []
    if db is not None:
        for ev in IngredientEvidence.objects.filter(ingredient=db).order_by("-reviewed_at", "id")[:4]:
            evidence.append(
                {
                    "claim": ev.claim,
                    "source_title": ev.source_title,
                    "limitations": ev.limitations,
                    "evidence_strength": ev.evidence_strength,
                }
            )

    role_uz = fact.get("role") or category or "Tarkib moddasi"
    what_uz = (db.description if db and db.description else fact.get("about")) or ""
    benefits_uz = fact.get("formula") or ""
    cautions: list[str] = []
    for ev in evidence:
        lim = str(ev.get("limitations") or "").strip()
        if lim:
            cautions.append(lim)

    return {
        "inci_name": db.inci_name if db else inci,
        "common_name": inci,
        "aliases": aliases,
        "category": category,
        "role_uz": role_uz,
        "what_uz": what_uz,
        "benefits_uz": benefits_uz,
        "cautions_uz": cautions[:3],
        "hair_uz": fact.get("formula") or "",
        "product_context_uz": (
            f"Ushbu mahsulotda ({product_name}) {inci} odatda {role_uz.lower()} vazifasini bajaradi."
            if product_name
            else f"{inci} odatda {role_uz.lower()} vazifasini bajaradi."
        ),
        "evidence": evidence,
        "evidence_status": db.evidence_status if db else ("curated" if is_known_fact(canon) else "limited"),
        "known_curated": is_known_fact(canon) or db is not None,
    }