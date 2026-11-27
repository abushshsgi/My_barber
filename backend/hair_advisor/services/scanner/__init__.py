"""Universal Smart Scanner — barcode normalize + product resolution."""

from hair_advisor.services.scanner.barcode_normalize import normalize_barcode, validate_barcode_checksum
from hair_advisor.services.scanner.product_resolver import resolve_product_by_barcode

__all__ = [
    "normalize_barcode",
    "validate_barcode_checksum",
    "resolve_product_by_barcode",
]
