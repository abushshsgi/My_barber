"""Full scan analysis pipeline."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from ai.models import CareProduct, HairCareProfile, IngredientScanEntry
from ai.usage_log import record_ai_generation
from ai.services.care_catalog_context import build_care_catalog_context
from ai.services.gemini_ingredient import analyze_ingredient_from_data_url
from django.core.files.base import ContentFile

from hair_advisor.models import HairAnalysis, HairScan
from hair_advisor.services.explanation import explain_analysis_uz
from hair_advisor.services.ingredient_engine import (
    attach_db_evidence,
    build_deterministic_analysis,
    normalize_ingredient_list,
)
from hair_advisor.services.product_recognition import care_to_hair_product


def _product_like(care: CareProduct | None, scan: HairScan) -> Any:
    if care is not None:
        return care
    if scan.product is not None:
        return SimpleNamespace(
            name=scan.product.name,
            brand=scan.product.brand,
            category=scan.product.category,
            suitable_for=[],
            not_suitable_for=[],
            scalp_types=[],
            concerns=[],
            ingredients=scan.ingredients_confirmed or scan.ingredients_draft,
            ingredients_text=scan.product.ingredient_list_raw,
            sort_order=0,
        )
    return None


def run_ocr_for_scan(scan: HairScan, image_data_url: str, profile: HairCareProfile, user) -> None:
    catalog_block = build_care_catalog_context()
    gender = (getattr(user, "gender", None) or "").strip().lower()
    result = analyze_ingredient_from_data_url(
        image_data_url,
        profile,
        catalog_block=catalog_block,
        gender=gender,
    )
    ingredients = result.get("ingredients") if isinstance(result.get("ingredients"), list) else []
    scan.ingredients_draft = normalize_ingredient_list(ingredients)
    analysis = result.get("product_analysis") if isinstance(result.get("product_analysis"), dict) else {}
    scan.search_query = str(analysis.get("product_name") or scan.search_query or "")[:160]
    if scan.product is None and isinstance(result.get("matched_product_id"), int):
        care = CareProduct.objects.filter(pk=result["matched_product_id"], is_published=True).first()
        if care:
            scan.care_product = care
            scan.product = care_to_hair_product(care)
    scan.status = HairScan.Status.NEEDS_CONFIRMATION
    scan.save(
        update_fields=[
            "ingredients_draft",
            "search_query",
            "care_product",
            "product",
            "status",
            "updated_at",
        ]
    )


def run_analysis_for_scan(scan: HairScan, profile: HairCareProfile, user) -> HairAnalysis:
    scan.status = HairScan.Status.ANALYZING
    scan.save(update_fields=["status", "updated_at"])

    ingredients = normalize_ingredient_list(scan.ingredients_confirmed or scan.ingredients_draft)
    care = scan.care_product
    if care is None and scan.product and scan.product.care_product_id:
        care = scan.product.care_product

    product_like = _product_like(care, scan)
    deterministic = build_deterministic_analysis(product_like, ingredients, profile)
    deterministic["evidence"] = attach_db_evidence(deterministic.get("key_ingredients") or [])

    profile_label = profile.profile_label((getattr(user, "gender", None) or "").strip().lower())
    explanation_payload, ai_usage = explain_analysis_uz(
        product_name=getattr(product_like, "name", "") if product_like else scan.search_query,
        brand=getattr(product_like, "brand", "") if product_like else "",
        deterministic=deterministic,
        profile_label=profile_label,
    )
    explanation_text = str(explanation_payload.get("explanation_uz") or "")

    confidence = "high" if ingredients and deterministic.get("readable") else "low"
    if not ingredients:
        confidence = "low"

    catalog_tier = "provisional"
    disclaimer_uz = "Bu dastlabki tahlil. Mahsulot tarkibi hali MySaloon tomonidan tasdiqlanmagan."
    hp = scan.product
    if care and getattr(care, "is_verified", False):
        catalog_tier = "verified"
        disclaimer_uz = (
            "Mahsulot ma'lumotlari MySaloon tomonidan tekshirilgan. "
            "Tekshiruv shaxsiy xavfsizlik yoki samaradorlik kafolati bermaydi."
        )
    elif hp and hp.data_quality_status == "verified":
        catalog_tier = "verified"
        disclaimer_uz = (
            "Mahsulot ma'lumotlari MySaloon tomonidan tekshirilgan. "
            "Tekshiruv shaxsiy xavfsizlik yoki samaradorlik kafolati bermaydi."
        )

    payload = {
        "product": {
            "name": getattr(product_like, "name", None) if product_like else scan.search_query,
            "brand": getattr(product_like, "brand", None) if product_like else "",
            "care_product_id": care.pk if care else None,
            "hair_product_id": scan.product_id,
            "barcode": scan.barcode,
        },
        "ingredient_count": len(ingredients),
        "ingredients": ingredients,
        **deterministic,
        "explanation": explanation_payload,
        "explanation_uz": explanation_text,
        "ai_usage": ai_usage,
        "catalog_tier": catalog_tier,
        "disclaimer_uz": disclaimer_uz,
    }

    analysis, _ = HairAnalysis.objects.update_or_create(
        scan=scan,
        defaults={
            "user": user,
            "recommendation": deterministic.get("recommendation", "INSUFFICIENT_DATA"),
            "result": payload,
            "explanation_uz": explanation_text,
            "data_confidence": confidence,
        },
    )

    if ai_usage:
        record_ai_generation(
            user_id=user.pk,
            kind="hair_advisor_explain",
            status="ok",
            model=str(ai_usage.get("model") or ""),
            latency_ms=int(ai_usage.get("latency_ms") or 0),
            prompt_tokens=int(ai_usage.get("prompt_tokens") or 0),
            candidates_tokens=int(ai_usage.get("candidates_tokens") or 0),
        )

    legacy = IngredientScanEntry.objects.create(
        user=user,
        extracted_name=str(payload["product"].get("name") or "")[:160],
        ingredients=ingredients,
        matched_product=care,
        verdict=deterministic.get("verdict") or "caution",
        safety_score=int(deterministic.get("safety_score") or 0),
        result=payload,
    )
    scan.legacy_scan = legacy
    scan.status = HairScan.Status.COMPLETED
    scan.save(update_fields=["legacy_scan", "status", "updated_at"])
    return analysis