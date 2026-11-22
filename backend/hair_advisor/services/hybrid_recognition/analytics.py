"""Privacy-conscious recognition analytics (no raw OCR / images)."""

from __future__ import annotations

from typing import Any


def recognition_analytics_block(
    *,
    scan_method: str,
    recognition_status: str,
    verified_product_id: int | None = None,
    candidate_count: int = 0,
    barcode_lookup_result: str | None = None,
    ai_fallback_used: bool = False,
    recognition_latency_ms: int | None = None,
    error_category: str | None = None,
    user_confirmation_outcome: str | None = None,
) -> dict[str, Any]:
    block: dict[str, Any] = {
        "scan_method": scan_method,
        "recognition_status": recognition_status,
        "candidate_count": candidate_count,
        "ai_fallback_used": ai_fallback_used,
        "engine": "hybrid_v3",
    }
    if verified_product_id:
        block["verified_product_id"] = verified_product_id
    if barcode_lookup_result:
        block["barcode_lookup_result"] = barcode_lookup_result
    if recognition_latency_ms is not None:
        block["recognition_latency_ms"] = recognition_latency_ms
    if error_category:
        block["error_category"] = error_category
    if user_confirmation_outcome:
        block["user_confirmation_outcome"] = user_confirmation_outcome
    return block