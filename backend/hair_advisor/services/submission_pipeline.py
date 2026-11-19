"""User product submission OCR and normalization."""

from __future__ import annotations

import base64
import re
from typing import Any

from ai.models import HairCareProfile
from ai.services.care_catalog_context import build_care_catalog_context
from ai.services.gemini_ingredient import analyze_ingredient_from_data_url
from django.core.files.base import ContentFile

from hair_advisor.models import ProductSubmission
from django.conf import settings

from hair_advisor.services.aggregation import aggregate_submission
from hair_advisor.tasks import defer_aggregate_submission
from hair_advisor.services.ingredient_engine import normalize_ingredient_list


def _decode_data_url(data_url: str) -> tuple[bytes, str]:
    if not data_url.startswith("data:"):
        return b"", ""
    header, _, body = data_url.partition(",")
    mime = "image/jpeg"
    if ";" in header:
        mime = header.split(";")[0].replace("data:", "") or mime
    try:
        return base64.b64decode(body), mime
    except Exception:
        return b"", mime


def _ext_from_mime(mime: str) -> str:
    if "png" in mime:
        return "png"
    if "webp" in mime:
        return "webp"
    return "jpg"


def extract_from_label_image(
    submission: ProductSubmission,
    image_data_url: str,
    profile: HairCareProfile,
    user,
) -> dict[str, Any]:
    catalog_block = build_care_catalog_context()
    gender = (getattr(user, "gender", None) or "").strip().lower()
    result = analyze_ingredient_from_data_url(
        image_data_url,
        profile,
        catalog_block=catalog_block,
        gender=gender,
    )
    ingredients = result.get("ingredients") if isinstance(result.get("ingredients"), list) else []
    analysis = result.get("product_analysis") if isinstance(result.get("product_analysis"), dict) else {}

    submission.raw_ocr_result = result if isinstance(result, dict) else {}
    submission.normalized_ingredients = normalize_ingredient_list(ingredients)
    if not submission.submitted_product_name:
        submission.submitted_product_name = str(analysis.get("product_name") or "")[:160]
    if not submission.submitted_brand:
        submission.submitted_brand = str(analysis.get("brand") or "")[:120]
    if not submission.product_size:
        submission.product_size = str(analysis.get("size") or "")[:40]
    country = str(analysis.get("country") or analysis.get("manufacturing_country") or "").strip()
    if country and not submission.claimed_country:
        submission.claimed_country = country[:80]

    submission.recognition_confidence = {
        "ingredient_count": len(submission.normalized_ingredients),
        "ocr_provider": "gemini",
    }
    submission.status = ProductSubmission.Status.READY
    submission.save()
    return {
        "ingredients": submission.normalized_ingredients,
        "ocr": submission.raw_ocr_result,
    }


def finalize_submission(submission: ProductSubmission, *, ingredients: list[str] | None = None) -> ProductSubmission:
    if ingredients is not None:
        submission.user_corrected_ingredients = normalize_ingredient_list(ingredients)
    submission.status = ProductSubmission.Status.SUBMITTED
    submission.save(update_fields=["user_corrected_ingredients", "status", "updated_at"])
    if getattr(settings, "HAIR_ADVISOR_SYNC_AGGREGATION", False):
        aggregate_submission(submission)
    else:
        defer_aggregate_submission(submission.pk)
    return submission


_IMAGE_FIELDS = {
    "front": "front_image",
    "back": "back_image",
    "ingredient_label": "ingredient_label_image",
    "barcode": "barcode_image",
}


def save_submission_image(submission: ProductSubmission, role: str, data_url: str) -> None:
    attr = _IMAGE_FIELDS.get(role, role)
    raw, mime = _decode_data_url(data_url)
    if not raw:
        return
    ext = _ext_from_mime(mime)
    name = f"{submission.id}-{role}.{ext}"
    content = ContentFile(raw, name=name)
    image_field = getattr(submission, attr)
    image_field.save(name, content, save=True)