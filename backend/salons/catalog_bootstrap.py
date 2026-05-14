from __future__ import annotations

import re

from django.db import transaction

from barbers.models import BarberService
from salons.catalog_visuals import build_catalog_service_image
from salons.models import CatalogService, Category, Service


CATEGORY_ROWS = [
    {"name": "Soch", "icon": "CUT", "order": 0},
    {"name": "Soqol", "icon": "BRD", "order": 1},
    {"name": "Kombo", "icon": "SET", "order": 2},
    {"name": "Parvarish", "icon": "CARE", "order": 3},
    {"name": "Bolalar", "icon": "KID", "order": 4},
]

SERVICE_ROWS = [
    {"name": "Soch olish", "category": "Soch", "duration": 30, "description": "Klassik kundalik soch olish."},
    {"name": "Fade soch", "category": "Soch", "duration": 40, "description": "Past va yuqori fade bilan zamonaviy kesim."},
    {"name": "Machine cut", "category": "Soch", "duration": 20, "description": "Mashinka bilan tez va toza kesim."},
    {"name": "Texture styling", "category": "Soch", "duration": 45, "description": "Texturali finish va styling bilan kesim."},
    {"name": "Bolalar sochi", "category": "Bolalar", "duration": 30, "description": "Bolalar uchun yengil va qulay kesim."},
    {"name": "Soqol trim", "category": "Soqol", "duration": 20, "description": "Soqolni tenglashtirish va kontur berish."},
    {"name": "Ustara soqol", "category": "Soqol", "duration": 30, "description": "Issiq sochiq va ustara bilan silliq soqol."},
    {"name": "Murt trim", "category": "Soqol", "duration": 15, "description": "Murtni tozalash va shakl berish."},
    {"name": "Soch + soqol", "category": "Kombo", "duration": 55, "description": "Eng ko'p tanlanadigan to'liq combo xizmat."},
    {"name": "Premium combo", "category": "Kombo", "duration": 75, "description": "Soch, soqol va premium finish bir paketda."},
    {"name": "Hot towel shave", "category": "Soqol", "duration": 35, "description": "Issiq sochiq bilan premium soqol xizmati."},
    {"name": "Head wash styling", "category": "Parvarish", "duration": 25, "description": "Bosh yuvish va yakuniy styling."},
    {"name": "Keratin care", "category": "Parvarish", "duration": 50, "description": "Sochni silliqlash va yumshatish uchun keratin care."},
    {"name": "Hair coloring", "category": "Parvarish", "duration": 60, "description": "Soch rangini yangilash yoki tonlash."},
    {"name": "Face mask care", "category": "Parvarish", "duration": 25, "description": "Yuzni tozalash va niqob bilan parvarish."},
    {"name": "Scalp massage", "category": "Parvarish", "duration": 20, "description": "Bosh terisi uchun relaks massaj."},
    {"name": "Eyebrow cleanup", "category": "Parvarish", "duration": 15, "description": "Qosh atrofini tozalash va tekislash."},
    {"name": "Beard coloring", "category": "Soqol", "duration": 35, "description": "Soqol rangini tekislash va yangilash."},
    {"name": "Wedding styling", "category": "Kombo", "duration": 70, "description": "Muhim kunlar uchun silliq styling paketi."},
    {"name": "VIP grooming", "category": "Kombo", "duration": 90, "description": "Barbershopdagi eng to'liq premium xizmat."},
]


def _normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def _match_catalog(row_name: str, normalized_map: dict[str, CatalogService]) -> CatalogService | None:
    normalized = _normalize_name(row_name)
    if not normalized:
        return None
    if normalized in normalized_map:
        return normalized_map[normalized]

    matches: list[tuple[int, CatalogService]] = []
    for key, value in normalized_map.items():
        if normalized in key or key in normalized:
            matches.append((len(key), value))
    if not matches:
        return None
    matches.sort(key=lambda item: item[0], reverse=True)
    return matches[0][1]


@transaction.atomic
def ensure_default_catalog_seeded() -> None:
    category_map: dict[str, Category] = {}
    for row in CATEGORY_ROWS:
        category, _ = Category.objects.get_or_create(
            name=row["name"],
            defaults={
                "icon": row["icon"],
                "order": row["order"],
                "is_active": True,
            },
        )
        changed = False
        if not category.icon:
            category.icon = row["icon"]
            changed = True
        if category.order != row["order"]:
            category.order = row["order"]
            changed = True
        if not category.is_active:
            category.is_active = True
            changed = True
        if changed:
            category.save(update_fields=["icon", "order", "is_active"])
        category_map[row["name"]] = category

    catalog_map: dict[str, CatalogService] = {}
    for index, row in enumerate(SERVICE_ROWS):
        catalog, created = CatalogService.objects.get_or_create(
            name=row["name"],
            defaults={
                "description": row["description"],
                "image_url": build_catalog_service_image(row["name"], index=index),
                "duration_minutes": row["duration"],
                "is_active": True,
                "sort_order": index,
            },
        )
        changed = False
        if created:
            changed = False
        if not catalog.image_url:
            catalog.image_url = build_catalog_service_image(catalog.name, index=index)
            changed = True
        if not catalog.description:
            catalog.description = row["description"]
            changed = True
        if not catalog.duration_minutes:
            catalog.duration_minutes = row["duration"]
            changed = True
        if not catalog.is_active:
            catalog.is_active = True
            changed = True
        if changed:
            catalog.save(update_fields=["description", "image_url", "duration_minutes", "is_active"])
        category = category_map[row["category"]]
        if not catalog.categories.filter(id=category.id).exists():
            catalog.categories.add(category)
        catalog_map[_normalize_name(catalog.name)] = catalog

    for row in Service.objects.select_related("catalog_service").all():
        if row.catalog_service_id:
            continue
        catalog = _match_catalog(row.name, catalog_map)
        if catalog is None:
            continue
        row.catalog_service = catalog
        row.name = catalog.name
        row.duration_minutes = catalog.duration_minutes
        row.save(update_fields=["catalog_service", "name", "duration_minutes"])
        row.categories.set(catalog.categories.all())

    for row in BarberService.objects.select_related("catalog_service").all():
        if row.catalog_service_id:
            continue
        catalog = _match_catalog(row.name, catalog_map)
        if catalog is None:
            continue
        row.catalog_service = catalog
        row.name = catalog.name
        row.duration_minutes = catalog.duration_minutes
        row.save(update_fields=["catalog_service", "name", "duration_minutes"])
        row.categories.set(catalog.categories.all())
