"""Explore katalogi — DB dan AI Style tavsiyalari uchun."""

from __future__ import annotations

from typing import Any

from ai.age_groups import normalize_age_group, resolve_hairstyle_image_path
from ai.models import Hairstyle

FACE_SHAPES = frozenset({"oval", "round", "square"})
HAIR_LENGTHS = frozenset({"short", "medium", "long"})
HAIR_LENGTH_ORDER = {"short": 0, "medium": 1, "long": 2}
MATCH_SCORES = (94, 88, 82)

StyleEntry = dict[str, Any]


def _styles_for_age_group(styles: list[Hairstyle], age_group: str | None) -> list[Hairstyle]:
    norm_group = normalize_age_group(age_group)
    if not norm_group:
        return styles
    return [style for style in styles if norm_group in (style.age_groups or [])]


def style_to_entry(
    style: Hairstyle,
    age_group: str | None = None,
    persona_id: str | None = None,
) -> StyleEntry:
    groups = list(style.age_groups or [])
    return {
        "id": style.style_id,
        "slug": style.slug,
        "audience": style.audience,
        "category": style.category,
        "title_uz": style.title_uz,
        "face_shapes": list(style.face_shapes or []),
        "hair_length": style.hair_length,
        "description_uz": style.description_uz,
        "age_groups": groups,
        "image_url": resolve_hairstyle_image_path(
            image_path=style.image_path,
            slug=style.slug,
            audience=style.audience,
            age_group=age_group,
            persona_id=persona_id if style.audience == "men" else None,
        ),
    }


def get_published_catalog(
    audience: str | None = None,
    age_group: str | None = None,
    persona_id: str | None = None,
) -> list[StyleEntry]:
    qs = Hairstyle.objects.filter(is_published=True)
    if audience in {"men", "women"}:
        qs = qs.filter(audience=audience)
    norm_group = normalize_age_group(age_group)
    styles = _styles_for_age_group(list(qs), norm_group)
    men_persona = persona_id if audience == "men" else None
    return [style_to_entry(style, norm_group, men_persona) for style in styles]


def score_hairstyle(
    style: StyleEntry,
    face_shape: str,
    hair_type: str,
    age_group: str | None = None,
) -> int:
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
    norm_group = normalize_age_group(age_group)
    if norm_group and norm_group in (style.get("age_groups") or []):
        score += 15
    return score


def pick_catalog_suggestions(
    *,
    audience: str,
    face_shape: str,
    hair_type: str,
    age_group: str | None = None,
    persona_id: str | None = None,
    limit: int = 3,
) -> list[dict[str, Any]]:
    if face_shape not in FACE_SHAPES:
        face_shape = "oval"
    if hair_type not in HAIR_LENGTHS:
        hair_type = "medium"

    men_persona = persona_id if audience == "men" else None
    pool = get_published_catalog(audience, age_group, men_persona)
    if not pool and age_group:
        pool = get_published_catalog(audience, persona_id=men_persona)
    ranked = sorted(
        pool,
        key=lambda style: (
            score_hairstyle(style, face_shape, hair_type, age_group),
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
