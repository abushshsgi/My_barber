"""Local verified MySaloon catalog provider."""

from __future__ import annotations

from hair_advisor.services.scanner.product_providers.base import ProductLookupResult


class VerifiedCatalogProvider:
    name = "verified_catalog"

    def lookup(self, barcode: str, candidates: list[str]) -> ProductLookupResult | None:
        from hair_advisor.services.verified_catalog import lookup_verified_by_barcode

        # Prefer primary barcode; verified_catalog already expands variants
        verified = lookup_verified_by_barcode(barcode, include_external_hint=False)
        if not verified.get("found"):
            for c in candidates:
                if c == barcode:
                    continue
                verified = lookup_verified_by_barcode(c, include_external_hint=False)
                if verified.get("found"):
                    break

        if not verified.get("found"):
            return None

        ingredients = verified.get("ingredients") or []
        return ProductLookupResult(
            found=True,
            source="verified",
            tier="verified",
            care_product=verified.get("care_product"),
            hair_product=verified.get("hair_product"),
            ingredients=list(ingredients) if isinstance(ingredients, list) else [],
            ingredients_text=str(verified.get("ingredients_text") or ""),
            verified_at=verified.get("verified_at"),
            barcode=barcode,
            verification_status="verified",
            missing_fields=[],
        )
