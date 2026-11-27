"""Unit tests for scanner barcode normalization.

Synthetic checksum-valid GTINs only — NOT claimed product identities.
"""

from hair_advisor.services.scanner.barcode_normalize import (
    compute_gtin_check_digit,
    expand_upc_e,
    normalize_barcode,
    validate_barcode_checksum,
    validate_gtin_checksum,
)


def _ean13(body12: str) -> str:
    return f"{body12}{compute_gtin_check_digit(body12)}"


def test_ean13_valid():
    assert validate_gtin_checksum("5901234123457") is True
    ok, code = validate_barcode_checksum("5901234123457")
    assert ok is True
    assert code == "5901234123457"


def test_ean8_valid():
    assert validate_gtin_checksum("96385074") is True
    n = normalize_barcode("96385074", "ean_8")
    assert n["isValid"] is True
    assert n["format"] == "ean_8"


def test_invalid_checksum():
    ok, _ = validate_barcode_checksum("5901234123450")
    assert ok is False
    n = normalize_barcode("5901234123450")
    assert n["isValid"] is False


def test_upc_a_leading_zero():
    n = normalize_barcode("036000291452")
    assert n["isValid"] is True
    assert n["normalizedValue"].startswith("0")
    assert "0036000291452" in n["lookupCandidates"]


def test_upc_a_ean13_equivalence():
    upc = normalize_barcode("036000291452", "upc_a")
    ean = normalize_barcode("0036000291452", "ean_13")
    assert upc["isValid"] and ean["isValid"]
    assert "036000291452" in ean["lookupCandidates"]
    assert "0036000291452" in upc["lookupCandidates"]


def test_gtin14_pad():
    n = normalize_barcode("036000291452")
    assert n["gtin14"] == "00036000291452"
    n14 = normalize_barcode("00036000291452", "gtin_14")
    assert n14["isValid"] is True


def test_upc_e_expand():
    expanded = expand_upc_e("02345673")
    assert expanded is not None
    assert len(expanded) == 12
    assert validate_gtin_checksum(expanded) is True
    n = normalize_barcode("02345673", "upc_e")
    assert n["isValid"] is True
    assert n["format"] == "upc_e"


def test_digital_link_extract():
    n = normalize_barcode("https://id.gs1.org/01/0036000291452")
    assert n["isValid"] is True
    assert n["identifierType"] == "gs1_structured"


def test_url_without_gtin_not_product():
    n = normalize_barcode("https://example.com/x")
    assert n["isValid"] is False
    assert n["identifierType"] == "url"


def test_international_prefix_samples_identifier_only():
    """Regional-looking prefixes as identifier samples — no product claim."""
    de = _ean13("400638133393")
    jp = _ean13("490123456789")
    assert validate_gtin_checksum(de)
    assert validate_gtin_checksum(jp)
    assert normalize_barcode(de)["isValid"] is True
    assert normalize_barcode(jp)["isValid"] is True
