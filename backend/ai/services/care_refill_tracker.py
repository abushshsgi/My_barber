"""Parvarish mahsuloti tugash va PAO muddat hisob-kitobi + AI maslahat."""

from __future__ import annotations

import calendar
import logging
import math
import re
import time
import urllib.error
from datetime import date, timedelta
from typing import Any

from django.conf import settings

from ai.usage_pricing import finalize_usage
from .errors import AiStyleError
from .gemini_style import _extract_json, _post_gemini, _vision_model
from .vertex_client import generate_content, vertex_configured

logger = logging.getLogger(__name__)

STATUS_OK = "OK"
STATUS_REFILL_SOON = "REFILL_SOON"
STATUS_EXPIRED = "EXPIRED"

CATEGORY_DOSE_ML = {
    "hair": 10.0,
    "face": 1.0,
    "scalp": 2.0,
    "beard": 0.7,
    "other": 1.0,
}

PRODUCT_HINT_DOSE = (
    ("shampoo", 10.0),
    ("shampun", 10.0),
    ("serum", 1.0),
    ("wax", 0.5),
    ("pomade", 0.5),
    ("pomada", 0.5),
    ("gel", 0.8),
    ("spray", 1.5),
    ("lak", 1.5),
    ("oil", 1.2),
    ("mask", 12.0),
)


def _add_months(d: date, months: int) -> date:
    months = max(1, int(months or 1))
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def infer_uses_per_day(raw: str) -> float:
    text = str(raw or "").strip().lower()
    if not text:
        return 1.0

    # kuniga 1 mahal / daily 2
    m = re.search(r"(kuniga|har kuni|daily)\s*(\d+(?:[.,]\d+)?)?", text)
    if m:
        n = m.group(2)
        return max(0.2, float((n or "1").replace(",", ".")))

    # haftada 2-3 marta
    m = re.search(r"(haftada|haftasiga|weekly)\s*(\d+(?:[.,]\d+)?)\s*[-/]\s*(\d+(?:[.,]\d+)?)", text)
    if m:
        a = float(m.group(2).replace(",", "."))
        b = float(m.group(3).replace(",", "."))
        return max(0.1, ((a + b) / 2.0) / 7.0)

    # haftada 2 marta
    m = re.search(r"(haftada|haftasiga|weekly)\s*(\d+(?:[.,]\d+)?)", text)
    if m:
        n = float(m.group(2).replace(",", "."))
        return max(0.1, n / 7.0)

    # oyiga 10 marta
    m = re.search(r"(oyiga|monthly)\s*(\d+(?:[.,]\d+)?)", text)
    if m:
        n = float(m.group(2).replace(",", "."))
        return max(0.05, n / 30.0)

    if "hafta" in text:
        return 3.0 / 7.0
    if "oy" in text:
        return 8.0 / 30.0
    return 1.0


def infer_dose_ml_per_use(product_name: str, category: str, override: float | None = None) -> float:
    if override and override > 0:
        return min(25.0, max(0.1, float(override)))
    name = str(product_name or "").lower()
    for key, dose in PRODUCT_HINT_DOSE:
        if key in name:
            return dose
    return CATEGORY_DOSE_ML.get(str(category or "other").lower(), 1.0)


def calculate_refill_metrics(
    *,
    volume_ml: int,
    uses_per_day: float,
    dose_ml_per_use: float,
    opened_at: date,
    pao_months: int,
    now: date | None = None,
) -> dict[str, Any]:
    now_d = now or date.today()
    volume = max(1, int(volume_ml or 1))
    uses_daily = min(10.0, max(0.05, float(uses_per_day or 1.0)))
    dose = min(30.0, max(0.1, float(dose_ml_per_use or 1.0)))

    estimated_total_uses = max(1, int(math.floor(volume / dose)))
    days_to_depletion = max(1, int(math.ceil(estimated_total_uses / uses_daily)))
    refill_date = opened_at + timedelta(days=days_to_depletion)
    expiration_date = _add_months(opened_at, pao_months)
    estimated_days_left = (refill_date - now_d).days
    days_to_pao = (expiration_date - now_d).days

    remaining_pct = int(round((estimated_days_left / float(days_to_depletion)) * 100))
    remaining_percent = max(0, min(100, remaining_pct))

    if now_d > expiration_date:
        status_flag = STATUS_EXPIRED
    elif remaining_percent <= 10 or estimated_days_left <= 7 or days_to_pao <= 7:
        status_flag = STATUS_REFILL_SOON
    else:
        status_flag = STATUS_OK

    return {
        "estimated_total_uses": estimated_total_uses,
        "days_to_depletion": days_to_depletion,
        "estimated_days_left": estimated_days_left,
        "refill_date": refill_date.isoformat(),
        "expiration_date": expiration_date.isoformat(),
        "days_to_pao": days_to_pao,
        "remaining_percent": remaining_percent,
        "status_flag": status_flag,
    }


def _fallback_advice(status_flag: str, category: str) -> str:
    if status_flag == STATUS_EXPIRED:
        return "PAO muddati o'tgan mahsulotni almashtiring va qopqog'ini doim mahkam yoping."
    if status_flag == STATUS_REFILL_SOON:
        return "Mahsulotni bugunoq ro'yxatga qo'shing, oxirgi haftaga qoldirmang."
    if category == "hair":
        return "Shampunni kaftga olib ko'piklatib qo'llang - ortiqcha sarf kamayadi."
    if category == "scalp":
        return "Bosh terisi vositasini faqat ildizga surtsangiz mahsulot uzoqroq yetadi."
    return "Mahsulotni quyoshdan yiroqda saqlasangiz sifati uzoq saqlanadi."


def _build_prompt(
    *,
    product_name: str,
    volume_ml: int,
    usage_frequency: str,
    opened_at: date,
    pao_months: int,
    metrics: dict[str, Any],
) -> str:
    return f"""You are Morf AI, an intelligent grooming product lifecycle manager for the MySaloon app.
Your task is to analyze user product inputs, predict when the product will run out, determine if it is safe to use based on PAO (Period After Opening), and generate personalized usage advice.

USER INPUT context:
- Product Name: {product_name}
- Volume: {volume_ml} ml
- Frequency: {usage_frequency}
- Date Opened: {opened_at.isoformat()}
- PAO Months: {pao_months}

SYSTEM-CALCULATED METRICS:
- estimated_days_left: {metrics.get("estimated_days_left")}
- refill_date: {metrics.get("refill_date")}
- expiration_date: {metrics.get("expiration_date")}
- status_flag: {metrics.get("status_flag")}

RULES:
1. Respect the metrics above as the final numbers.
2. Calculate realistic depletion based on standard dosage assumptions.
3. Keep output concise Uzbek (Latin), one short advice sentence.
4. Never suggest salon/barber appointment.

OUTPUT FORMAT (JSON):
{{
  "estimated_days_left": number,
  "refill_date": "YYYY-MM-DD",
  "status_flag": "OK" | "REFILL_SOON" | "EXPIRED",
  "ai_advice": "Short 1-sentence tip on proper storage or usage optimization"
}}
"""


def _call_advice(prompt: str) -> tuple[dict[str, Any], dict[str, Any]]:
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.35,
            "maxOutputTokens": 350,
            "responseMimeType": "application/json",
        },
    }
    model = _vision_model()
    provider = "vertex" if vertex_configured() else "studio"
    started = time.perf_counter()

    if vertex_configured():
        try:
            payload = generate_content(model, body, timeout=18, kind="general")
        except Exception as exc:
            raise AiStyleError("AI maslahat vaqtincha ishlamayapti.", 502) from exc
    else:
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not api_key:
            raise AiStyleError("AI xizmati hozircha ulanmagan.", 503)
        legacy = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": body["generationConfig"],
        }
        try:
            payload = _post_gemini(model, api_key, legacy)
        except urllib.error.HTTPError as exc:
            logger.warning("Gemini refill advice HTTP %s: %s", exc.code, exc)
            raise AiStyleError("AI maslahat xatosi.", 502) from exc
        except Exception as exc:
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    candidates = payload.get("candidates") or []
    parts = (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    texts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
    if not texts:
        raise AiStyleError("AI javob bermadi.", 502)
    data = _extract_json("".join(texts))
    usage = {
        **finalize_usage(payload, kind="analyze"),
        "provider": provider,
        "model": model,
        "latency_ms": latency_ms,
    }
    return data, usage


def build_refill_estimate(
    *,
    product_name: str,
    category: str,
    volume_ml: int,
    usage_frequency: str,
    opened_at: date,
    pao_months: int,
    dose_ml_per_use: float | None = None,
    with_ai: bool = True,
) -> dict[str, Any]:
    uses_per_day = infer_uses_per_day(usage_frequency)
    dose = infer_dose_ml_per_use(product_name, category, override=dose_ml_per_use)
    metrics = calculate_refill_metrics(
        volume_ml=volume_ml,
        uses_per_day=uses_per_day,
        dose_ml_per_use=dose,
        opened_at=opened_at,
        pao_months=pao_months,
    )
    out = {
        **metrics,
        "uses_per_day": round(uses_per_day, 4),
        "dose_ml_per_use": dose,
    }
    out["ai_advice"] = _fallback_advice(metrics["status_flag"], category)
    if not with_ai:
        return out
    try:
        data, usage = _call_advice(
            _build_prompt(
                product_name=product_name,
                volume_ml=volume_ml,
                usage_frequency=usage_frequency,
                opened_at=opened_at,
                pao_months=pao_months,
                metrics=metrics,
            )
        )
    except AiStyleError:
        return out

    advice = str(data.get("ai_advice") or "").strip()
    if advice:
        out["ai_advice"] = advice[:220]
    out["_usage"] = usage
    return out
