"""Strict product identity verification."""

from __future__ import annotations

from dataclasses import dataclass

from ai.models import CareProduct

from .constants import EXACT_SCORE, MIN_CANDIDATE_SCORE, PROBABLE_SCORE
from .fuzzy import token_ratio
from .normalize import extract_volume_ml, normalize_product_text
from .search import _care_volume_guess


@dataclass
class VerifiedCandidate:
    product: CareProduct
    score: float
    brand_match: bool
    volume_conflict: bool
    name_ratio: float


def score_product_match(signals: dict, care: CareProduct) -> VerifiedCandidate:
    brand_norm = str(signals.get("brand_norm") or "")
    name_norm = str(signals.get("name_norm") or "")
    combined = normalize_product_text(f"{care.brand} {care.name}")
    care_brand_norm = normalize_product_text(care.brand)
    care_name_norm = normalize_product_text(care.name)

    brand_match = bool(brand_norm and care_brand_norm and (
        brand_norm == care_brand_norm or token_ratio(brand_norm, care_brand_norm) >= 0.85
    ))
    name_ratio = token_ratio(name_norm or combined, care_name_norm or combined) if name_norm or combined else 0.0
    if not name_ratio:
        name_ratio = token_ratio(str(signals.get("combined_norm") or ""), combined)

    vol_conflict = False
    ocr_vol = signals.get("volume_ml")
    if isinstance(ocr_vol, int):
        care_vol = _care_volume_guess(care)
        if care_vol and abs(care_vol - ocr_vol) > 80:
            vol_conflict = True

    score = name_ratio
    if brand_match:
        score = min(1.0, score + 0.08)
    if vol_conflict:
        score = max(0.0, score - 0.22)
    if brand_norm and not brand_match:
        score = max(0.0, score - 0.25)

    return VerifiedCandidate(
        product=care,
        score=round(score, 4),
        brand_match=brand_match,
        volume_conflict=vol_conflict,
        name_ratio=round(name_ratio, 4),
    )


def verify_candidate_list(signals: dict, products: list[CareProduct]) -> list[VerifiedCandidate]:
    scored = [score_product_match(signals, p) for p in products]
    scored = [s for s in scored if s.score >= MIN_CANDIDATE_SCORE]
    scored.sort(key=lambda s: s.score, reverse=True)
    return scored


def classify_from_scores(scored: list[VerifiedCandidate]) -> str:
    from .constants import AMBIGUOUS, EXACT_MATCH, NOT_FOUND, PROBABLE_MATCH

    if not scored:
        return NOT_FOUND
    top = scored[0]
    if top.volume_conflict and top.score < EXACT_SCORE:
        return AMBIGUOUS
    if top.score >= EXACT_SCORE and top.brand_match and not top.volume_conflict:
        if len(scored) == 1:
            return EXACT_MATCH
        second = scored[1]
        if second.score >= PROBABLE_SCORE and (top.score - second.score) < 0.06:
            return AMBIGUOUS
        return EXACT_MATCH
    if top.score >= PROBABLE_SCORE:
        if len(scored) > 1 and scored[1].score >= PROBABLE_SCORE and (top.score - scored[1].score) < 0.08:
            return AMBIGUOUS
        return PROBABLE_MATCH
    if len(scored) >= 2:
        return AMBIGUOUS
    return PROBABLE_MATCH


def validate_ai_product_id(raw_id: object, scored: list[VerifiedCandidate]) -> int | None:
    if not isinstance(raw_id, int):
        if isinstance(raw_id, str) and raw_id.isdigit():
            raw_id = int(raw_id)
        else:
            return None
    allowed = {s.product.pk for s in scored}
    if raw_id not in allowed:
        return None
    match = next((s for s in scored if s.product.pk == raw_id), None)
    if match and match.score >= PROBABLE_SCORE and not match.volume_conflict:
        return raw_id
    return None