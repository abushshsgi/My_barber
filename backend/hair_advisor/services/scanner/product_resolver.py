"""resolveProductByBarcode — staged resolution for Hair Advisor scans."""

from __future__ import annotations

from typing import Any

from django.core.cache import cache

from hair_advisor.services.scanner.barcode_normalize import normalize_barcode
from hair_advisor.services.scanner.product_providers.chain import query_product_providers

DEDUP_PREFIX = "hair_advisor:resolve_inflight:"
DEDUP_TTL = 15


def resolve_product_by_barcode(raw_barcode: str, *, format_hint: str | None = None) -> dict[str, Any]:
    """
    Normalize barcode, then search verified DB → external catalogs.
    External hits are returned as found=False with external_hint (never auto-verified).
    """
    normalized = normalize_barcode(raw_barcode, format_hint)
    if not normalized.get("isValid"):
        return {
            "found": False,
            "tier": "unknown",
            "barcode": normalized.get("normalizedValue") or "",
            "error": "invalid_barcode",
            "normalized": normalized,
        }

    code = str(normalized["normalizedValue"])
    candidates = list(normalized.get("lookupCandidates") or [code])

    # Short-lived dedup for concurrent identical lookups
    cache_key = f"{DEDUP_PREFIX}{code}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        out = dict(cached)
        out["normalized"] = normalized
        return out

    result = query_product_providers(code, candidates)
    payload = result.as_legacy_dict()
    payload["normalized"] = normalized
    cache.set(cache_key, {k: v for k, v in payload.items() if k != "normalized"}, DEDUP_TTL)
    return payload
