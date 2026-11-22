"""Stage A — exact barcode recognition."""

from __future__ import annotations

from typing import Any

from . import constants
from .analytics import recognition_analytics_block


def barcode_recognition_meta(lookup: dict[str, Any], *, code: str, latency_ms: int = 0) -> dict[str, Any]:
    found = bool(lookup.get("found"))
    status = constants.EXACT_MATCH if found else constants.NOT_FOUND
    care = lookup.get("care_product")
    return {
        "recognition_status": status,
        "v3_status": status,
        "scan_method": "barcode",
        "barcode": code,
        "barcode_lookup_result": "verified" if found else "unknown",
        "candidate_ids": [care.pk] if care else [],
        "verified_product_id": care.pk if care else None,
        "ui_message_key": "product_identified" if found else "product_not_identified",
        "analytics": recognition_analytics_block(
            scan_method="barcode",
            recognition_status=status,
            verified_product_id=care.pk if care else None,
            candidate_count=1 if found else 0,
            barcode_lookup_result="verified" if found else "unknown",
            recognition_latency_ms=latency_ms,
        ),
    }