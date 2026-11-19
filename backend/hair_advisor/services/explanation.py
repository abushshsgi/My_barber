"""LLM explanation — evidence-backed, schema-validated."""

from __future__ import annotations

import json
import logging
from typing import Any

from ai.services.errors import AiStyleError

from hair_advisor.services.gemini_explain import (
    gemini_explain_json,
    validate_explanation_payload,
)

logger = logging.getLogger(__name__)


def _deterministic_fallback(deterministic: dict[str, Any]) -> dict[str, Any]:
    rec = deterministic.get("recommendation") or "INSUFFICIENT_DATA"
    if rec == "POTENTIAL_MATCH":
        exp = (
            "Tarkib va profilingiz bo'yicha bu mahsulot ehtimoliy mos kelishi mumkin. "
            "Bosh terisi sezgirligini kuzatib boring."
        )
    elif rec == "CAUTION":
        exp = (
            "Ba'zi moddalar profilingiz uchun ehtiyot talab qiladi. "
            "Agar tirnash yoki qichish paydo bo'lsa, foydalanishni to'xtating."
        )
    else:
        exp = "Yetarli tarkib ma'lumoti yo'q yoki o'qilmagan. INCI yorlig'ining aniq rasmini yuklang."
    flags = deterministic.get("flags") or []
    cautions = [str(f)[:200] for f in flags if f][:4]
    return {
        "explanation_uz": exp,
        "summary_bullets_uz": [],
        "cautions_uz": cautions,
        "provider": "deterministic",
    }


def explain_analysis_uz(
    product_name: str,
    brand: str,
    deterministic: dict[str, Any],
    profile_label: str,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    """
    Returns (explanation_payload, usage_metadata).
    LLM may only paraphrase deterministic findings — no new ingredients or citations.
    """
    safe_det = {
        k: deterministic.get(k)
        for k in (
            "recommendation",
            "verdict",
            "safety_score",
            "key_ingredients",
            "limitations",
            "catalog_fit",
            "flags",
        )
        if deterministic.get(k) is not None
    }

    prompt = f"""Siz kosmetik maslahatchisiz. FAQAT quyidagi tekshirilgan tahlilni tushuntiring.

Mahsulot: {brand} {product_name}

Foydalanuvchi profili:
{profile_label}

Deterministik tahlil (manba — o'zgartirmang, yangi modda qo'shmang):
{json.dumps(safe_det, ensure_ascii=False)[:5000]}

Qoidalar:
- O'zbekcha (lotin).
- Tibbiy tashxis yo'q.
- 100% kafolat yo'q.
- Yangi ilmiy manba yoki modda o'ylab topmang.
- JSON formatda javob.

Maydonlar: explanation_uz (2-5 jumla), summary_bullets_uz (3-5 qisqa band), cautions_uz (0-4 band).
"""

    try:
        raw, usage = gemini_explain_json(prompt, timeout=35)
        validated = validate_explanation_payload(raw)
        validated["provider"] = "gemini"
        return validated, usage
    except (AiStyleError, ValueError, json.JSONDecodeError) as exc:
        logger.info("Hair advisor explain fallback: %s", exc)
        return _deterministic_fallback(deterministic), None