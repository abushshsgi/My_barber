"""Gemini Vision — kosmetika INCI (ingredients) tahlili."""

from __future__ import annotations

from typing import Any

from accounts.models import SkinProfile

from .errors import AiStyleError
from .gemini_style import _gemini_vision_json, parse_data_url

ALERT_TYPES = frozenset(
    {
        "comedogenic_warning",
        "skin_type_mismatch",
        "drying_alcohol",
        "fragrance_warning",
        "irritant_warning",
        "general_warning",
    }
)
SEVERITIES = frozenset({"low", "medium", "high"})


def _build_ingredient_prompt(profile: SkinProfile) -> str:
    profile_block = profile.profile_label()
    return f"""You are an expert Cosmetic Chemist and Dermatologist.
Analyze the attached image of a cosmetic product's ingredient list (INCI).

USER PROFILE:
{profile_block}

INSTRUCTIONS:
1. Extract all listed ingredients into a JSON list under "ingredients".
2. Evaluate each ingredient for safety, comedogenicity (pore-clogging status), and suitability for the user's skin profile.
3. Generate a quick overall Safety Score (0-100).
4. Provide structured warning alerts if there are comedogenic ingredients, drying alcohols, or heavy synthetic fragrances.
5. All user-facing messages (message_uz, reason_uz, verdict) MUST be in Uzbek (Latin script).

OUTPUT FORMAT (Raw JSON only, no markdown):
{{
  "product_analysis": {{
    "safety_score": 82,
    "verdict": "Safe with caution / Not recommended for Dry Skin",
    "total_ingredients_count": 14
  }},
  "ingredients": ["Aqua", "Glycerin"],
  "critical_alerts": [
    {{
      "type": "comedogenic_warning",
      "ingredient": "Isocetyl Stearate",
      "severity": "high",
      "message_uz": "Bu kremda komedogen (poralarni berkitib, akne chiqarishi mumkin bo'lgan) modda bor."
    }}
  ],
  "beneficial_ingredients": [
    {{
      "ingredient": "Hyaluronic Acid",
      "reason_uz": "Quruq terini chuqur namlantirish uchun juda foydali."
    }}
  ]
}}

If the image is not an ingredient list or text is unreadable, return:
{{
  "product_analysis": {{
    "safety_score": 0,
    "verdict": "Tarkib ro'yxati o'qilmadi",
    "total_ingredients_count": 0
  }},
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

    return {
        "product_analysis": {
            "safety_score": _clamp_score(analysis.get("safety_score")),
            "verdict": verdict[:280],
            "total_ingredients_count": max(0, total_count),
        },
        "ingredients": ingredients,
        "critical_alerts": _normalize_alerts(data.get("critical_alerts")),
        "beneficial_ingredients": _normalize_beneficial(data.get("beneficial_ingredients")),
    }


def analyze_ingredient_from_data_url(
    data_url: str,
    profile: SkinProfile,
) -> dict[str, Any]:
    if not profile.is_complete:
        raise AiStyleError("Avval teri profilingizni to'ldiring.", 400)

    mime, image_bytes = parse_data_url(data_url)
    prompt = _build_ingredient_prompt(profile)
    data, usage = _gemini_vision_json(prompt, mime, image_bytes)
    if not isinstance(data, dict):
        raise AiStyleError("AI javobi noto'g'ri formatda.", 502)
    normalized = normalize_ingredient_analysis(data)
    normalized["_usage"] = usage
    return normalized
