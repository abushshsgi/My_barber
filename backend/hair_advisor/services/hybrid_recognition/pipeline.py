"""Hybrid Scanner V3 — OCR / image recognition pipeline (stages B–E)."""

from __future__ import annotations

import time
from typing import Any

from ai.models import CareProduct

from . import constants
from .analytics import recognition_analytics_block
from .normalize import parse_ocr_signals
from .search import expand_candidates_if_sparse, retrieve_catalog_candidates
from .verify import classify_from_scores, score_product_match, validate_ai_product_id, verify_candidate_list


def _image_quality_insufficient(gemini_payload: dict) -> bool:
    ingredients = gemini_payload.get("ingredients")
    has_ingredients = isinstance(ingredients, list) and len(ingredients) > 0
    signals = parse_ocr_signals(gemini_payload)
    has_label = bool(signals["brand_norm"] or signals["name_norm"])
    if gemini_payload.get("image_quality_insufficient") is True:
        return True
    if not has_ingredients and not has_label:
        return True
    return False


def _ui_message_key(status: str) -> str:
    return {
        constants.EXACT_MATCH: "product_identified",
        constants.PROBABLE_MATCH: "confirm_product",
        constants.AMBIGUOUS: "similar_products",
        constants.NOT_FOUND: "product_not_identified",
        constants.INSUFFICIENT_IMAGE_QUALITY: "image_quality_low",
        constants.SERVICE_UNAVAILABLE: "service_unavailable",
    }.get(status, "product_not_identified")


def run_hybrid_image_recognition(
    gemini_payload: dict[str, Any],
    *,
    scan_method: str = "camera_label",
    started_at: float | None = None,
) -> tuple[list[CareProduct], dict[str, Any]]:
    t0 = started_at if started_at is not None else time.perf_counter()
    if _image_quality_insufficient(gemini_payload):
        status = constants.INSUFFICIENT_IMAGE_QUALITY
        latency = int((time.perf_counter() - t0) * 1000)
        meta = _build_meta(
            status=status,
            signals=parse_ocr_signals(gemini_payload),
            scored=[],
            candidates=[],
            ai_validated_id=None,
            gemini_payload=gemini_payload,
            scan_method=scan_method,
            latency_ms=latency,
            ai_fallback_used=True,
        )
        return [], meta

    signals = parse_ocr_signals(gemini_payload)
    raw_list = retrieve_catalog_candidates(
        brand_norm=signals["brand_norm"],
        name_norm=signals["name_norm"],
        combined_norm=signals["combined_norm"],
        volume_ml=signals.get("volume_ml"),
        limit=constants.MAX_CANDIDATES,
    )
    raw_list = expand_candidates_if_sparse(raw_list, signals, limit=constants.MAX_CANDIDATES)

    matched_raw = gemini_payload.get("matched_product_id")
    if matched_raw and raw_list:
        mid = validate_ai_product_id(matched_raw, verify_candidate_list(signals, raw_list))
        if mid is None:
            extra = CareProduct.objects.filter(pk=matched_raw, is_published=True).first()
            if extra and extra not in raw_list:
                raw_list = [extra, *raw_list][: constants.MAX_CANDIDATES]

    scored = verify_candidate_list(signals, raw_list)
    ai_validated = validate_ai_product_id(matched_raw, scored) if scored else None

    if not scored and (signals["brand_norm"] or signals["name_norm"]):
        expanded = expand_candidates_if_sparse([], signals, limit=constants.MAX_CANDIDATES)
        scored = verify_candidate_list(signals, expanded)

    status = classify_from_scores(scored)
    candidates = [s.product for s in scored[: constants.MAX_CANDIDATES]]

    if ai_validated and status in (constants.AMBIGUOUS, constants.PROBABLE_MATCH):
        top = score_product_match(signals, next(c for c in candidates if c.pk == ai_validated))
        if top.score >= constants.EXACT_SCORE and not top.volume_conflict:
            status = constants.EXACT_MATCH
        elif top.score >= constants.PROBABLE_SCORE:
            status = constants.PROBABLE_MATCH

    if status == constants.NOT_FOUND and scored and scored[0].score >= constants.MIN_CANDIDATE_SCORE:
        status = constants.PROBABLE_MATCH if len(scored) == 1 else constants.AMBIGUOUS

    if not candidates and status not in (constants.INSUFFICIENT_IMAGE_QUALITY, constants.SERVICE_UNAVAILABLE):
        status = constants.NOT_FOUND

    latency = int((time.perf_counter() - t0) * 1000)
    meta = _build_meta(
        status=status,
        signals=signals,
        scored=scored,
        candidates=candidates,
        ai_validated_id=ai_validated,
        gemini_payload=gemini_payload,
        scan_method=scan_method,
        latency_ms=latency,
        ai_fallback_used=True,
    )
    return candidates, meta


def _build_meta(
    *,
    status: str,
    signals: dict,
    scored: list,
    candidates: list[CareProduct],
    ai_validated_id: int | None,
    gemini_payload: dict,
    scan_method: str,
    latency_ms: int,
    ai_fallback_used: bool,
) -> dict[str, Any]:
    verified_id = None
    if status == constants.EXACT_MATCH and len(candidates) == 1:
        verified_id = candidates[0].pk
    elif ai_validated_id and status == constants.EXACT_MATCH:
        verified_id = ai_validated_id

    return {
        "recognition_status": status,
        "v3_status": status,
        "scan_method": scan_method,
        "candidate_ids": [c.pk for c in candidates],
        "candidate_scores": {str(s.product.pk): s.score for s in scored[:8]},
        "ocr_brand": signals.get("brand") or "",
        "ocr_product_name": signals.get("product_name") or "",
        "ocr_volume_ml": signals.get("volume_ml"),
        "matched_product_id": ai_validated_id,
        "ai_id_rejected": bool(gemini_payload.get("matched_product_id")) and not ai_validated_id,
        "verified_product_id": verified_id,
        "ui_message_key": _ui_message_key(status),
        "analytics": recognition_analytics_block(
            scan_method=scan_method,
            recognition_status=status,
            verified_product_id=verified_id,
            candidate_count=len(candidates),
            ai_fallback_used=ai_fallback_used,
            recognition_latency_ms=latency_ms,
        ),
    }


def run_hybrid_text_search(query: str) -> tuple[list[CareProduct], dict[str, Any]]:
    from .normalize import extract_volume_ml, normalize_product_text

    norm = normalize_product_text(query)
    signals = {
        "brand": "",
        "product_name": query.strip(),
        "product_line": "",
        "variant": "",
        "packaging_text": "",
        "volume_ml": extract_volume_ml(query),
        "brand_norm": "",
        "name_norm": norm,
        "combined_norm": norm,
    }
    raw_list = retrieve_catalog_candidates(
        name_norm=norm,
        combined_norm=norm,
        volume_ml=signals.get("volume_ml"),
        limit=constants.MAX_CANDIDATES,
    )
    scored = verify_candidate_list(signals, raw_list)
    status = classify_from_scores(scored)
    candidates = [s.product for s in scored[: constants.MAX_CANDIDATES]]
    if status == constants.NOT_FOUND and scored:
        status = constants.AMBIGUOUS if len(scored) > 1 else constants.PROBABLE_MATCH
    meta = _build_meta(
        status=status,
        signals=signals,
        scored=scored,
        candidates=candidates,
        ai_validated_id=None,
        gemini_payload={},
        scan_method="search",
        latency_ms=0,
        ai_fallback_used=False,
    )
    return candidates, meta


def apply_scan_status_from_meta(scan, candidates: list[CareProduct], meta: dict) -> None:
    """Mutate HairScan status + product fields from recognition meta."""
    from hair_advisor.models import HairScan
    from hair_advisor.services.catalog_sync import care_to_hair_product

    status = meta.get("recognition_status")
    scan.recognition_meta = meta

    attach = status in constants.AUTO_ATTACH_STATUSES and len(candidates) == 1
    if attach:
        care = candidates[0]
        scan.care_product = care
        scan.product = care_to_hair_product(care)
    else:
        scan.care_product = None
        scan.product = None

    if status == constants.INSUFFICIENT_IMAGE_QUALITY:
        scan.status = HairScan.Status.FAILED
        scan.error_code = "insufficient_image_quality"
        scan.error_message = "Rasm sifati yetarli emas. Yorug'lik va fokusni tekshiring."
    elif status == constants.SERVICE_UNAVAILABLE:
        scan.status = HairScan.Status.FAILED
        scan.error_code = "service_unavailable"
        scan.error_message = "Xizmat vaqtincha band. Qayta urinib ko'ring."
    elif status == constants.NOT_FOUND:
        scan.status = HairScan.Status.PRODUCT_NOT_FOUND
    elif status == constants.EXACT_MATCH and scan.care_product_id:
        scan.status = (
            HairScan.Status.PRODUCT_FOUND
            if scan.ingredients_draft
            else HairScan.Status.INGREDIENTS_REQUIRED
        )
    elif status in constants.PICK_STATUSES and candidates:
        scan.status = HairScan.Status.NEEDS_CONFIRMATION
    elif status == constants.EXACT_MATCH:
        scan.status = HairScan.Status.PRODUCT_NOT_FOUND
    else:
        scan.status = HairScan.Status.PRODUCT_NOT_FOUND