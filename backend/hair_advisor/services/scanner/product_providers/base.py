from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ProductLookupResult:
    found: bool
    source: str | None = None
    tier: str = "unknown"  # verified | partial | unverified | unknown
    care_product: Any = None
    hair_product: Any = None
    ingredients: list[str] = field(default_factory=list)
    ingredients_text: str = ""
    verified_at: Any = None
    external_hint: dict[str, Any] | None = None
    barcode: str = ""
    name: str = ""
    brand: str = ""
    image_url: str = ""
    missing_fields: list[str] = field(default_factory=list)
    verification_status: str = "unverified"

    def as_legacy_dict(self) -> dict[str, Any]:
        """Shape expected by existing lookup_by_barcode callers."""
        out: dict[str, Any] = {
            "found": self.found,
            "source": self.source,
            "tier": self.tier,
            "care_product": self.care_product,
            "hair_product": self.hair_product,
            "ingredients": self.ingredients,
            "ingredients_text": self.ingredients_text,
            "verified_at": self.verified_at,
            "barcode": self.barcode,
            "external_hint": self.external_hint,
            "verification_status": self.verification_status,
            "missing_fields": self.missing_fields,
        }
        if self.name:
            out["name"] = self.name
        if self.brand:
            out["brand"] = self.brand
        if self.image_url:
            out["image_url"] = self.image_url
        return out


class ProductProvider(Protocol):
    name: str

    def lookup(self, barcode: str, candidates: list[str]) -> ProductLookupResult | None:
        """Return a result if this provider has something useful; None to continue."""
        ...
