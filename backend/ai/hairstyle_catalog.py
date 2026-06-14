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


def _ordered_persona_ids(preferred_persona_id: str | None) -> list[str]:
    from ai.explore_personas import list_explore_personas

    ready = [p["id"] for p in list_explore_personas()]
    norm = (preferred_persona_id or "").strip().lower()
    if norm in ready:
        return [norm] + [pid for pid in ready if pid != norm]
    return ready


def _pick_diverse_styles(ranked: list[StyleEntry], limit: int) -> list[StyleEntry]:
    picked: list[StyleEntry] = []
    used_categories: set[str] = set()

    for style in ranked:
        if len(picked) >= limit:
            break
        if style["category"] in used_categories:
            continue
        picked.append(style)
        used_categories.add(style["category"])

    for style in ranked:
        if len(picked) >= limit:
            break
        if any(item["id"] == style["id"] for item in picked):
            continue
        picked.append(style)

    return picked


def pick_trending_styles(
    *,
    audience: str,
    face_shape: str | None = None,
    hair_type: str | None = None,
    age_group: str | None = None,
    preferred_persona_id: str | None = None,
    limit: int = 6,
) -> list[dict[str, Any]]:
    """Home trending: content-based score + category diversity + persona rotation (men)."""
    if face_shape not in FACE_SHAPES:
        face_shape = "oval"
    if hair_type not in HAIR_LENGTHS:
        hair_type = "medium"

    pool = get_published_catalog(audience, age_group)
    if not pool and age_group:
        pool = get_published_catalog(audience)

    ranked = sorted(
        pool,
        key=lambda style: (
            score_hairstyle(style, face_shape, hair_type, age_group),
            style["slug"],
        ),
        reverse=True,
    )
    diverse = _pick_diverse_styles(ranked, limit)
    personas = _ordered_persona_ids(preferred_persona_id) if audience == "men" else []

    trending: list[dict[str, Any]] = []
    for idx, style in enumerate(diverse):
        persona_id = personas[idx % len(personas)] if personas else None
        image_url = style["image_url"]
        if persona_id:
            from ai.explore_personas import has_persona_style_asset, resolve_persona_style_image

            if has_persona_style_asset(persona_id, style["slug"]):
                image_url = resolve_persona_style_image(
                    audience=audience,
                    persona_id=persona_id,
                    slug=style["slug"],
                )
        trending.append(
            {
                "id": style["id"],
                "title": style["title_uz"],
                "audience": style["audience"],
                "category": style["category"],
                "seed": style["slug"],
                "persona_id": persona_id,
                "image_url": image_url,
            }
        )
    return trending
