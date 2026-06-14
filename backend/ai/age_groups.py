"""Yosh guruhlari — Explore va AI Style moslashuvi uchun."""

from __future__ import annotations

from datetime import date

AGE_GROUPS = frozenset({"kids", "teen", "young", "adult", "mature"})

AGE_GROUP_LABELS_UZ = {
    "kids": "Bolalar (10–12)",
    "teen": "O'smirlar (13–17)",
    "young": "Yosh (18–29)",
    "adult": "30+",
    "mature": "Katta yosh (45+)",
}


def age_to_group(age: int | None) -> str | None:
    if age is None:
        return None
    if age <= 12:
        return "kids"
    if age <= 17:
        return "teen"
    if age <= 29:
        return "young"
    if age <= 44:
        return "adult"
    return "mature"


def birth_year_to_age(birth_year: int | None) -> int | None:
    if birth_year is None:
        return None
    age = date.today().year - birth_year
    if age < 10 or age > 120:
        return None
    return age


def birth_year_to_group(birth_year: int | None) -> str | None:
    return age_to_group(birth_year_to_age(birth_year))


def normalize_age_group(raw: str | None) -> str | None:
    value = (raw or "").strip().lower()
    if value in AGE_GROUPS:
        return value
    return None


def resolve_hairstyle_image_path(
    *,
    image_path: str,
    slug: str,
    audience: str,
    age_group: str | None,
    persona_id: str | None = None,
) -> str:
    if persona_id:
        from ai.explore_personas import has_persona_style_asset, resolve_persona_style_image

        if has_persona_style_asset(persona_id, slug):
            return resolve_persona_style_image(
                audience=audience,
                persona_id=persona_id,
                slug=slug,
            )
    if not age_group or age_group == "young":
        return image_path
    return f"/hairstyles/{audience}/{age_group}/{slug}.webp"
