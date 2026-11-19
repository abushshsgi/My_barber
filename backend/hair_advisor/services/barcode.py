"""EAN-8, EAN-13, UPC-A checksum validation."""

from __future__ import annotations

from ai.services.barcode_country import normalize_barcode


def validate_barcode_checksum(code: str) -> tuple[bool, str]:
    """Return (valid, normalized_digits)."""
    digits = normalize_barcode(code)
    if not digits:
        return False, ""
    length = len(digits)
    if length not in (8, 12, 13):
        return False, digits

    body, check_digit = digits[:-1], int(digits[-1])
    total = 0
    # EAN/UPC: positions from right (excluding check) alternate weights 3 and 1
    reversed_body = body[::-1]
    for i, ch in enumerate(reversed_body):
        weight = 3 if i % 2 == 0 else 1
        total += int(ch) * weight
    calc = (10 - (total % 10)) % 10
    if calc != check_digit:
        return False, digits
    return True, digits