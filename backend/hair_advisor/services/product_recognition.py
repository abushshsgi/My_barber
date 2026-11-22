"""Product lookup: internal DB, external catalogs, HairProduct upsert."""

from __future__ import annotations

from typing import Any

from ai.models import CareProduct
from hair_advisor.models import HairProduct, ProductSource
from hair_advisor.services.catalog_sync import care_to_hair_product  # noqa: F401 — re-export


def lookup_by_barcode(barcode: str) -> dict[str, Any]:
    """Verified catalog first; external catalogs are hints only (no auto HairProduct)."""
    from hair_advisor.services.verified_catalog import lookup_verified_by_barcode

    verified = lookup_verified_by_barcode(barcode)
    if verified.get("found"):
        hp = verified.get("hair_product")
        care = verified.get("care_product")
        if hp and care:
            ProductSource.objects.get_or_create(
                product=hp,
                source_type=ProductSource.SourceType.INTERNAL,
                external_id=str(care.pk),
                defaults={"payload": {"source": "verified_db"}},
            )
        return {
            "found": True,
            "source": "verified",
            "tier": "verified",
            "care_product": care,
            "hair_product": hp,
            "ingredients": verified.get("ingredients") or [],
            "ingredients_text": verified.get("ingredients_text") or "",
            "verified_at": verified.get("verified_at"),
        }

    code = verified.get("barcode") or "".join(ch for ch in barcode if ch.isdigit())
    hint = verified.get("external_hint")
    return {
        "found": False,
        "source": None,
        "tier": "unknown",
        "barcode": code,
        "external_hint": hint,
    }


def rank_ocr_catalog_candidates(
    gemini_payload: dict[str, Any],
    *,
    limit: int = 8,
) -> tuple[list[CareProduct], dict[str, Any]]:
    """Deprecated entry — delegates to Hybrid V3 (kept for tests/callers)."""
    from hair_advisor.services.hybrid_recognition.pipeline import run_hybrid_image_recognition

    products, meta = run_hybrid_image_recognition(gemini_payload)
    return products[:limit], meta


def search_products(query: str, limit: int = 20) -> list[CareProduct]:
    from django.db.models import Q

    q = (query or "").strip()
    if len(q) < 2:
        return []
    return list(
        CareProduct.objects.filter(
            Q(is_published=True) & (Q(name__icontains=q) | Q(brand__icontains=q))
        ).order_by("sort_order", "name")[:limit]
    )