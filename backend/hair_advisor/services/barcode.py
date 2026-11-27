"""Barcode checksum — delegates to scanner normalize (GTIN-8/12/13/14, UPC-E)."""

from __future__ import annotations

from hair_advisor.services.scanner.barcode_normalize import validate_barcode_checksum

__all__ = ["validate_barcode_checksum"]
