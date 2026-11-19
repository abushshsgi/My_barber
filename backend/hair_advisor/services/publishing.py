"""Publish admin-approved candidates into the verified catalog."""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from ai.models import CareProduct
from hair_advisor.models import (
    HairProduct,
    ProductBarcode,
    ProductCandidate,
    ProductFormula,
    ProductVerification,
)
from hair_advisor.services.ingredient_engine import normalize_ingredient_list
from hair_advisor.services.verified_catalog import invalidate_verified_barcode_cache


def _unique_slug(name: str, brand: str = "") -> str:
    base = slugify(f"{brand}-{name}" if brand else name) or "product"
    slug = base[:170]
    n = 0
    while CareProduct.objects.filter(slug=slug).exists():
        n += 1
        slug = f"{base[:160]}-{n}"
    return slug


@transaction.atomic
def publish_candidate(
    candidate: ProductCandidate,
    reviewer=None,
    *,
    corrected_fields: dict[str, Any] | None = None,
    review_notes: str = "",
    admin_meta: dict[str, Any] | None = None,
) -> HairProduct:
    if candidate.status == ProductCandidate.Status.APPROVED and candidate.published_product_id:
        return candidate.published_product

    fields = {**(corrected_fields or {})}
    brand = fields.get("brand") or candidate.proposed_brand
    name = fields.get("name") or candidate.proposed_product_name
    variant = fields.get("variant") or candidate.proposed_variant
    barcode = fields.get("barcode") or candidate.proposed_barcode
    size = fields.get("size") or candidate.proposed_size
    category = fields.get("category") or candidate.proposed_category or "shampoo"
    manufacturer = fields.get("manufacturer") or candidate.proposed_manufacturer
    manufacturing_country = fields.get("manufacturing_country") or candidate.proposed_manufacturing_country
    target_market = fields.get("target_market") or candidate.proposed_target_market

    evidence = candidate.proposed_field_evidence or {}
    inci_key = evidence.get("inci_consensus_key")
    inci_lists = evidence.get("inci_lists") or {}
    raw_inci = fields.get("raw_inci") or ""
    normalized = normalize_ingredient_list(fields.get("ingredients") or inci_lists.get(inci_key, []))

    care = candidate.published_product.care_product if candidate.published_product else None
    if care is None:
        care = CareProduct.objects.create(
            name=name[:160],
            brand=brand[:120],
            slug=_unique_slug(name, brand),
            category=category,
            barcode=barcode or None,
            ingredients_text=raw_inci or ", ".join(normalized),
            ingredients=normalized,
            is_verified=True,
            is_published=True,
            country_of_origin=manufacturing_country[:80],
        )
    else:
        care.name = name[:160]
        care.brand = brand[:120]
        care.barcode = barcode or care.barcode
        care.ingredients_text = raw_inci or ", ".join(normalized)
        care.ingredients = normalized
        care.is_verified = True
        care.is_published = True
        care.country_of_origin = manufacturing_country[:80] or care.country_of_origin
        care.save()

    hp = candidate.published_product
    if hp is None:
        hp = HairProduct.objects.create(
            care_product=care,
            barcode=barcode or "",
            brand=brand,
            name=name,
            product_variant=variant,
            size=size,
            category=category,
            manufacturer=manufacturer,
            manufacturing_country=manufacturing_country,
            target_market=target_market,
            ingredient_list_raw=raw_inci or ", ".join(normalized),
            ingredient_list_normalized=normalized,
            data_quality_status=HairProduct.DataQuality.VERIFIED,
            verified_by=reviewer,
            verified_at=timezone.now(),
        )
    else:
        hp.barcode = barcode or hp.barcode
        hp.brand = brand
        hp.name = name
        hp.product_variant = variant
        hp.size = size
        hp.manufacturer = manufacturer
        hp.manufacturing_country = manufacturing_country
        hp.ingredient_list_raw = raw_inci or ", ".join(normalized)
        hp.ingredient_list_normalized = normalized
        hp.data_quality_status = HairProduct.DataQuality.VERIFIED
        hp.verified_by = reviewer
        hp.verified_at = timezone.now()
        hp.save()

    if barcode:
        ProductBarcode.objects.get_or_create(
            product=hp,
            barcode=barcode,
            defaults={"is_primary": True, "source": "admin_verify"},
        )
        invalidate_verified_barcode_cache(barcode)

    formula = ProductFormula.objects.create(
        product=hp,
        formula_version=timezone.now().strftime("%Y%m%d%H%M"),
        raw_inci=raw_inci or ", ".join(normalized),
        normalized_inci=normalized,
        target_market=target_market,
        source="admin_verification",
        verification_status=ProductFormula.VerificationStatus.VERIFIED,
        verified_by=reviewer,
        verified_at=timezone.now(),
    )

    evidence_log = list(evidence.get("fields", {}).items()) if isinstance(evidence, dict) else []
    if admin_meta:
        evidence_log.append({"admin_meta": admin_meta})

    ProductVerification.objects.create(
        candidate=candidate,
        reviewer=reviewer,
        decision=ProductVerification.Decision.APPROVE,
        corrected_fields=fields,
        review_notes=review_notes,
        evidence_reviewed=evidence_log,
    )

    candidate.status = ProductCandidate.Status.APPROVED
    candidate.published_product = hp
    candidate.proposed_formula = formula
    candidate.save(
        update_fields=["status", "published_product", "proposed_formula", "updated_at"]
    )
    return hp