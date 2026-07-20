from __future__ import annotations

import re

from django.db import transaction

from barbers.models import Barber, BarberService
from salons.catalog_visuals import build_catalog_service_image
from salons.models import CatalogService, Category, Service


CATEGORY_ROWS = [
    # Sartaroshxona
    {"name": "Soch", "icon": "CUT", "order": 0, "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Soqol", "icon": "BRD", "order": 1, "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Kombo", "icon": "SET", "order": 2, "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Parvarish", "icon": "CARE", "order": 3, "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Bolalar", "icon": "KID", "order": 4, "for_barbershop": True, "for_beauty_salon": True},
    # Go'zallik saloni
    {"name": "Manikyur", "icon": "NAIL", "order": 10, "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Pedikyur", "icon": "FOOT", "order": 11, "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Makiyaj", "icon": "MAKE", "order": 12, "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Soch bo'yash", "icon": "DYE", "order": 13, "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Laminatsiya", "icon": "LAM", "order": 14, "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Qosh/kiprik", "icon": "BROW", "order": 15, "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Epilatsiya", "icon": "EPI", "order": 16, "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Spa", "icon": "SPA", "order": 17, "for_barbershop": False, "for_beauty_salon": True},
]

# Shared / barbershop catalog (existing names kept for idempotent seed)
SERVICE_ROWS = [
    {"name": "Soch olish", "category": "Soch", "duration": 30, "description": "Klassik kundalik soch olish.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Fade soch", "category": "Soch", "duration": 40, "description": "Past va yuqori fade bilan zamonaviy kesim.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Machine cut", "category": "Soch", "duration": 20, "description": "Mashinka bilan tez va toza kesim.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Texture styling", "category": "Soch", "duration": 45, "description": "Texturali finish va styling bilan kesim.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Bolalar sochi", "category": "Bolalar", "duration": 30, "description": "Bolalar uchun yengil va qulay kesim.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Soqol trim", "category": "Soqol", "duration": 20, "description": "Soqolni tenglashtirish va kontur berish.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Ustara soqol", "category": "Soqol", "duration": 30, "description": "Issiq sochiq va ustara bilan silliq soqol.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Murt trim", "category": "Soqol", "duration": 15, "description": "Murtni tozalash va shakl berish.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Soch + soqol", "category": "Kombo", "duration": 55, "description": "Eng ko'p tanlanadigan to'liq combo xizmat.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Premium combo", "category": "Kombo", "duration": 75, "description": "Soch, soqol va premium finish bir paketda.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Hot towel shave", "category": "Soqol", "duration": 35, "description": "Issiq sochiq bilan premium soqol xizmati.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Head wash styling", "category": "Parvarish", "duration": 25, "description": "Bosh yuvish va yakuniy styling.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Keratin care", "category": "Parvarish", "duration": 50, "description": "Sochni silliqlash va yumshatish uchun keratin care.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Hair coloring", "category": "Parvarish", "duration": 60, "description": "Soch rangini yangilash yoki tonlash.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Face mask care", "category": "Parvarish", "duration": 25, "description": "Yuzni tozalash va niqob bilan parvarish.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Scalp massage", "category": "Parvarish", "duration": 20, "description": "Bosh terisi uchun relaks massaj.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Eyebrow cleanup", "category": "Parvarish", "duration": 15, "description": "Qosh atrofini tozalash va tekislash.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "Beard coloring", "category": "Soqol", "duration": 35, "description": "Soqol rangini tekislash va yangilash.", "for_barbershop": True, "for_beauty_salon": False},
    {"name": "Wedding styling", "category": "Kombo", "duration": 70, "description": "Muhim kunlar uchun silliq styling paketi.", "for_barbershop": True, "for_beauty_salon": True},
    {"name": "VIP grooming", "category": "Kombo", "duration": 90, "description": "Barbershopdagi eng to'liq premium xizmat.", "for_barbershop": True, "for_beauty_salon": False},
    # Go'zallik saloni
    {"name": "Klassik manikyur", "category": "Manikyur", "duration": 45, "description": "Tirnoq shakli, tozalash va lak.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Apparat manikyur", "category": "Manikyur", "duration": 60, "description": "Apparat bilan chuqur manikyur.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Gel lak", "category": "Manikyur", "duration": 55, "description": "Gel lak qo'llash va dizayn.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Klassik pedikyur", "category": "Pedikyur", "duration": 50, "description": "Oyoq parvarishi va lak.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Apparat pedikyur", "category": "Pedikyur", "duration": 70, "description": "Apparat bilan pedikyur.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Kundalik makiyaj", "category": "Makiyaj", "duration": 40, "description": "Tabiiy kundalik makiyaj.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Kechki makiyaj", "category": "Makiyaj", "duration": 60, "description": "Bayram / kechki makiyaj.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "To'y makiyaji", "category": "Makiyaj", "duration": 90, "description": "To'y kuni uchun professional makiyaj.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Soch bo'yash (to'liq)", "category": "Soch bo'yash", "duration": 120, "description": "Butun sochni bo'yash.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Balayage / ombre", "category": "Soch bo'yash", "duration": 150, "description": "Zamonaviy gradient bo'yash.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Soch laminatsiyasi", "category": "Laminatsiya", "duration": 90, "description": "Sochni silliq va yaltiroq qilish.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Qosh laminatsiyasi", "category": "Laminatsiya", "duration": 45, "description": "Qosh shakli va laminatsiya.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Kiprik laminatsiyasi", "category": "Laminatsiya", "duration": 50, "description": "Kipriklarni ko'tarish va laminatsiya.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Qosh shakllantirish", "category": "Qosh/kiprik", "duration": 25, "description": "Qosh konturi va tozalash.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Kiprik uzaytirish", "category": "Qosh/kiprik", "duration": 90, "description": "Klassik kiprik uzaytirish.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Yuz epilatsiyasi", "category": "Epilatsiya", "duration": 30, "description": "Yuz sochlarini epilatsiya.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Tana epilatsiyasi", "category": "Epilatsiya", "duration": 60, "description": "Tanadagi sochlarni epilatsiya.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Yuz spa", "category": "Spa", "duration": 60, "description": "Yuz tozalash va spa parvarish.", "for_barbershop": False, "for_beauty_salon": True},
    {"name": "Tana massaji", "category": "Spa", "duration": 60, "description": "Relaks tana massaji.", "for_barbershop": False, "for_beauty_salon": True},
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


def filter_catalog_qs_for_kind(qs, business_kind: str):
    """Partner katalogini business_kind bo'yicha filtrlaydi."""
    kind = (business_kind or "").strip()
    if kind == Barber.BusinessKind.BEAUTY_SALON:
        return qs.filter(for_beauty_salon=True)
    # barbershop yoki eski/bo'sh akkauntlar — sartarosh katalogi
    return qs.filter(for_barbershop=True)


_CATALOG_SEED_READY = False


@transaction.atomic
def ensure_default_catalog_seeded() -> None:
    global _CATALOG_SEED_READY
    if _CATALOG_SEED_READY:
        return
    if CatalogService.objects.filter(is_active=True).count() >= len(SERVICE_ROWS):
        _CATALOG_SEED_READY = True
        return

    category_map: dict[str, Category] = {}
    for row in CATEGORY_ROWS:
        category, _ = Category.objects.get_or_create(
            name=row["name"],
            defaults={
                "icon": row["icon"],
                "order": row["order"],
                "is_active": True,
                "for_barbershop": row["for_barbershop"],
                "for_beauty_salon": row["for_beauty_salon"],
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
        if category.for_barbershop != row["for_barbershop"]:
            category.for_barbershop = row["for_barbershop"]
            changed = True
        if category.for_beauty_salon != row["for_beauty_salon"]:
            category.for_beauty_salon = row["for_beauty_salon"]
            changed = True
        if changed:
            category.save(
                update_fields=[
                    "icon",
                    "order",
                    "is_active",
                    "for_barbershop",
                    "for_beauty_salon",
                ]
            )
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
                "for_barbershop": row["for_barbershop"],
                "for_beauty_salon": row["for_beauty_salon"],
            },
        )
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
        if catalog.for_barbershop != row["for_barbershop"]:
            catalog.for_barbershop = row["for_barbershop"]
            changed = True
        if catalog.for_beauty_salon != row["for_beauty_salon"]:
            catalog.for_beauty_salon = row["for_beauty_salon"]
            changed = True
        if changed:
            catalog.save(
                update_fields=[
                    "description",
                    "image_url",
                    "duration_minutes",
                    "is_active",
                    "for_barbershop",
                    "for_beauty_salon",
                ]
            )
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

    _CATALOG_SEED_READY = True
