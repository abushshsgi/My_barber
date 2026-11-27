"""Open Beauty Facts + UPCitemdb — hints only, never auto-verified."""

from __future__ import annotations

from typing import Any

from django.core.cache import cache

from hair_advisor.services.scanner.product_providers.base import ProductLookupResult

NEG_CACHE_PREFIX = "hair_advisor:barcode_neg:"
HINT_CACHE_PREFIX = "hair_advisor:barcode_hint:"
NEG_TTL = 600
HINT_TTL = 3600


class OpenBeautyFactsProvider:
    name = "open_beauty_facts"

    def lookup(self, barcode: str, candidates: list[str]) -> ProductLookupResult | None:
        from ai.services.product_barcode_lookup import fetch_open_beauty_facts

        for code in candidates or [barcode]:
            neg = cache.get(f"{NEG_CACHE_PREFIX}obf:{code}")
            if neg:
                continue
            cached = cache.get(f"{HINT_CACHE_PREFIX}obf:{code}")
            if isinstance(cached, dict):
                return _hint_result(cached, code, self.name)
            parsed = fetch_open_beauty_facts(code)
            if not parsed:
                cache.set(f"{NEG_CACHE_PREFIX}obf:{code}", 1, NEG_TTL)
                continue
            cache.set(f"{HINT_CACHE_PREFIX}obf:{code}", parsed, HINT_TTL)
            return _hint_result(parsed, code, self.name)
        return None


class UpcItemDbProvider:
    name = "upcitemdb"

    def lookup(self, barcode: str, candidates: list[str]) -> ProductLookupResult | None:
        from ai.services.product_barcode_lookup import fetch_upcitemdb

        for code in candidates or [barcode]:
            neg = cache.get(f"{NEG_CACHE_PREFIX}upc:{code}")
            if neg:
                continue
            cached = cache.get(f"{HINT_CACHE_PREFIX}upc:{code}")
            if isinstance(cached, dict):
                return _hint_result(cached, code, self.name)
            parsed = fetch_upcitemdb(code)
            if not parsed:
                cache.set(f"{NEG_CACHE_PREFIX}upc:{code}", 1, NEG_TTL)
                continue
            cache.set(f"{HINT_CACHE_PREFIX}upc:{code}", parsed, HINT_TTL)
            return _hint_result(parsed, code, self.name)
        return None


def _hint_result(parsed: dict[str, Any], code: str, source: str) -> ProductLookupResult:
    ingredients_text = str(parsed.get("ingredients_text") or parsed.get("ingredients_raw") or "")
    missing: list[str] = []
    if not parsed.get("name"):
        missing.append("name")
    if not ingredients_text:
        missing.append("ingredients")
    if not parsed.get("image_url"):
        missing.append("image")
    return ProductLookupResult(
        found=False,  # external never counts as verified found
        source=source,
        tier="unverified",
        barcode=code,
        name=str(parsed.get("name") or ""),
        brand=str(parsed.get("brand") or ""),
        image_url=str(parsed.get("image_url") or ""),
        ingredients_text=ingredients_text,
        external_hint=parsed,
        verification_status="partial" if parsed.get("name") else "unverified",
        missing_fields=missing,
    )
