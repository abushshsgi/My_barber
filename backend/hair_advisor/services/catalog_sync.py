"""Sync HairProduct rows with CareProduct catalog."""

from __future__ import annotations

from ai.models import CareProduct

from hair_advisor.models import HairProduct


def care_to_hair_product(care: CareProduct) -> HairProduct:
    hp, _ = HairProduct.objects.get_or_create(
        care_product=care,
        defaults={
            "barcode": care.barcode or "",
            "brand": care.brand or "",
            "name": care.name,
            "category": care.category or "",
            "ingredient_list_raw": care.ingredients_text or "",
            "ingredient_list_normalized": care.ingredients if isinstance(care.ingredients, list) else [],
            "data_quality_status": HairProduct.DataQuality.VERIFIED
            if care.is_verified
            else HairProduct.DataQuality.PARTIAL,
        },
    )
    changed = False
    if care.barcode and hp.barcode != care.barcode:
        hp.barcode = care.barcode
        changed = True
    if changed:
        hp.save(update_fields=["barcode"])
    return hp