"""Explore katalogi — AI Style tavsiyalari uchun (frontend catalog.ts bilan mos)."""

from __future__ import annotations

from typing import Any

FACE_SHAPES = frozenset({"oval", "round", "square"})
HAIR_LENGTHS = frozenset({"short", "medium", "long"})
HAIR_LENGTH_ORDER = {"short": 0, "medium": 1, "long": 2}
MATCH_SCORES = (94, 88, 82)

StyleEntry = dict[str, Any]

_STYLE_DEFS: list[tuple[str, dict[str, Any]]] = [
    (
        "men",
        {
            "slug": "mid-fade",
            "title_uz": "Mid Fade",
            "face_shapes": ["oval", "square", "round"],
            "hair_length": "short",
            "description_uz": "O'rta balandlikdagi fade — yuz konturini yumshatadi, zamonaviy va toza ko'rinish.",
        },
    ),
    (
        "men",
        {
            "slug": "low-fade",
            "title_uz": "Low Fade",
            "face_shapes": ["oval", "square"],
            "hair_length": "short",
            "description_uz": "Past fade — tabiiy o'tish, kundalik parvarish oson.",
        },
    ),
    (
        "men",
        {
            "slug": "skin-fade",
            "title_uz": "Skin Fade",
            "face_shapes": ["oval", "square"],
            "hair_length": "short",
            "description_uz": "Zero fade — keskin siluet, jasur va zamonaviy uslub.",
        },
    ),
    (
        "men",
        {
            "slug": "buzz-cut",
            "title_uz": "Buzz Cut",
            "face_shapes": ["oval", "square", "round"],
            "hair_length": "short",
            "description_uz": "Qisqa va amaliy — minimal parvarish, sportiv ko'rinish.",
        },
    ),
    (
        "men",
        {
            "slug": "textured-crop",
            "title_uz": "Textured Crop",
            "face_shapes": ["oval", "round"],
            "hair_length": "short",
            "description_uz": "Teksturali crop — hajm tepada, yonlar qisqa, yosh va zamonaviy.",
        },
    ),
    (
        "men",
        {
            "slug": "pompadour",
            "title_uz": "Pompadour",
            "face_shapes": ["oval", "square"],
            "hair_length": "medium",
            "description_uz": "Tepada hajm — klassik va nafis, burchak yuz uchun ajoyib balans.",
        },
    ),
    (
        "men",
        {
            "slug": "undercut",
            "title_uz": "Undercut",
            "face_shapes": ["oval", "square"],
            "hair_length": "medium",
            "description_uz": "Yonlar qisqa, tepa uzunroq — kontrastli zamonaviy uslub.",
        },
    ),
    (
        "men",
        {
            "slug": "side-part",
            "title_uz": "Klassik side part",
            "face_shapes": ["oval", "square", "round"],
            "hair_length": "short",
            "description_uz": "Klassik yon chiziq — doimiy trend, rasmiy va kundalik uchun mos.",
        },
    ),
    (
        "men",
        {
            "slug": "french-crop",
            "title_uz": "French Crop",
            "face_shapes": ["oval", "round", "square"],
            "hair_length": "short",
            "description_uz": "Qisqa old chiziq — yosh ko'rinish, oson ushlash.",
        },
    ),
    (
        "men",
        {
            "slug": "slick-back",
            "title_uz": "Slick Back",
            "face_shapes": ["oval", "square"],
            "hair_length": "medium",
            "description_uz": "Orqaga taralgan soch — nafis va ishonchli ko'rinish.",
        },
    ),
    (
        "men",
        {
            "slug": "curly-top-fade",
            "title_uz": "Curly Top Fade",
            "face_shapes": ["oval", "round"],
            "hair_length": "medium",
            "description_uz": "Tepada jingalak soch + fade yonlar — tabiiy hajm va struktura.",
        },
    ),
    (
        "men",
        {
            "slug": "modern-mullet",
            "title_uz": "Modern Mullet",
            "face_shapes": ["oval", "square"],
            "hair_length": "long",
            "description_uz": "Zamonaviy mullet — old qisqa, orqa uzunroq, trend uslub.",
        },
    ),
    (
        "women",
        {
            "slug": "soft-bob",
            "title_uz": "Soft Bob",
            "face_shapes": ["oval", "round", "square"],
            "hair_length": "medium",
            "description_uz": "Yumshoq bob — yuz ramkasini chiroyli beradi, har qanday vaziyatga mos.",
        },
    ),
    (
        "women",
        {
            "slug": "long-layers",
            "title_uz": "Uzun qatlamlar",
            "face_shapes": ["oval", "round"],
            "hair_length": "long",
            "description_uz": "Uzun qatlamlar — hajm va harakat, yuzni uzaytiradi.",
        },
    ),
    (
        "women",
        {
            "slug": "balayage",
            "title_uz": "Balayage",
            "face_shapes": ["oval", "square", "round"],
            "hair_length": "long",
            "description_uz": "Tabiiy rang o'tishlari — yorug'lik va chuqurlik muvozanati.",
        },
    ),
    (
        "women",
        {
            "slug": "pixie-cut",
            "title_uz": "Pixie Cut",
            "face_shapes": ["oval", "square"],
            "hair_length": "short",
            "description_uz": "Qisqa pixie — jasur va zamonaviy, yuz xususiyatlarini ta'kidlaydi.",
        },
    ),
    (
        "women",
        {
            "slug": "beach-waves",
            "title_uz": "Beach Waves",
            "face_shapes": ["oval", "round"],
            "hair_length": "medium",
            "description_uz": "Tabiiy to'lqinlar — yengil va romantik ko'rinish.",
        },
    ),
    (
        "women",
        {
            "slug": "straight-lob",
            "title_uz": "Straight Lob",
            "face_shapes": ["oval", "round", "square"],
            "hair_length": "medium",
            "description_uz": "To'g'ri lob — zamonaviy va silliq, yuz shaklini muvozanatlaydi.",
        },
    ),
    (
        "women",
        {
            "slug": "curtain-bangs",
            "title_uz": "Curtain Bangs",
            "face_shapes": ["oval", "round", "square"],
            "hair_length": "medium",
            "description_uz": "Parda bang — yuzni yumshatadi, trend va universal uslub.",
        },
    ),
    (
        "women",
        {
            "slug": "shag-cut",
            "title_uz": "Shag Cut",
            "face_shapes": ["oval", "round"],
            "hair_length": "medium",
            "description_uz": "Qatlamlangan shag — hajm va tekstura, 70-yillar zamonaviy talqini.",
        },
    ),
    (
        "women",
        {
            "slug": "braids",
            "title_uz": "O'rilmalar",
            "face_shapes": ["oval", "square", "round"],
            "hair_length": "long",
            "description_uz": "O'rilmalar — amaliy va nafis, maxsus kunlar uchun ajoyib tanlov.",
        },
    ),
    (
        "women",
        {
            "slug": "updo-bun",
            "title_uz": "Updo / Bun",
            "face_shapes": ["oval", "square", "round"],
            "hair_length": "medium",
            "description_uz": "Yig'ilgan soch — toza va nafis, bayram va rasmiy tadbirlar uchun.",
        },
    ),
    (
        "women",
        {
            "slug": "blunt-cut",
            "title_uz": "Blunt Cut",
            "face_shapes": ["oval", "round"],
            "hair_length": "medium",
            "description_uz": "To'g'ri kesim — aniq chegaralar, zamonaviy minimalist ko'rinish.",
        },
    ),
    (
        "women",
        {
            "slug": "highlights",
            "title_uz": "Highlights",
            "face_shapes": ["oval", "square", "round"],
            "hair_length": "medium",
            "description_uz": "Yorug'lik streaklari — yuzni yoritadi, hajm illuziyasi beradi.",
        },
    ),
]


def _build_catalog() -> list[StyleEntry]:
    catalog: list[StyleEntry] = []
    for audience, definition in _STYLE_DEFS:
        slug = definition["slug"]
        category = "barber" if audience == "men" else "beauty"
        catalog.append(
            {
                "id": f"{audience}-{slug}",
                "slug": slug,
                "audience": audience,
                "category": category,
                "title_uz": definition["title_uz"],
                "face_shapes": definition["face_shapes"],
                "hair_length": definition["hair_length"],
                "description_uz": definition["description_uz"],
                "image_url": f"/hairstyles/{audience}/{slug}.webp",
            }
        )
    return catalog


HAIRSTYLE_CATALOG: list[StyleEntry] = _build_catalog()


def score_hairstyle(style: StyleEntry, face_shape: str, hair_type: str) -> int:
    score = 0
    if face_shape in style["face_shapes"]:
        score += 30
    style_len = style["hair_length"]
    if style_len == hair_type:
        score += 20
    else:
        diff = abs(HAIR_LENGTH_ORDER[style_len] - HAIR_LENGTH_ORDER[hair_type])
        if diff == 1:
            score += 8
        elif diff == 2:
            score += 2
    return score


def pick_catalog_suggestions(
    *,
    audience: str,
    face_shape: str,
    hair_type: str,
    limit: int = 3,
) -> list[dict[str, Any]]:
    if face_shape not in FACE_SHAPES:
        face_shape = "oval"
    if hair_type not in HAIR_LENGTHS:
        hair_type = "medium"

    pool = [s for s in HAIRSTYLE_CATALOG if s["audience"] == audience]
    ranked = sorted(
        pool,
        key=lambda style: (
            score_hairstyle(style, face_shape, hair_type),
            style["slug"],
        ),
        reverse=True,
    )
    top = ranked[:limit]
    suggestions: list[dict[str, Any]] = []
    for idx, style in enumerate(top):
        suggestions.append(
            {
                "id": style["id"],
                "title": style["title_uz"],
                "match": MATCH_SCORES[idx] if idx < len(MATCH_SCORES) else 80,
                "reason_uz": style["description_uz"],
                "category": style["category"],
                "seed": style["slug"],
                "image_url": style["image_url"],
            }
        )
    return suggestions
