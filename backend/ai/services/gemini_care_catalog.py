"""Gemini Vision — admin Tarkib katalogi: mahsulot rasmlaridan forma to'ldirish."""

from __future__ import annotations

from typing import Any

from ai.models import CareProduct
from ai.services.barcode_country import detect_country_from_barcode, normalize_barcode
from ai.services.care_match import (
    CONCERN_TAGS,
    HAIR_TAGS,
    SCALP_TAGS,
    parse_ingredients_text,
)
from ai.services.errors import AiStyleError
from ai.services.gemini_style import (
    ALLOWED_MIME,
    MAX_IMAGE_BYTES,
    _gemini_vision_json_multi,
    _sniff_image_mime,
    parse_data_url,
)

CATEGORIES = frozenset(choice[0] for choice in CareProduct.Category.choices)
CATEGORY_ALIASES = {
    "shampun": "shampoo",
    "shampoo": "shampoo",
    "konditsioner": "conditioner",
    "conditioner": "conditioner",
    "balzam": "balsam",
    "balsam": "balsam",
    "maska": "mask",
    "mask": "mask",
    "sarum": "serum",
    "serum": "serum",
    "yog": "oil",
    "yog'": "oil",
    "oil": "oil",
    "sprey": "spray",
    "spray": "spray",
    "other": "other",
    "boshqa": "other",
}
MAX_PHOTOS = 3
PHOTO_ROLES = frozenset({"front", "back", "ingredients"})


def _build_catalog_fill_prompt(*, unlabeled: bool) -> str:
    cats = ", ".join(sorted(CATEGORIES))
    hair = ", ".join(sorted(HAIR_TAGS))
    scalp = ", ".join(sorted(SCALP_TAGS))
    concerns = ", ".join(sorted(CONCERN_TAGS))
    if unlabeled:
        image_block = """IMAGES are unlabeled product photos in the order attached (1..N).
Classify EACH image into image_roles using the same index:
- front — bottle/box front (name, brand, volume, marketing claims)
- back — back label (usage, warnings, barcode)
- ingredients — INCI / Ingredients list (may also be the back label)
image_roles length MUST equal the number of attached images."""
    else:
        image_block = """IMAGES (in order, some may be missing):
1) FRONT — bottle/box front (name, brand, volume, claims)
2) BACK — back label (usage, warnings, barcode)
3) INGREDIENTS — INCI / Ingredients list (may be the same as back)
Set image_roles to the same roles you received, skipping missing slots."""
    return f"""You are a cosmetic chemist filling an admin catalog card for a HAIR product
(shampoo, conditioner/balsam, mask, serum, oil, spray).

{image_block}

INSTRUCTIONS:
- Read ALL attached photos. Prefer the INCI photo for ingredients.
- Extract barcode digits if a GS1/EAN/UPC is visible (8–14 digits, no spaces).
- category MUST be one of: {cats}
- suitable_for / not_suitable_for tags MUST be from: {hair}
- scalp_types tags MUST be from: {scalp}
- concerns tags MUST be from: {concerns}
- usage_uz, purpose_uz, pros_uz, cons_uz, warnings_uz: Uzbek Latin, short, factual.
- ingredients_text: full INCI list as printed, comma-separated. Do not invent ingredients.
- If a field is unreadable, return empty string or empty list — never guess INCI.
- If photos are not a hair-care product, still extract visible text but set category "other".

OUTPUT (raw JSON only):
{{
  "name": "Repair Shampoo",
  "brand": "L'Oreal",
  "category": "shampoo",
  "barcode": "3600523193864",
  "country_of_origin": "",
  "ingredients_text": "Aqua, Sodium Laureth Sulfate, ...",
  "usage_uz": "Nam sochga surting, yuvib tashlang.",
  "purpose_uz": "Shikastlangan sochni tiklash.",
  "suitable_for": ["damaged", "colored"],
  "not_suitable_for": ["fine"],
  "scalp_types": ["normal"],
  "concerns": ["breakage"],
  "pros_uz": "Tiklovchi formulasi.",
  "cons_uz": "Sulfat bo'lishi mumkin.",
  "warnings_uz": "Ko'zga tushsa yuving.",
  "image_roles": ["front", "back", "ingredients"]
}}
"""


def _clean_tags(raw: Any, allowed: frozenset[str]) -> list[str]:
    if isinstance(raw, str):
        raw = [part.strip() for part in raw.replace(";", ",").split(",")]
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        tag = str(item or "").strip().lower()
        if tag in allowed and tag not in out:
            out.append(tag)
    return out


def _normalize_category(raw: Any) -> str:
    key = str(raw or "").strip().lower().replace("’", "'")
    key = key.replace("‘", "'")
    if key in CATEGORIES:
        return key
    compact = key.replace(" ", "").replace("-", "")
    return CATEGORY_ALIASES.get(compact) or CATEGORY_ALIASES.get(key) or "other"


def _clean_roles(raw: Any, count: int) -> list[str]:
    if not isinstance(raw, list) or count <= 0:
        return []
    out: list[str] = []
    for item in raw[:count]:
        role = str(item or "").strip().lower()
        if role in {"front", "old", "oldi"}:
            role = "front"
        elif role in {"back", "orqa", "orqasi"}:
            role = "back"
        elif role in {"ingredients", "tarkib", "inci"}:
            role = "ingredients"
        if role not in PHOTO_ROLES:
            return []
        out.append(role)
    return out if len(out) == count else []


def normalize_catalog_fill(data: dict[str, Any], *, photo_count: int = 0) -> dict[str, Any]:
    ingredients_text = str(data.get("ingredients_text") or "").strip()
    if not ingredients_text and isinstance(data.get("ingredients"), list):
        ingredients_text = ", ".join(
            str(x).strip() for x in data["ingredients"] if str(x).strip()
        )
    ingredients = parse_ingredients_text(ingredients_text)
    if not ingredients_text and ingredients:
        ingredients_text = ", ".join(ingredients)

    barcode = normalize_barcode(str(data.get("barcode") or ""))
    country = detect_country_from_barcode(barcode) if len(barcode) >= 8 else None
    country_name = ""
    prefix = ""
    matched = False
    if country and country.get("is_matched"):
        country_name = str(country.get("country_name") or "")
        prefix = str(country.get("prefix") or "")
        matched = True
    if not country_name:
        country_name = str(data.get("country_of_origin") or "").strip()[:80]

    return {
        "name": str(data.get("name") or "").strip()[:160],
        "brand": str(data.get("brand") or "").strip()[:120],
        "category": _normalize_category(data.get("category")),
        "barcode": barcode,
        "country_of_origin": country_name,
        "country_code_prefix": prefix,
        "country_matched": matched,
        "ingredients_text": ingredients_text[:8000],
        "ingredients": ingredients,
        "usage_uz": str(data.get("usage_uz") or "").strip()[:2000],
        "purpose_uz": str(data.get("purpose_uz") or "").strip()[:2000],
        "suitable_for": _clean_tags(data.get("suitable_for"), HAIR_TAGS),
        "not_suitable_for": _clean_tags(data.get("not_suitable_for"), HAIR_TAGS),
        "scalp_types": _clean_tags(data.get("scalp_types"), SCALP_TAGS),
        "concerns": _clean_tags(data.get("concerns"), CONCERN_TAGS),
        "pros_uz": str(data.get("pros_uz") or "").strip()[:2000],
        "cons_uz": str(data.get("cons_uz") or "").strip()[:2000],
        "warnings_uz": str(data.get("warnings_uz") or "").strip()[:2000],
        "image_roles": _clean_roles(data.get("image_roles"), photo_count),
    }


def _decode_upload(raw: bytes, content_type: str = "") -> tuple[str, bytes]:
    if not raw:
        raise AiStyleError("Rasm bo'sh.", 400)
    if len(raw) > MAX_IMAGE_BYTES:
        raise AiStyleError("Rasm hajmi 5 MB dan oshmasligi kerak.", 400)
    mime = _sniff_image_mime(raw, content_type)
    if mime not in ALLOWED_MIME:
        raise AiStyleError("Faqat JPEG, PNG yoki WebP qabul qilinadi.", 400)
    return mime, raw


def decode_catalog_photo(value: Any) -> tuple[str, bytes] | None:
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.startswith("data:"):
            return parse_data_url(text)
        raise AiStyleError("Rasm formati noto'g'ri. JPEG yoki PNG yuklang.", 400)
    raw = value.read() if hasattr(value, "read") else None
    if not raw:
        return None
    content_type = getattr(value, "content_type", "") or ""
    return _decode_upload(raw, content_type)


def analyze_catalog_photos(
    photos: list[tuple[str, bytes]],
    *,
    unlabeled: bool = False,
) -> dict[str, Any]:
    if not photos:
        raise AiStyleError("Kamida bitta mahsulot rasmini yuklang (old, orqa yoki tarkib).", 400)
    if len(photos) > MAX_PHOTOS:
        photos = photos[:MAX_PHOTOS]
    data, usage = _gemini_vision_json_multi(
        _build_catalog_fill_prompt(unlabeled=unlabeled),
        photos,
        timeout=75,
    )
    if not isinstance(data, dict):
        raise AiStyleError("AI javobi noto'g'ri formatda.", 502)
    filled = normalize_catalog_fill(data, photo_count=len(photos))
    filled["_usage"] = usage
    return filled
