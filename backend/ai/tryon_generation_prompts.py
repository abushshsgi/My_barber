"""English try-on edit prompts per catalog slug (text-only; no catalog images to Runware)."""

from __future__ import annotations

from ai.tryon_prompt_catalog import (
    PRUNA_STYLE_PROMPT_MAX,
    build_style_instruction,
    slugs_needing_manual_review,
)

PRUNA_POSITIVE_PROMPT_MAX = PRUNA_STYLE_PROMPT_MAX

# Appended to every Pruna positivePrompt (combined length capped at 2000).
GLOBAL_IDENTITY_PRESERVATION = (
    "Preserve the exact original person: facial identity, forehead geometry, eyes, eyebrows, nose, lips, "
    "ears, jawline, skin tone, expression and head position. Change only the hairstyle. Preserve clothing, "
    "background, lighting, camera angle and composition. Keep the user's original hair color unless a "
    "different color is explicitly requested. Do not regenerate, reshape, beautify or modify the face."
)

__all__ = [
    "GLOBAL_IDENTITY_PRESERVATION",
    "PRUNA_POSITIVE_PROMPT_MAX",
    "assemble_pruna_positive_prompt",
    "slugs_needing_manual_review",
    "tryon_generation_prompt_for",
]


def tryon_generation_prompt_for(*, audience: str, slug: str, title: str) -> str:
    """Detailed English edit instruction for the selected catalog slug."""
    return build_style_instruction(audience=audience, slug=slug, title=title)


def assemble_pruna_positive_prompt(
    *,
    audience: str,
    slug: str,
    title: str,
    selected_hair_color: str | None = None,
) -> str:
    """Style prompt + identity block, max 2000 characters."""
    explicit = " ".join(str(selected_hair_color or "").split())
    color_suffix = f' Apply this hair color only: "{explicit[:80]}".' if explicit else ""
    room = PRUNA_STYLE_PROMPT_MAX - len(GLOBAL_IDENTITY_PRESERVATION) - 1 - len(color_suffix)
    style = build_style_instruction(
        audience=audience,
        slug=slug,
        title=title,
        max_chars=max(room, 200),
    )
    style = f"{style}{color_suffix}"
    combined = f"{style} {GLOBAL_IDENTITY_PRESERVATION}"
    if len(combined) <= PRUNA_STYLE_PROMPT_MAX:
        return combined
    # Identity must stay intact; tighten style only.
    from ai.tryon_prompt_catalog import _join_with_budget  # noqa: PLC0415

    tighter_room = PRUNA_STYLE_PROMPT_MAX - len(GLOBAL_IDENTITY_PRESERVATION) - 1 - len(color_suffix)
    style = _join_with_budget([(style.removesuffix(color_suffix), False)], limit=max(tighter_room, 200))
    style = f"{style}{color_suffix}"
    return f"{style} {GLOBAL_IDENTITY_PRESERVATION}"