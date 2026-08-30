"""GS1 barcode prefix → davlat aniqlash."""

from __future__ import annotations

from typing import TypedDict


class CountryDetection(TypedDict):
    country_name: str
    countryName: str
    prefix: str
    is_matched: bool
    isMatched: bool


# Aniq 3 xonali GS1 prefikslar
_EXACT: dict[str, str] = {
    "380": "Bulgaria",
    "383": "Slovenia",
    "385": "Croatia",
    "387": "Bosnia and Herzegovina",
    "389": "Montenegro",
    "470": "Kyrgyzstan",
    "471": "Taiwan",
    "474": "Estonia",
    "475": "Latvia",
    "476": "Azerbaijan",
    "477": "Lithuania",
    "478": "Uzbekistan",
    "479": "Sri Lanka",
    "480": "Philippines",
    "481": "Belarus",
    "482": "Ukraine",
    "483": "Turkmenistan",
    "484": "Moldova",
    "485": "Armenia",
    "486": "Georgia",
    "487": "Kazakhstan",
    "488": "Tajikistan",
    "489": "Hong Kong",
    "528": "Lebanon",
    "529": "Cyprus",
    "530": "Albania",
    "531": "North Macedonia",
    "535": "Malta",
    "539": "Ireland",
    "560": "Portugal",
    "569": "Iceland",
    "590": "Poland",
    "594": "Romania",
    "599": "Hungary",
    "603": "Ghana",
    "604": "Senegal",
    "608": "Bahrain",
    "609": "Mauritius",
    "611": "Morocco",
    "613": "Algeria",
    "615": "Nigeria",
    "616": "Kenya",
    "618": "Ivory Coast",
    "619": "Tunisia",
    "620": "Tanzania",
    "621": "Syria",
    "622": "Egypt",
    "624": "Libya",
    "625": "Jordan",
    "626": "Iran",
    "627": "Kuwait",
    "628": "Saudi Arabia",
    "629": "United Arab Emirates",
    "729": "Israel",
    "740": "Guatemala",
    "741": "El Salvador",
    "742": "Honduras",
    "743": "Nicaragua",
    "744": "Costa Rica",
    "745": "Panama",
    "746": "Dominican Republic",
    "750": "Mexico",
    "759": "Venezuela",
    "773": "Uruguay",
    "775": "Peru",
    "777": "Bolivia",
    "780": "Chile",
    "784": "Paraguay",
    "786": "Ecuador",
    "850": "Cuba",
    "858": "Slovakia",
    "859": "Czech Republic",
    "860": "Serbia",
    "865": "Mongolia",
    "867": "North Korea",
    "880": "South Korea",
    "884": "Cambodia",
    "885": "Thailand",
    "888": "Singapore",
    "890": "India",
    "893": "Vietnam",
    "896": "Pakistan",
    "899": "Indonesia",
    "955": "Malaysia",
    "958": "Macau",
}

# (start, end, country, prefix_label) — 3 xonali prefiks oralig'i
_RANGES: tuple[tuple[int, int, str, str], ...] = (
    (0, 19, "USA/Canada", "000-019"),
    (30, 39, "USA", "030-039"),
    (60, 139, "USA", "060-139"),
    (300, 379, "France", "300-379"),
    (400, 440, "Germany", "400-440"),
    (450, 459, "Japan", "450-459"),
    (460, 469, "Russia", "460-469"),
    (490, 499, "Japan", "490-499"),
    (500, 509, "United Kingdom", "500-509"),
    (520, 521, "Greece", "520-521"),
    (540, 549, "Belgium/Luxembourg", "540-549"),
    (570, 579, "Denmark", "570-579"),
    (600, 601, "South Africa", "600-601"),
    (640, 649, "Finland", "640-649"),
    (690, 699, "China", "690-699"),
    (700, 709, "Norway", "700-709"),
    (730, 739, "Sweden", "730-739"),
    (754, 755, "Canada", "754-755"),
    (760, 769, "Switzerland", "760-769"),
    (770, 771, "Colombia", "770-771"),
    (778, 779, "Argentina", "778-779"),
    (789, 790, "Brazil", "789-790"),
    (800, 839, "Italy", "800-839"),
    (840, 849, "Spain", "840-849"),
    (868, 869, "Turkey", "868-869"),
    (870, 879, "Netherlands", "870-879"),
    (900, 919, "Austria", "900-919"),
    (930, 939, "Australia", "930-939"),
    (940, 949, "New Zealand", "940-949"),
)


def normalize_barcode(raw: str | None) -> str:
    return "".join(ch for ch in str(raw or "") if ch.isdigit())


def barcode_variants(code: str) -> list[str]:
    """EAN-13 / UPC-A (12) o'zaro variantlari."""
    digits = normalize_barcode(code)
    if not digits:
        return []
    out: list[str] = [digits]
    if len(digits) == 12:
        out.append("0" + digits)
    if len(digits) == 13 and digits.startswith("0"):
        out.append(digits[1:])
    seen: set[str] = set()
    uniq: list[str] = []
    for item in out:
        if item not in seen:
            seen.add(item)
            uniq.append(item)
    return uniq


def _empty(prefix: str = "") -> CountryDetection:
    return {
        "country_name": "",
        "countryName": "",
        "prefix": prefix,
        "is_matched": False,
        "isMatched": False,
    }


def _hit(name: str, prefix: str) -> CountryDetection:
    return {
        "country_name": name,
        "countryName": name,
        "prefix": prefix,
        "is_matched": True,
        "isMatched": True,
    }


def gs1_country_rows() -> list[dict[str, str | int]]:
    """114 ta GS1 qoida — DB seed va fallback uchun."""
    rows: list[dict[str, str | int]] = []
    for prefix, name in _EXACT.items():
        n = int(prefix)
        rows.append(
            {
                "prefix_label": prefix,
                "country_name": name,
                "prefix_start": n,
                "prefix_end": n,
            }
        )
    for start, end, name, label in _RANGES:
        rows.append(
            {
                "prefix_label": label,
                "country_name": name,
                "prefix_start": start,
                "prefix_end": end,
            }
        )
    return rows


def sync_gs1_country_codes() -> int:
    """114 ta kodni Gs1CountryCode jadvaliga yozadi (update_or_create)."""
    from ai.models import Gs1CountryCode

    count = 0
    for row in gs1_country_rows():
        Gs1CountryCode.objects.update_or_create(
            prefix_label=row["prefix_label"],
            defaults={
                "country_name": row["country_name"],
                "prefix_start": row["prefix_start"],
                "prefix_end": row["prefix_end"],
            },
        )
        count += 1
    return count


def _detect_from_static(n: int, prefix3: str) -> CountryDetection:
    exact = _EXACT.get(prefix3)
    if exact:
        return _hit(exact, prefix3)
    for start, end, name, label in _RANGES:
        if start <= n <= end:
            return _hit(name, label)
    return _empty(prefix3)


def _detect_from_db(n: int, prefix3: str) -> CountryDetection | None:
    """Jadval bo'sh yoki mavjud bo'lmasa None — caller static fallback ishlatadi."""
    try:
        from ai.models import Gs1CountryCode

        if not Gs1CountryCode.objects.exists():
            return None
        exact = Gs1CountryCode.objects.filter(prefix_start=n, prefix_end=n).first()
        if exact:
            return _hit(exact.country_name, exact.prefix_label)
        row = (
            Gs1CountryCode.objects.filter(prefix_start__lte=n, prefix_end__gte=n)
            .order_by("prefix_start")
            .first()
        )
        if row:
            return _hit(row.country_name, row.prefix_label)
        return _empty(prefix3)
    except Exception:
        return None


def detect_country_from_barcode(barcode: str) -> CountryDetection:
    """GS1 prefiksidan (2–3 raqam) davlatni aniqlaydi. Avval DB, keyin static xarita."""
    digits = normalize_barcode(barcode)
    if len(digits) < 8:
        return _empty()
    prefix3 = digits[:3]
    try:
        n = int(prefix3)
    except ValueError:
        return _empty()

    db_hit = _detect_from_db(n, prefix3)
    if db_hit is not None:
        return db_hit
    return _detect_from_static(n, prefix3)
