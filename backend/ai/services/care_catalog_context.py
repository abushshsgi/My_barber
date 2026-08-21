"""Admin CareProduct katalogini Gemini prompt uchun ixcham matnga aylantirish."""

from __future__ import annotations

from typing import Any

from ai.models import CareProduct

MAX_PRODUCTS = 100
MAX_INGREDIENTS_PER_PRODUCT = 40
MAX_TEXT_FIELD = 160
MAX_CATALOG_CHARS = 14_000


def _clip(text: str, limit: int = MAX_TEXT_FIELD) -> str:
    cleaned = " ".join((text or "").split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: max(0, limit - 1)].rstrip() + "…"


def _ingredient_list(product: CareProduct) -> list[str]:
    raw = product.ingredients if isinstance(product.ingredients, list) else []
    out: list[str] = []
    for item in raw:
        name = str(item or "").strip()
        if name and name not in out:
            out.append(name)
        if len(out) >= MAX_INGREDIENTS_PER_PRODUCT:
            break
    if out:
        return out
    from ai.services.care_match import parse_ingredients_text

    return parse_ingredients_text(product.ingredients_text)[:MAX_INGREDIENTS_PER_PRODUCT]


def _tags(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        tag = str(item or "").strip().lower()
        if tag and tag not in out:
            out.append(tag)
    return out


def format_product_line(product: CareProduct) -> str:
    ings = _ingredient_list(product)
    ings_s = ", ".join(ings) if ings else "(inci yo'q)"
    suitable = ",".join(_tags(product.suitable_for)) or "-"
    unsuitable = ",".join(_tags(product.not_suitable_for)) or "-"
    parts = [
        f"id={product.pk}",
        f"name={_clip(product.name, 80)}",
        f"brand={_clip(product.brand or '-', 60)}",
        f"cat={product.category}",
        f"suitable={suitable}",
        f"not_suitable={unsuitable}",
        f"inci=[{ings_s}]",
    ]
    if product.pros_uz:
        parts.append(f"pros={_clip(product.pros_uz)}")
    if product.cons_uz:
        parts.append(f"cons={_clip(product.cons_uz)}")
    if product.warnings_uz:
        parts.append(f"warn={_clip(product.warnings_uz)}")
    return " | ".join(parts)


def build_care_catalog_context(*, max_products: int = MAX_PRODUCTS) -> str:
    """Published CareProduct lardan Gemini uchun ADMIN_CARE_CATALOG matni."""
    qs = CareProduct.objects.filter(is_published=True).order_by(
        "sort_order", "name"
    )[: max(1, max_products)]
    lines: list[str] = []
    total = 0
    for product in qs:
        line = format_product_line(product)
        if total + len(line) + 1 > MAX_CATALOG_CHARS:
            break
        lines.append(line)
        total += len(line) + 1
    if not lines:
        return "(katalog bo'sh — admin hali mahsulot qo'shmagan)"
    return "\n".join(lines)
