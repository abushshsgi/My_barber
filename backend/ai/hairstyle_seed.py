"""Boshlang'ich Explore soch uslublari — Old Money orqa jingalak uslublari."""

from __future__ import annotations

# Yosh guruhlari: kids (10–12), teen (13–17), young (18–29), adult (30–44), mature (45+)

HAIRSTYLE_SEED: list[dict] = [
    {
        "style_id": "men-old-money-loose-curl",
        "slug": "old-money-loose-curl",
        "audience": "men",
        "category": "barber",
        "title": "Old Money Loose Curl",
        "title_uz": "Old Money Loose Curl",
        "face_shapes": ["oval", "square", "round"],
        "hair_length": "medium",
        "image_path": "/hairstyles/men/personas/irland/old-money-loose-curl.webp",
        "description_uz": (
            "Old money — yumshoq ochiq jingalaklar orqada oqib tushadi, "
            "toza siluet va premium ko'rinish."
        ),
        "tags": ["old-money", "curly", "back", "premium"],
        "age_groups": ["teen", "young", "adult", "mature"],
        "sort_order": 0,
    },
    {
        "style_id": "men-old-money-soft-wave",
        "slug": "old-money-soft-wave",
        "audience": "men",
        "category": "barber",
        "title": "Old Money Soft Wave",
        "title_uz": "Old Money Soft Wave",
        "face_shapes": ["oval", "square"],
        "hair_length": "medium",
        "image_path": "/hairstyles/men/personas/irland/old-money-soft-wave.webp",
        "description_uz": (
            "Yumshoq S-to'lqinlar — nafis old money uslubi, "
            "orqa tomonda silliq va tartibli to'lqin."
        ),
        "tags": ["old-money", "wavy", "back", "classic"],
        "age_groups": ["teen", "young", "adult", "mature"],
        "sort_order": 1,
    },
    {
        "style_id": "men-old-money-defined-curl",
        "slug": "old-money-defined-curl",
        "audience": "men",
        "category": "barber",
        "title": "Old Money Defined Curl",
        "title_uz": "Old Money Defined Curl",
        "face_shapes": ["oval", "round"],
        "hair_length": "medium",
        "image_path": "/hairstyles/men/personas/irland/old-money-defined-curl.webp",
        "description_uz": (
            "Aniq spiral jingalaklar — orqa va ense to'liq ko'rinadi, "
            "premium va tartibli shakl."
        ),
        "tags": ["old-money", "curly", "defined", "back"],
        "age_groups": ["teen", "young", "adult", "mature"],
        "sort_order": 2,
    },
    {
        "style_id": "men-old-money-layered-curl",
        "slug": "old-money-layered-curl",
        "audience": "men",
        "category": "barber",
        "title": "Old Money Layered Curl",
        "title_uz": "Old Money Layered Curl",
        "face_shapes": ["oval", "square", "round"],
        "hair_length": "medium",
        "image_path": "/hairstyles/men/personas/irland/old-money-layered-curl.webp",
        "description_uz": (
            "Qatlamli jingalak — tepada hajm, orqada oqib tushuvchi "
            "uzunroq jingalaklar, old money siluet."
        ),
        "tags": ["old-money", "curly", "layered", "back"],
        "age_groups": ["young", "adult", "mature"],
        "sort_order": 3,
    },
    {
        "style_id": "men-old-money-tousled-curl",
        "slug": "old-money-tousled-curl",
        "audience": "men",
        "category": "barber",
        "title": "Old Money Tousled Curl",
        "title_uz": "Old Money Tousled Curl",
        "face_shapes": ["oval", "square"],
        "hair_length": "medium",
        "image_path": "/hairstyles/men/personas/irland/old-money-tousled-curl.webp",
        "description_uz": (
            "Yengil taralgan jingalak — beparvo lekin premium, "
            "orqa tomondan tabiiy old money ko'rinish."
        ),
        "tags": ["old-money", "curly", "tousled", "back"],
        "age_groups": ["teen", "young", "adult", "mature"],
        "sort_order": 4,
    },
]
