"""GTIN / UPC-E / GS1 barcode normalization — strings only, no Number coercion."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse


def digits_only(raw: str | None) -> str:
    return "".join(ch for ch in str(raw or "") if ch.isdigit())


def compute_gtin_check_digit(body: str) -> int:
    total = 0
    for i, ch in enumerate(reversed(body)):
        weight = 3 if i % 2 == 0 else 1
        total += int(ch) * weight
    return (10 - (total % 10)) % 10


def validate_gtin_checksum(digits: str) -> bool:
    if not digits.isdigit():
        return False
    if len(digits) not in (8, 12, 13, 14):
        return False
    body, check = digits[:-1], int(digits[-1])
    return compute_gtin_check_digit(body) == check


def expand_upc_e(raw: str) -> str | None:
    d = digits_only(raw)
    if len(d) == 8 and d[0] in "01":
        ns, mid, check = d[0], d[1:7], int(d[7])
        upc_a = _expand_upc_e6(mid, ns)
        if not upc_a:
            return None
        if compute_gtin_check_digit(upc_a[:11]) != check:
            return None
        return upc_a
    if len(d) == 7 and d[0] in "01":
        return _expand_upc_e6(d[1:7], d[0])
    if len(d) == 6:
        return _expand_upc_e6(d, "0")
    return None


def _expand_upc_e6(mid: str, number_system: str) -> str | None:
    if len(mid) != 6 or number_system not in "01":
        return None
    d1, d2, d3, d4, d5, d6 = mid
    if d6 in "012":
        manufacturer = f"{d1}{d2}{d6}00"
        product = f"00{d3}{d4}{d5}"
    elif d6 == "3":
        manufacturer = f"{d1}{d2}{d3}00"
        product = f"000{d4}{d5}"
    elif d6 == "4":
        manufacturer = f"{d1}{d2}{d3}{d4}0"
        product = f"0000{d5}"
    else:
        manufacturer = f"{d1}{d2}{d3}{d4}{d5}"
        product = f"0000{d6}"
    body11 = f"{number_system}{manufacturer}{product}"
    if len(body11) != 11:
        return None
    return f"{body11}{compute_gtin_check_digit(body11)}"


def pad_gtin14(digits: str) -> str | None:
    d = digits_only(digits)
    if not d or len(d) > 14 or len(d) not in (8, 12, 13, 14):
        return None
    if not validate_gtin_checksum(d):
        return None
    return d.zfill(14)


def _looks_like_url(raw: str) -> bool:
    t = raw.strip().lower()
    return t.startswith("http://") or t.startswith("https://") or t.startswith("www.")


def _parse_gs1_digital_link(raw: str) -> str | None:
    trimmed = raw.strip()
    if not (_looks_like_url(trimmed) or "id.gs1.org" in trimmed or "/01/" in trimmed):
        return None
    try:
        url = urlparse(trimmed if "://" in trimmed else f"https://{trimmed}")
        parts = [p for p in url.path.split("/") if p]
        for i, part in enumerate(parts):
            if part == "01" and i + 1 < len(parts):
                gtin = digits_only(parts[i + 1])
                if gtin:
                    return gtin
        # query ?01= or ?gtin=
        from urllib.parse import parse_qs

        qs = parse_qs(url.query)
        for key in ("01", "gtin"):
            if key in qs and qs[key]:
                return digits_only(qs[key][0])
    except Exception:
        pass
    import re

    m = re.search(r"/01/(\d{8,14})", trimmed)
    return m.group(1) if m else None


def _unique(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if not item or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def normalize_barcode(raw_value: str, format_hint: str | None = None) -> dict[str, Any]:
    """Return NormalizedBarcode-compatible dict."""
    raw = str(raw_value or "")
    hint = (format_hint or "").strip().lower().replace("-", "_").replace(" ", "_")

    digital = _parse_gs1_digital_link(raw)
    if digital:
        inner = normalize_barcode(digital, hint or "ean_13")
        inner["rawValue"] = raw
        if inner.get("isValid"):
            inner["identifierType"] = "gs1_structured"
        return inner

    if hint == "upc_e" or (len(digits_only(raw)) <= 8 and not hint):
        expanded = expand_upc_e(raw)
        if expanded and validate_gtin_checksum(expanded):
            gtin14 = pad_gtin14(expanded)
            ean13 = expanded if len(expanded) == 13 else f"0{expanded}"
            upc12 = expanded[1:] if expanded.startswith("0") and len(expanded) == 13 else expanded
            return {
                "rawValue": raw,
                "format": "upc_e",
                "normalizedValue": expanded,
                "gtin14": gtin14,
                "isValid": True,
                "identifierType": "retail_gtin",
                "lookupCandidates": _unique(
                    [expanded, ean13, upc12, gtin14 or "", digits_only(raw)]
                ),
            }

    digits = digits_only(raw)
    if not digits:
        return {
            "rawValue": raw,
            "format": hint or "unknown",
            "normalizedValue": "",
            "isValid": False,
            "identifierType": "url" if _looks_like_url(raw) else "unknown",
            "lookupCandidates": [],
        }

    working = digits
    fmt = hint or "unknown"
    if len(working) == 12 and validate_gtin_checksum(working):
        fmt = "upc_a" if hint != "upc_e" else "upc_e"
    elif len(working) == 13 and validate_gtin_checksum(working):
        fmt = "ean_13"
    elif len(working) == 8 and validate_gtin_checksum(working):
        fmt = "ean_8"
    elif len(working) == 14 and validate_gtin_checksum(working):
        fmt = "gtin_14"
        if working.startswith("0"):
            working = working[1:]

    valid_digits = digits if validate_gtin_checksum(digits) else (working if validate_gtin_checksum(working) else digits)
    really_valid = validate_gtin_checksum(valid_digits)
    gtin14 = pad_gtin14(valid_digits) if really_valid else None

    identifier = "unknown"
    if _looks_like_url(raw):
        identifier = "url"
    elif really_valid:
        identifier = "retail_gtin"

    candidates = [valid_digits]
    if len(valid_digits) == 12:
        candidates.append(f"0{valid_digits}")
    if len(valid_digits) == 13 and valid_digits.startswith("0"):
        candidates.append(valid_digits[1:])
    if gtin14:
        candidates.append(gtin14)

    return {
        "rawValue": raw,
        "format": fmt,
        "normalizedValue": valid_digits if really_valid else digits,
        "gtin14": gtin14,
        "isValid": really_valid and identifier != "url",
        "identifierType": identifier,
        "lookupCandidates": _unique(candidates),
    }


def validate_barcode_checksum(code: str) -> tuple[bool, str]:
    """Compatibility wrapper used by HairScan create view."""
    normalized = normalize_barcode(code)
    if normalized.get("isValid") and normalized.get("identifierType") in ("retail_gtin", "gs1_structured"):
        return True, str(normalized.get("normalizedValue") or "")
    # Keep legacy digit-only path for partial debugging
    digits = digits_only(code)
    if digits and validate_gtin_checksum(digits) and len(digits) in (8, 12, 13):
        return True, digits
    return False, digits
