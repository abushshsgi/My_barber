"""Verified product catalog lookup — never treats external APIs as verified."""

from __future__ import annotations

from typing import Any

from ai.models import CareProduct
from ai.services.barcode_country import barcode_variants
from ai.services.product_barcode_lookup import find_product_by_barcode, lookup_external_product
from django.core.cache import cache
from django.db.models import Q

from hair_advisor.models import HairProduct, ProductBarcode, ProductFormula
from hair_advisor.services.catalog_sync import care_to_hair_product

CACHE_TTL = 3600
CACHE_PREFIX = "hair_advisor:verified_barcode:"


def invalidate_verified_barcode_cache(barcode: str) -> None:
    code = "".join(ch for ch in (barcode or "") if ch.isdigit())
    if not code:
        return
    for variant in barcode_variants(code):
        cache.delete(f"{CACHE_PREFIX}{variant}")


def _active_verified_formula(product: HairProduct) -> ProductFormula | None:
    return (
        ProductFormula.objects.filter(
            product=product,
            verification_status=ProductFormula.VerificationStatus.VERIFIED,
        )
        .order_by("-verified_at", "-created_at")
        .first()
    )


def _care_is_verified(care: CareProduct) -> bool:
    return bool(care.is_published and care.is_verified)


def lookup_verified_by_barcode(barcode: str) -> dict[str, Any]:
    code = "".join(ch for ch in (barcode or "") if ch.isdigit())
    if not code:
        return {"found": False, "tier": "unknown", "barcode": code}

    cached = cache.get(f"{CACHE_PREFIX}{code}")
    if isinstance(cached, dict) and cached.get("found"):
        return cached

    variants = barcode_variants(code)
    care = None
    if variants:
        care = (
            CareProduct.objects.filter(Q(barcode__in=variants) & Q(is_published=True) & Q(is_verified=True))
            .order_by("sort_order")
            .first()
        )

    hp: HairProduct | None = None
    if care is not None:
        hp = care_to_hair_product(care)
        if hp.data_quality_status != HairProduct.DataQuality.VERIFIED:
            hp.data_quality_status = HairProduct.DataQuality.VERIFIED
            hp.save(update_fields=["data_quality_status", "updated_at"])
    else:
        for variant in variants:
            link = (
                ProductBarcode.objects.filter(barcode=variant, product__data_quality_status=HairProduct.DataQuality.VERIFIED)
                .select_related("product")
                .first()
            )
            if link:
                hp = link.product
                break
        if hp is None:
            hp = HairProduct.objects.filter(
                barcode__in=variants,
                data_quality_status=HairProduct.DataQuality.VERIFIED,
            ).first()

    if hp is None and care is None:
        legacy_care = find_product_by_barcode(code)
        if legacy_care and _care_is_verified(legacy_care):
            care = legacy_care
            hp = care_to_hair_product(care)

    if hp is None and care is None:
        external = lookup_external_product(code)
        payload = None
        if external:
            payload = {
                "source": external.get("source"),
                "name": external.get("name"),
                "brand": external.get("brand"),
                "ingredients_text": external.get("ingredients_text") or "",
            }
        return {
            "found": False,
            "tier": "unknown",
            "barcode": code,
            "external_hint": payload,
        }

    formula = _active_verified_formula(hp) if hp else None
    ingredients: list[str] = []
    ingredients_text = ""
    if formula and formula.normalized_inci:
        ingredients = list(formula.normalized_inci)
        ingredients_text = formula.raw_inci or ""
    elif hp:
        ingredients = hp.ingredient_list_normalized if isinstance(hp.ingredient_list_normalized, list) else []
        ingredients_text = hp.ingredient_list_raw or ""
    if care and not ingredients:
        ingredients = care.ingredients if isinstance(care.ingredients, list) else []
        ingredients_text = care.ingredients_text or ingredients_text

    result = {
        "found": True,
        "tier": "verified",
        "barcode": code,
        "care_product": care,
        "hair_product": hp,
        "formula": formula,
        "ingredients": ingredients,
        "ingredients_text": ingredients_text,
        "verified_at": (hp.verified_at.isoformat() if hp and hp.verified_at else None),
    }
    cache.set(f"{CACHE_PREFIX}{code}", result, CACHE_TTL)
    return result