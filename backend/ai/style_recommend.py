"""AI Style: jins tekshiruvi va Explore katalogidan tavsiya."""

from __future__ import annotations

from typing import Any

from ai.hairstyle_catalog import pick_catalog_suggestions
from ai.services.gemini_style import AiStyleError

GENDER_MISMATCH_THRESHOLD = 0.75
AUDIENCE_TO_GENDER = {"men": "male", "women": "female"}


def normalize_request_audience(raw: str | None) -> str:
    norm = (raw or "unisex").strip().lower()
    if norm not in {"men", "women", "unisex"}:
        return "unisex"
    return norm


def resolve_ai_style_audience(request_audience: str, analysis: dict[str, Any]) -> str:
    """Profil (men/women) ustun; unisex bo'lsa rasmdan aniqlangan jins."""
    if request_audience in {"men", "women"}:
        return request_audience
    detected = str(analysis.get("detected_gender", "unclear")).lower()
    if detected == "female":
        return "women"
    if detected == "male":
        return "men"
    return "men"


def assert_gender_matches_profile(
    audience: str,
    detected_gender: str,
    gender_confidence: float,
) -> None:
    if audience not in AUDIENCE_TO_GENDER:
        return
    if detected_gender == "unclear" or gender_confidence < GENDER_MISMATCH_THRESHOLD:
        return
    expected = AUDIENCE_TO_GENDER[audience]
    if detected_gender == expected:
        return

    if audience == "men":
        message = (
            "Profilingiz Erkak deb belgilangan. Bu rasmda ayol ko'rinmoqda. "
            "O'z suratingizni yuklang yoki Sozlamalardan qidiruv turini yangilang."
        )
    else:
        message = (
            "Profilingiz Ayol deb belgilangan. Bu rasmda erkak ko'rinmoqda. "
            "O'z suratingizni yuklang yoki Sozlamalardan qidiruv turini yangilang."
        )
    raise AiStyleError(message, 422)


def build_suggestions_from_analysis(
    *,
    request_audience: str,
    analysis: dict[str, Any],
    age_group: str | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    audience = resolve_ai_style_audience(request_audience, analysis)
    assert_gender_matches_profile(
        audience,
        str(analysis.get("detected_gender", "unclear")),
        float(analysis.get("gender_confidence", 0.0)),
    )
    suggestions = pick_catalog_suggestions(
        audience=audience,
        face_shape=str(analysis["face_shape"]),
        hair_type=str(analysis["hair_type"]),
        age_group=age_group,
    )
    return audience, suggestions
