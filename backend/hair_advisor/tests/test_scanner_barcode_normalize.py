"""Unit tests for scanner barcode normalization."""

from hair_advisor.services.scanner.barcode_normalize import (
    expand_upc_e,
    normalize_barcode,
    validate_barcode_checksum,
    validate_gtin_checksum,
)


def test_ean13_valid():
    assert validate_gtin_checksum("5901234123457") is True
    ok, code = validate_barcode_checksum("5901234123457")
    assert ok is True
    assert code == "5901234123457"


def test_invalid_checksum():
    ok, _ = validate_barcode_checksum("5901234123450")
    assert ok is False


def test_upc_a_leading_zero():
    n = normalize_barcode("036000291452")
    assert n["isValid"] is True
    assert n["normalizedValue"].startswith("0")
    assert "0036000291452" in n["lookupCandidates"]


def test_gtin14_pad():
    n = normalize_barcode("036000291452")
    assert n["gtin14"] == "00036000291452"


def test_upc_e_expand():
    expanded = expand_upc_e("02345673")
    assert expanded is not None
    assert len(expanded) == 12
    assert validate_gtin_checksum(expanded) is True


def test_digital_link_extract():
    n = normalize_barcode("https://id.gs1.org/01/0036000291452")
    assert n["isValid"] is True
    assert n["identifierType"] == "gs1_structured"


def test_url_without_gtin_not_product():
    n = normalize_barcode("https://example.com/x")
    assert n["isValid"] is False
    assert n["identifierType"] == "url"
