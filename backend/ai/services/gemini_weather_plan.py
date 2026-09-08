"""Gemini — ob-havo + mening mahsulotlarim uchun kunlik reja (ixtiyoriy LLM)."""

from __future__ import annotations

import json
import logging
import urllib.error
from typing import Any

from django.conf import settings

from ai.services.errors import AiStyleError
from ai.services.gemini_style import _extract_json, _post_gemini, _vision_model
from ai.services.vertex_client import generate_content, vertex_configured
from ai.services.weather_care import build_product_plan

logger = logging.getLogger(__name__)

SYSTEM = """You are Morf AI hair-care coach for MySaloon (Uzbekistan).
Given TODAY's weather (and optional user products), return a short daily plan in Uzbek.

RULES:
- primary_action must be one concrete action for today (title + subtitle).
- If products are provided: only recommend those product_ids (max 4).
- If products list is empty: return product_plan as [] and still fill primary_action.
- Keep how_to_use and tip short (1 sentence each).

OUTPUT JSON:
{
  "primary_action": {"id":"string","title":"string","subtitle":"string","icon":"sunny-outline"},
  "product_plan": [
    {"product_id": number, "how_to_use": "string", "tip": "string"}
  ]
}
"""


def enrich_plan_with_llm(
    *,
    weather: dict[str, Any],
    products: list[dict[str, Any]],
    hair_condition: str = "",
    hair_texture: str = "",
) -> dict[str, Any]:
    """Rule-based plan always; LLM overrides titles/tips when available."""
    current = weather.get("current") or {}
    base_plan = weather.get("product_plan") or build_product_plan(
        products,
        temp_c=current.get("temperature_c"),
        humidity_pct=current.get("humidity_pct"),
        condition_key=str(current.get("condition_key") or "unknown"),
        uv_index=(current.get("uv_index") if isinstance(current.get("uv_index"), (int, float)) else None),
        hair_condition=hair_condition,
    )
    primary = weather.get("primary_action") or {}

    try:
        data = _call_llm(
            weather=weather,
            products=products,
            hair_condition=hair_condition,
            hair_texture=hair_texture,
        )
    except Exception as exc:
        logger.info("weather LLM plan skip: %s", exc)
        return {"primary_action": primary, "product_plan": base_plan, "ai_enriched": False}

    merged: list[dict[str, Any]] = base_plan
    if products:
        by_id = {int(p["product_id"]): p for p in base_plan if p.get("product_id") is not None}
        out: list[dict[str, Any]] = []
        for row in data.get("product_plan") or []:
            try:
                pid = int(row.get("product_id"))
            except (TypeError, ValueError):
                continue
            base = by_id.get(pid)
            if not base:
                continue
            out.append(
                {
                    **base,
                    "how_to_use": str(row.get("how_to_use") or base["how_to_use"])[:180],
                    "tip": str(row.get("tip") or base["tip"])[:140],
                }
            )
        if out:
            merged = out

    pa = data.get("primary_action") if isinstance(data.get("primary_action"), dict) else {}
    if pa.get("title"):
        primary = {
            "id": str(pa.get("id") or primary.get("id") or "ai"),
            "title": str(pa.get("title"))[:80],
            "subtitle": str(pa.get("subtitle") or primary.get("subtitle") or "")[:160],
            "icon": str(pa.get("icon") or primary.get("icon") or "sparkles-outline"),
        }

    return {"primary_action": primary, "product_plan": merged[:4], "ai_enriched": True}


def _call_llm(
    *,
    weather: dict[str, Any],
    products: list[dict[str, Any]],
    hair_condition: str,
    hair_texture: str,
) -> dict[str, Any]:
    current = weather.get("current") or {}
    uv = weather.get("uv") or {}
    slim_products = [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "category": p.get("category"),
            "brand": p.get("brand"),
        }
        for p in products[:8]
        if p.get("id") and p.get("name")
    ]
    user_text = json.dumps(
        {
            "temp_c": current.get("temperature_c"),
            "humidity": current.get("humidity_pct"),
            "wind_kmh": current.get("wind_kmh"),
            "condition": current.get("condition_key"),
            "uv_index": uv.get("index"),
            "uv_level": uv.get("level"),
            "hair_condition": hair_condition,
            "hair_texture": hair_texture,
            "products": slim_products,
        },
        ensure_ascii=False,
    )
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": user_text + "\nQat'iy JSON."}]}],
        "generationConfig": {"temperature": 0.35, "responseMimeType": "application/json"},
    }
    model = _vision_model()
    if vertex_configured():
        payload = generate_content(model, body, timeout=35, kind="general")
    else:
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not api_key:
            raise AiStyleError("AI ulanmagan", 503)
        payload = _post_gemini(model, api_key, body)

    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI javob yo'q", 502)
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text = "".join(str(p.get("text") or "") for p in parts if isinstance(p, dict))
    return _extract_json(text)
