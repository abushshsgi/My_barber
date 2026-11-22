"""Product text normalization (uz / ru / en)."""

from __future__ import annotations

import re
import unicodedata

_CYR_TO_LAT = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "e",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "й": "y",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "h",
        "ц": "ts",
        "ч": "ch",
        "ш": "sh",
        "щ": "sch",
        "ъ": "",
        "ы": "y",
        "ь": "",
        "э": "e",
        "ю": "yu",
        "я": "ya",
    }
)

_VOLUME_RE = re.compile(r"\b(\d{2,4})\s*(?:ml|мл|m\s*l)\b", re.IGNORECASE)
_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_WS_RE = re.compile(r"\s+")


def normalize_product_text(value: str) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFKC", value.strip().lower())
    text = text.translate(_CYR_TO_LAT)
    text = _PUNCT_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip()
    return text


def extract_volume_ml(text: str) -> int | None:
    if not text:
        return None
    m = _VOLUME_RE.search(text)
    if not m:
        return None
    try:
        vol = int(m.group(1))
    except ValueError:
        return None
    if 50 <= vol <= 5000:
        return vol
    return None


def parse_ocr_signals(gemini_payload: dict) -> dict:
    analysis = gemini_payload.get("product_analysis")
    if not isinstance(analysis, dict):
        analysis = {}
    brand = str(analysis.get("brand") or "").strip()
    name = str(analysis.get("product_name") or "").strip()
    line = str(analysis.get("product_line") or analysis.get("line") or "").strip()
    variant = str(analysis.get("variant") or "").strip()
    packaging = str(analysis.get("packaging_text") or analysis.get("distinctive_text") or "").strip()
    combined = " ".join(filter(None, [brand, name, line, variant, packaging]))
    vol = analysis.get("volume_ml")
    volume_ml: int | None = None
    if isinstance(vol, int) and vol > 0:
        volume_ml = vol
    elif isinstance(vol, str) and vol.isdigit():
        volume_ml = int(vol)
    if volume_ml is None:
        volume_ml = extract_volume_ml(combined) or extract_volume_ml(name)
    return {
        "brand": brand,
        "product_name": name,
        "product_line": line,
        "variant": variant,
        "packaging_text": packaging,
        "volume_ml": volume_ml,
        "brand_norm": normalize_product_text(brand),
        "name_norm": normalize_product_text(name),
        "combined_norm": normalize_product_text(combined),
    }