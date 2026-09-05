"""Gemini — Hair Growth & Health Tracker 3 oylik prognoz."""

from __future__ import annotations

import time
import urllib.error
from typing import Any

from django.conf import settings

from ai.usage_pricing import finalize_usage
from .errors import AiStyleError
from .gemini_style import _extract_json, _post_gemini, _vision_model
from .vertex_client import generate_content, vertex_configured

SYSTEM_PROMPT = """You are Morf AI, an expert trichology and hair growth analyst for the MySaloon app.
Analyze the user's current hair metrics and routine, then generate an encouraging, realistic 3-month growth forecast and motivational commentary in modern Uzbek.

USER INPUT context:
- Current Length: {current_length_cm} cm
- Routine Consistency: {check_ins_count}/4 weeks
- Products Used: {products_list}

RULES:
1. Calculate a realistic 3-month projected length.
2. Provide motivational feedback on their progress.
3. Keep response concise, friendly, and structured.

OUTPUT FORMAT (JSON):
{
  "projected_length_3_months": number,
  "growth_rate_status": "EXCELLENT" | "NORMAL" | "NEEDS_IMPROVEMENT",
  "ai_commentary": "1-2 sentences of encouraging feedback in Uzbek.",
  "recommended_action": "1 short actionable tip to maximize growth for next week."
}
"""

_ACTIVE_INGREDIENTS = (
    "minoxidil",
    "rosemary",
    "peptide",
    "scalp massage",
    "massaj",
    "serum",
)
_ALLOWED_STATUS = {"EXCELLENT", "NORMAL", "NEEDS_IMPROVEMENT"}


def _normalize_products(products_used: list[Any] | None) -> list[str]:
    if not isinstance(products_used, list):
        return []
    out: list[str] = []
    for item in products_used[:16]:
        s = str(item or "").strip()
        if s and s not in out:
            out.append(s)
    return out


def _baseline_monthly_growth(consistency: int) -> float:
    ratio = max(0.0, min(1.0, consistency / 4))
    return 1.0 + (0.2 * ratio)


def _boost_monthly_growth(products_used: list[str], consistency: int) -> float:
    low = " ".join(products_used).lower()
    active_hits = sum(1 for key in _ACTIVE_INGREDIENTS if key in low)
    if active_hits <= 0:
        return 0.0
    ratio = max(0.0, min(1.0, consistency / 4))
    # Kamida +0.3, eng yuqorisi +0.6 (faollikka va intizomga qarab)
    intensity = min(1.0, (active_hits / 4) * 0.65 + ratio * 0.35)
    return 0.3 + 0.3 * intensity


def _status_from_monthly(monthly_growth: float) -> str:
    if monthly_growth >= 1.45:
        return "EXCELLENT"
    if monthly_growth >= 1.0:
        return "NORMAL"
    return "NEEDS_IMPROVEMENT"


def _fallback_forecast(
    *,
    current_length_cm: float,
    check_ins_count: int,
    products_used: list[str],
) -> dict[str, Any]:
    base = _baseline_monthly_growth(check_ins_count)
    boost = _boost_monthly_growth(products_used, check_ins_count)
    monthly = round(base + boost, 2)
    projected = round(current_length_cm + monthly * 3, 1)
    status = _status_from_monthly(monthly)
    if status == "EXCELLENT":
        commentary = "Barakalla, rejimni juda yaxshi ushlayapsiz. Shu ritmda 3 oyda sezilarli natija ko'rasiz."
    elif status == "NORMAL":
        commentary = "Progress barqaror, bu yaxshi. Intizomni oshirsangiz o'sish sur'ati yanada yaxshilanadi."
    else:
        commentary = "Natija sekinroq, lekin to'g'ri odatlar bilan tezroq o'sishga chiqish mumkin."
    action = (
        "Haftasiga kamida 4 marta scalp massaj + faol serumni muntazam qo'llang."
        if boost > 0
        else "Kelasi hafta kamida 4 ta check-in va bitta faol ingredientli serum qo'shing."
    )
    return {
        "projected_length_3_months": max(round(current_length_cm + 0.6, 1), projected),
        "growth_rate_status": status,
        "ai_commentary": commentary,
        "recommended_action": action,
    }


def _call_gemini_growth_forecast(
    *,
    current_length_cm: float,
    check_ins_count: int,
    products_used: list[str],
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    user_text = (
        f"Current Length: {current_length_cm:.1f} cm\n"
        f"Routine Consistency: {check_ins_count}/4 weeks\n"
        f"Products Used: {', '.join(products_used) if products_used else 'None'}\n\n"
        "Qat'iy JSON qaytaring."
    )
    body = {
        "systemInstruction": {
            "parts": [
                {
                    "text": SYSTEM_PROMPT.format(
                        current_length_cm=f"{current_length_cm:.1f}",
                        check_ins_count=check_ins_count,
                        products_list=", ".join(products_used) if products_used else "None",
                    )
                }
            ]
        },
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {
            "temperature": 0.45,
            "responseMimeType": "application/json",
        },
    }
    model = _vision_model()
    provider = "vertex" if vertex_configured() else "studio"
    started = time.perf_counter()
    if vertex_configured():
        payload = generate_content(model, body, timeout=45, kind="general")
    else:
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not api_key:
            raise AiStyleError(
                "AI xizmati hozircha ulanmagan. VERTEX_SERVICE_ACCOUNT_JSON yoki GEMINI_API_KEY kerak.",
                503,
            )
        payload = _post_gemini(model, api_key, body)

    latency_ms = int((time.perf_counter() - started) * 1000)
    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI javob bermadi.", 502)
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))
    if not text.strip():
        raise AiStyleError("AI javob bermadi.", 502)
    data = _extract_json(text)
    usage_nums = finalize_usage(payload, kind="analyze")
    usage = {
        **usage_nums,
        "provider": provider,
        "model": model,
        "latency_ms": latency_ms,
    }
    return data, usage


def _normalize_ai_forecast(raw: dict[str, Any], *, current_length_cm: float) -> dict[str, Any]:
    projected_raw = raw.get("projected_length_3_months")
    try:
        projected = float(projected_raw)
    except (TypeError, ValueError):
        raise AiStyleError("AI prognoz formati noto'g'ri.", 502) from None
    status = str(raw.get("growth_rate_status") or "").strip().upper()
    if status not in _ALLOWED_STATUS:
        raise AiStyleError("AI status formati noto'g'ri.", 502)
    commentary = str(raw.get("ai_commentary") or "").strip()
    action = str(raw.get("recommended_action") or "").strip()
    if not commentary:
        commentary = "Siz yaxshi yo'ldasiz, davom etsangiz o'sish sur'ati barqaror bo'ladi."
    if not action:
        action = "Kelasi hafta bosh terisini muntazam massaj qilib, check-inlarni to'liq kiriting."
    projected = max(current_length_cm + 0.6, projected)
    projected = min(projected, current_length_cm + 8.0)
    return {
        "projected_length_3_months": round(projected, 1),
        "growth_rate_status": status,
        "ai_commentary": commentary[:240],
        "recommended_action": action[:180],
    }


def generate_hair_growth_forecast(
    *,
    current_length_cm: float,
    check_ins_count: int,
    products_used: list[Any] | None = None,
) -> dict[str, Any]:
    current = round(float(current_length_cm), 1)
    if current <= 0:
        raise AiStyleError("Soch uzunligi 0 dan katta bo'lishi kerak.", 400)
    consistency = int(check_ins_count)
    consistency = max(0, min(4, consistency))
    products = _normalize_products(products_used)

    fallback = _fallback_forecast(
        current_length_cm=current,
        check_ins_count=consistency,
        products_used=products,
    )
    try:
        data, usage = _call_gemini_growth_forecast(
            current_length_cm=current,
            check_ins_count=consistency,
            products_used=products,
        )
        out = _normalize_ai_forecast(data, current_length_cm=current)
        out["_usage"] = usage
        return out
    except (AiStyleError, urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        return fallback
