"""Multi-stage duplicate detection for product submissions."""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from hair_advisor.services.image_similarity import image_similarity_score, submission_primary_image_hash
from hair_advisor.services.ingredient_engine import normalize_ingredient_list

IMAGE_SIMILARITY_THRESHOLD = 0.82

# Conservative thresholds — configurable via settings later
BRAND_NAME_THRESHOLD = 0.82
INCI_SAME_THRESHOLD = 0.88
INCI_CONFLICT_THRESHOLD = 0.65


def _norm_text(value: str) -> str:
    t = (value or "").strip().lower()
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    return re.sub(r"\s+", " ", t).strip()


def text_similarity(a: str, b: str) -> float:
    na, nb = _norm_text(a), _norm_text(b)
    if not na or not nb:
        return 0.0
    return SequenceMatcher(None, na, nb).ratio()


def inci_jaccard(a: list[str] | None, b: list[str] | None) -> float:
    sa = {x.lower() for x in normalize_ingredient_list(a)}
    sb = {x.lower() for x in normalize_ingredient_list(b)}
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def compare_submission_to_candidate(submission: Any, candidate: Any) -> dict[str, Any]:
    """Return match stage, score, and conflict flags."""
    barcode_a = "".join(c for c in (submission.barcode or "") if c.isdigit())
    barcode_b = "".join(c for c in (candidate.proposed_barcode or "") if c.isdigit())

    ingredients = submission.user_corrected_ingredients or submission.normalized_ingredients
    evidence = candidate.proposed_field_evidence or {}
    inci_key = evidence.get("inci_consensus_key")
    candidate_inci = evidence.get("inci_lists", {}).get(inci_key, []) if inci_key else []

    stage = ""
    score = 0.0
    conflicts: list[str] = []

    if barcode_a and barcode_b and barcode_a == barcode_b:
        stage = "A"
        score = 1.0
        j = inci_jaccard(ingredients, candidate_inci)
        if candidate_inci and j < INCI_CONFLICT_THRESHOLD:
            conflicts.append("inci_mismatch_same_barcode")
        elif candidate_inci and j >= INCI_SAME_THRESHOLD:
            score = min(1.0, score + 0.05)
    else:
        brand_score = text_similarity(submission.submitted_brand, candidate.proposed_brand)
        name_score = text_similarity(submission.submitted_product_name, candidate.proposed_product_name)
        meta = (brand_score + name_score) / 2.0
        if meta >= BRAND_NAME_THRESHOLD:
            stage = "B"
            score = meta
            if submission.product_size and candidate.proposed_size:
                if _norm_text(submission.product_size) != _norm_text(candidate.proposed_size):
                    conflicts.append("size_mismatch")
        j = inci_jaccard(ingredients, candidate_inci)
        if j >= INCI_SAME_THRESHOLD:
            stage = stage or "C"
            score = max(score, j)
        elif j > 0 and j < INCI_CONFLICT_THRESHOLD and barcode_a and barcode_a == barcode_b:
            conflicts.append("inci_mismatch")

    img_score = 0.0
    sub_hash = submission_primary_image_hash(submission)
    if sub_hash and hasattr(candidate, "submission_links"):
        for link in candidate.submission_links.select_related("submission").all()[:12]:
            other = link.submission
            if other.pk == submission.pk:
                continue
            oh = submission_primary_image_hash(other)
            if oh:
                img_score = max(img_score, image_similarity_score(sub_hash, oh))
        if img_score >= IMAGE_SIMILARITY_THRESHOLD and not stage:
            stage = "D"
            score = max(score, img_score * 0.95)
        elif img_score >= IMAGE_SIMILARITY_THRESHOLD:
            score = max(score, img_score * 0.5)

    return {
        "stage": stage,
        "score": round(score, 4),
        "conflicts": conflicts,
        "inci_similarity": inci_jaccard(ingredients, candidate_inci),
        "image_similarity": round(img_score, 4),
    }