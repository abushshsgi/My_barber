"""Import verified ingredient facts from in-repo cosmetic chemistry dictionary."""

from __future__ import annotations

from ai.services.care_match import INGREDIENT_ALIASES
from ai.services.ingredient_facts import iter_curated_facts
from hair_advisor.models import Ingredient, IngredientEvidence


SOURCE_TITLE = "MySaloon INCI facts (internal)"
SOURCE_URL = ""
EVIDENCE_TYPE = "internal_curated"


def sync_ingredients_from_facts() -> dict[str, int]:
    """Populate Ingredient + IngredientEvidence from ingredient_facts.py (no invented data)."""
    created_ing = 0
    updated_ing = 0
    evidence_rows = 0

    for canon, row in iter_curated_facts():
        display = canon.replace("_", " ").title()
        synonyms = [k for k, v in INGREDIENT_ALIASES.items() if v == canon][:12]
        functions: list[str] = []
        role = str(row.get("role") or "")
        if role:
            functions.append(role)

        ing, was_created = Ingredient.objects.update_or_create(
            normalized_name=canon,
            defaults={
                "inci_name": display,
                "synonyms": synonyms,
                "ingredient_functions": functions,
                "description": str(row.get("about") or "")[:500],
                "evidence_status": "reviewed",
            },
        )
        if was_created:
            created_ing += 1
        else:
            updated_ing += 1

        claim = str(row.get("formula") or row.get("about") or "").strip()
        if claim:
            exists = IngredientEvidence.objects.filter(
                ingredient=ing,
                claim=claim[:280],
                source_title=SOURCE_TITLE,
            ).exists()
            if not exists:
                IngredientEvidence.objects.create(
                    ingredient=ing,
                    claim=claim[:280],
                    source_title=SOURCE_TITLE,
                    source_url=SOURCE_URL,
                    evidence_type=EVIDENCE_TYPE,
                    evidence_strength="moderate",
                    limitations="Kosmetik formul kontekstida; shaxsiy tibbiy xulosalar uchun emas.",
                )
                evidence_rows += 1

    return {
        "ingredients_created": created_ing,
        "ingredients_updated": updated_ing,
        "evidence_created": evidence_rows,
        "source": SOURCE_TITLE,
    }