"""Staged provider chain with early exit on verified hit."""

from __future__ import annotations

from hair_advisor.services.scanner.product_providers.base import ProductLookupResult
from hair_advisor.services.scanner.product_providers.external import (
    OpenBeautyFactsProvider,
    UpcItemDbProvider,
)
from hair_advisor.services.scanner.product_providers.verified import VerifiedCatalogProvider


def default_providers() -> list:
    return [
        VerifiedCatalogProvider(),
        OpenBeautyFactsProvider(),
        UpcItemDbProvider(),
    ]


def query_product_providers(
    barcode: str,
    candidates: list[str] | None = None,
    *,
    providers: list | None = None,
) -> ProductLookupResult:
    codes = candidates or [barcode]
    primary = barcode or (codes[0] if codes else "")
    last_hint: ProductLookupResult | None = None

    for provider in providers or default_providers():
        try:
            result = provider.lookup(primary, codes)
        except Exception:
            continue
        if result is None:
            continue
        if result.found and result.tier == "verified":
            return result
        if result.external_hint or result.name:
            last_hint = result

    if last_hint is not None:
        return last_hint

    return ProductLookupResult(found=False, tier="unknown", barcode=primary)
