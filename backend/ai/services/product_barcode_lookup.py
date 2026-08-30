"""Mahsulotni barcode bo'yicha: lokal DB → Open Beauty Facts → UPCitemdb."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from django.db.models import Q

from ai.models import CareProduct
from ai.services.barcode_country import barcode_variants, detect_country_from_barcode, normalize_barcode
from ai.services.care_match import parse_ingredients_text

logger = logging.getLogger(__name__)

USER_AGENT = "MyBarber-MorphAI/1.0"
OBF_URL = "https://world.openbeautyfacts.org/api/v2/product/{barcode}"
UPC_URL = "https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"


def find_product_by_barcode(barcode: str) -> CareProduct | None:
    variants = barcode_variants(barcode)
    if not variants:
        return None
    return CareProduct.objects.filter(Q(barcode__in=variants)).first()


def infer_category(text: str) -> str:
    t = (text or "").lower()
    if any(k in t for k in ("shampoo", "shampun", "shampoing")):
        return "shampoo"
    if any(k in t for k in ("conditioner", "konditsioner", "balsam", "balzam")):
        return "conditioner"
    if any(k in t for k in ("mask", "maska", "masque")):
        return "mask"
    if "serum" in t or "sarum" in t:
        return "serum"
    if any(k in t for k in ("oil", "yog'", "huile")):
        return "oil"
    if any(k in t for k in ("spray", "sprey", "mist")):
        return "spray"
    return "other"


def _get_json(url: str, *, timeout: float = 8.0) -> dict[str, Any] | None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            raw = resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        logger.info("Barcode lookup HTTP xato: %s", exc)
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _looks_like_inci(text: str) -> bool:
    t = (text or "").strip()
    if len(t) < 12:
        return False
    lower = t.lower()
    if "aqua" in lower or "water" in lower or "glycerin" in lower:
        return True
    return t.count(",") >= 3


def parse_open_beauty_facts(payload: dict[str, Any], barcode: str) -> dict[str, Any] | None:
    status = payload.get("status")
    if status not in (1, "1", True, "success"):
        return None
    product = payload.get("product")
    if not isinstance(product, dict):
        return None
    name = str(
        product.get("product_name")
        or product.get("product_name_en")
        or product.get("generic_name")
        or ""
    ).strip()
    brand = str(product.get("brands") or product.get("brand") or "").split(",")[0].strip()
    ingredients = str(
        product.get("ingredients_text")
        or product.get("ingredients_text_en")
        or ""
    ).strip()
    image = str(
        product.get("image_front_url")
        or product.get("image_url")
        or product.get("image_small_url")
        or ""
    ).strip()
    cats = product.get("categories_tags") if isinstance(product.get("categories_tags"), list) else []
    category = infer_category(" ".join(str(x) for x in cats) + " " + name)
    country = str(product.get("origins") or product.get("countries") or "").split(",")[0].strip()
    if not name and not brand and not ingredients:
        return None
    detected = detect_country_from_barcode(barcode)
    return {
        "title": name,
        "name": name,
        "brand": brand,
        "category": category,
        "barcode": normalize_barcode(barcode),
        "image_url": image,
        "ingredients_raw": ingredients,
        "ingredients_text": ingredients,
        "usage_instructions": "",
        "country_of_origin": country or detected["country_name"],
        "country_code_prefix": detected["prefix"],
        "source": "open_beauty_facts",
    }


def parse_upcitemdb(payload: dict[str, Any], barcode: str) -> dict[str, Any] | None:
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        return None
    item = items[0] if isinstance(items[0], dict) else None
    if not item:
        return None
    name = str(item.get("title") or "").strip()
    brand = str(item.get("brand") or "").strip()
    images = item.get("images") if isinstance(item.get("images"), list) else []
    image = str(images[0] if images else "").strip()
    description = str(item.get("description") or "").strip()
    ingredients = description if _looks_like_inci(description) else ""
    category = infer_category(f"{item.get('category') or ''} {name}")
    if not name and not brand:
        return None
    detected = detect_country_from_barcode(barcode)
    return {
        "title": name,
        "name": name,
        "brand": brand,
        "category": category,
        "barcode": normalize_barcode(barcode),
        "image_url": image,
        "ingredients_raw": ingredients,
        "ingredients_text": ingredients,
        "usage_instructions": "",
        "country_of_origin": detected["country_name"],
        "country_code_prefix": detected["prefix"],
        "source": "upcitemdb",
    }


def fetch_open_beauty_facts(barcode: str) -> dict[str, Any] | None:
    code = normalize_barcode(barcode)
    if not code:
        return None
    for variant in barcode_variants(code):
        url = OBF_URL.format(barcode=urllib.parse.quote(variant, safe=""))
        data = _get_json(url)
        if not data:
            continue
        parsed = parse_open_beauty_facts(data, variant)
        if parsed:
            return parsed
    return None


def fetch_upcitemdb(barcode: str) -> dict[str, Any] | None:
    code = normalize_barcode(barcode)
    if not code:
        return None
    url = UPC_URL.format(barcode=urllib.parse.quote(code, safe=""))
    data = _get_json(url)
    if not data:
        return None
    return parse_upcitemdb(data, code)


def lookup_external_product(barcode: str) -> dict[str, Any] | None:
    return fetch_open_beauty_facts(barcode) or fetch_upcitemdb(barcode)


def external_as_product_payload(external: dict[str, Any]) -> dict[str, Any]:
    ingredients_text = str(external.get("ingredients_text") or external.get("ingredients_raw") or "")
    return {
        "name": str(external.get("name") or external.get("title") or "").strip(),
        "brand": str(external.get("brand") or "").strip(),
        "category": str(external.get("category") or "other"),
        "barcode": normalize_barcode(str(external.get("barcode") or "")),
        "country_of_origin": str(external.get("country_of_origin") or ""),
        "country_code_prefix": str(external.get("country_code_prefix") or ""),
        "ingredients_text": ingredients_text,
        "ingredients": parse_ingredients_text(ingredients_text),
        "usage_uz": str(external.get("usage_instructions") or ""),
        "image_url": str(external.get("image_url") or "") or None,
        "is_verified": False,
        "is_published": False,
        "suitable_for": [],
        "not_suitable_for": [],
        "scalp_types": [],
        "concerns": [],
    }
