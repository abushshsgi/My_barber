"""Gemini Vision — soch mahsuloti INCI (ingredients) tahlili."""

from __future__ import annotations

from typing import Any, Protocol

from .care_catalog_context import build_care_catalog_context
from .errors import AiStyleError
from .gemini_style import _gemini_vision_json, parse_data_url

ALERT_TYPES = frozenset(
    {
        "sulfate_warning",
        "silicone_warning",
        "alcohol_warning",
        "formaldehyde_warning",
        "paraben_warning",
        "heavy_oil_warning",
        "fragrance_warning",
        "hair_type_mismatch",
        "irritant_warning",
        "general_warning",
        "comedogenic_warning",
        "skin_type_mismatch",
        "drying_alcohol",
    }
)
SEVERITIES = frozenset({"low", "medium", "high"})
VERDICT_KEYS = frozenset({"good", "caution", "bad", "dangerous"})


class HairProfileLike(Protocol):
    is_complete: bool

    def profile_label(self) -> str: ...


def _build_ingredient_prompt(profile: HairProfileLike, catalog_block: str) -> str:
    profile_block = profile.profile_label()
    return f"""You are an expert trichologist and cosmetic chemist for HAIR products
(shampoo, balsam/conditioner, mask, oil, spray, scalp treatment).
Analyze the attached image of the product label / INCI ingredient list.

USER HAIR PROFILE:
{profile_block}

ADMIN_CARE_CATALOG (MyBarber admin-published products — authoritative for match & fit):
{catalog_block}

INSTRUCTIONS:
1. Extract the product name and brand if visible.
2. Extract all listed ingredients into a JSON list under "ingredients".
3. Match the scanned product to ADMIN_CARE_CATALOG by name/brand and/or INCI overlap.
   - If a clear match exists, set matched_product_id to that catalog id (integer).
   - If no match, set matched_product_id to null and note it in catalog_notes_uz.
4. If matched: prioritize catalog suitable / not_suitable / pros / cons / warnings
   for THIS user's hair profile when writing fit_uz, verdict, and alerts.
5. If not matched: evaluate INCI with general cosmetic chemistry relative to the profile.
6. Generate an overall Safety Score (0-100) for this user's hair.
7. Set verdict_key to one of: good, caution, bad, dangerous.
8. fit_uz: 1–3 short Uzbek sentences — why this product fits or does not fit THIS hair.
9. catalog_notes_uz: short Uzbek note (matched product summary or "Katalogda topilmadi").
10. All user-facing messages (message_uz, reason_uz, verdict, fit_uz, catalog_notes_uz)
    MUST be in Uzbek (Latin script).

OUTPUT FORMAT (Raw JSON only, no markdown):
{{
  "product_analysis": {{
    "safety_score": 82,
    "verdict": "Yog'li soch uchun mos, lekin ochilgan sochga ehtiyot",
    "total_ingredients_count": 14,
    "product_name": "Repair Shampoo",
    "brand": "Brand"
  }},
  "verdict_key": "caution",
  "matched_product_id": 12,
  "fit_uz": "Sizning yog'li sochingiz uchun mos. Sulfatlar qisman yuqori — ehtiyot.",
  "catalog_notes_uz": "Admin katalogidagi Repair Shampoo bilan mos keldi.",
  "ingredients": ["Aqua", "Sodium Laureth Sulfate"],
  "critical_alerts": [
    {{
      "type": "sulfate_warning",
      "ingredient": "Sodium Laureth Sulfate",
      "severity": "high",
      "message_uz": "Sulfat ochilgan yoki shikastlangan sochni quritishi mumkin."
    }}
  ],
  "beneficial_ingredients": [
    {{
      "ingredient": "Panthenol",
      "reason_uz": "Soch tolasini namlaydi va yumshatadi."
    }}
  ]
}}

If the image is not an ingredient list or text is unreadable, return:
{{
  "product_analysis": {{
    "safety_score": 0,
    "verdict": "Tarkib ro'yxati o'qilmadi",
    "total_ingredients_count": 0,
    "product_name": "",
    "brand": ""
  }},
  "verdict_key": "caution",
  "matched_product_id": null,
  "fit_uz": "",
  "catalog_notes_uz": "",
  "ingredients": [],
  "critical_alerts": [
    {{
      "type": "general_warning",
      "ingredient": "",
      "severity": "high",
      "message_uz": "Rasmda INCI tarkib ro'yxati aniqlanmadi. Mahsulot orqasidagi Ingredients yozuvini aniqroq suratga oling."
    }}
  ],
  "beneficial_ingredients": []
}}
"""


def _clamp_score(value: Any) -> int:
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, score))


def _normalize_alerts(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        alert_type = str(item.get("type") or "general_warning").strip().lower()
        if alert_type not in ALERT_TYPES:
            alert_type = "general_warning"
        severity = str(item.get("severity") or "medium").strip().lower()
        if severity not in SEVERITIES:
            severity = "medium"
        message = str(item.get("message_uz") or "").strip()
        if not message:
            continue
        out.append(
            {
                "type": alert_type,
                "ingredient": str(item.get("ingredient") or "").strip(),
                "severity": severity,
                "message_uz": message,
            }
        )
    return out[:20]


def _normalize_beneficial(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("ingredient") or "").strip()
        reason = str(item.get("reason_uz") or "").strip()
        if not name or not reason:
            continue
        out.append({"ingredient": name, "reason_uz": reason})
    return out[:20]


def _normalize_ingredients(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        name = str(item or "").strip()
        if name and name not in out:
            out.append(name)
    return out[:120]


def _normalize_matched_id(raw: Any) -> int | None:
    if raw is None or raw is False:
        return None
    if isinstance(raw, str) and not raw.strip():
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def normalize_ingredient_analysis(data: dict[str, Any]) -> dict[str, Any]:
    analysis = data.get("product_analysis") if isinstance(data.get("product_analysis"), dict) else {}
    ingredients = _normalize_ingredients(data.get("ingredients"))
    total = analysis.get("total_ingredients_count")
    try:
        total_count = int(total)
    except (TypeError, ValueError):
        total_count = len(ingredients)
    if total_count <= 0:
        total_count = len(ingredients)

    verdict = str(analysis.get("verdict") or "").strip()
    if not verdict:
        verdict = "Tahlil yakunlandi"

    verdict_key = str(data.get("verdict_key") or "").strip().lower()
    if verdict_key not in VERDICT_KEYS:
        verdict_key = ""

    return {
        "product_analysis": {
            "safety_score": _clamp_score(analysis.get("safety_score")),
            "verdict": verdict[:280],
            "total_ingredients_count": max(0, total_count),
            "product_name": str(analysis.get("product_name") or "").strip()[:160],
            "brand": str(analysis.get("brand") or "").strip()[:120],
        },
        "verdict_key": verdict_key,
        "matched_product_id": _normalize_matched_id(data.get("matched_product_id")),
        "fit_uz": str(data.get("fit_uz") or "").strip()[:500],
        "catalog_notes_uz": str(data.get("catalog_notes_uz") or "").strip()[:400],
        "ingredients": ingredients,
        "critical_alerts": _normalize_alerts(data.get("critical_alerts")),
        "beneficial_ingredients": _normalize_beneficial(data.get("beneficial_ingredients")),
    }


def analyze_ingredient_from_data_url(
    data_url: str,
    profile: HairProfileLike,
    *,
    catalog_block: str | None = None,
) -> dict[str, Any]:
    if not profile.is_complete:
        raise AiStyleError("Avval soch profilingizni to'ldiring.", 400)

    mime, image_bytes = parse_data_url(data_url)
    catalog = catalog_block if catalog_block is not None else build_care_catalog_context()
    prompt = _build_ingredient_prompt(profile, catalog)
    data, usage = _gemini_vision_json(prompt, mime, image_bytes)
    if not isinstance(data, dict):
        raise AiStyleError("AI javobi noto'g'ri formatda.", 502)
    normalized = normalize_ingredient_analysis(data)
    normalized["_usage"] = usage
    return normalized
