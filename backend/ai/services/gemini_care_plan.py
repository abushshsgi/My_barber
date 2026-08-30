"""Gemini — foydalanuvchi soch holati + mahsulotlaridan shaxsiy parvarish rejasi."""

from __future__ import annotations

import logging
import time
import urllib.error
from typing import Any

from django.conf import settings

from ai.usage_pricing import finalize_usage
from .errors import AiStyleError
from .gemini_style import _extract_json, _post_gemini, _vision_model
from .vertex_client import generate_content, vertex_configured

logger = logging.getLogger(__name__)

SLOT_KEYS = ("morning", "evening", "weekly")
ICON_KEYS = frozenset({"water", "flask", "sparkles", "shield", "leaf", "cut"})


def _build_prompt(
    *,
    condition: str,
    texture: str,
    color_status: str,
    scalp: str,
    concerns: list[str],
    products: list[dict[str, Any]],
) -> str:
    lines: list[str] = []
    for p in products[:24]:
        pid = p.get("id")
        name = str(p.get("name") or "").strip() or "Nomsiz"
        brand = str(p.get("brand") or "").strip()
        cat = str(p.get("category") or "other").strip()
        usage = str(p.get("usage_uz") or "").strip()[:160]
        purpose = str(p.get("purpose_uz") or "").strip()[:120]
        bit = f"- id={pid} | {name}"
        if brand:
            bit += f" ({brand})"
        bit += f" | category={cat}"
        if purpose:
            bit += f" | purpose: {purpose}"
        if usage:
            bit += f" | usage: {usage}"
        percent = p.get("match_percent")
        if percent is not None:
            bit += f" | fit={percent}%"
        reasons = p.get("fit_reasons") if isinstance(p.get("fit_reasons"), list) else []
        if reasons:
            bit += f" | why: {'; '.join(str(x) for x in reasons[:2])}"
        steps = p.get("usage_steps") if isinstance(p.get("usage_steps"), list) else []
        if steps and isinstance(steps[0], dict):
            bit += f" | step: {str(steps[0].get('desc') or '')[:80]}"
        lines.append(bit)
    catalog = "\n".join(lines) if lines else "(foydalanuvchida mahsulot yo'q — umumiy tavsiya bering)"
    concern_s = ", ".join(concerns) if concerns else "none"
    scalp_s = scalp or "unknown"

    return f"""You are a senior trichologist for Morf AI (MyBarber).
Build a PERSONAL hair-care routine for THIS user using THEIR products when possible.

USER HAIR PROFILE:
- condition: {condition}
- texture: {texture}
- color_status: {color_status}
- scalp: {scalp_s}
- concerns: {concern_s}

USER PRODUCTS (prefer these by name in every task; respect fit% and why):
{catalog}

RULES:
1. Output RAW JSON only (no markdown).
2. All user-facing strings MUST be Uzbek (Latin script), short and actionable.
3. morning / evening: 3–5 steps each. weekly: 3–4 steps.
4. When a user product fits a step, set product_id to that id and product_name to its name.
5. If no product fits, product_id=null and give a generic product_name hint (e.g. "Shampun").
6. time_hint: when to do it (e.g. "Ertalab", "Yuvishdan keyin", "Haftada 1 marta").
7. icon must be one of: water, flask, sparkles, shield, leaf, cut.
8. summary: 1–2 sentences about the overall plan for this hair + products.
9. weekly_schedule: 4–7 day entries with day short label (Du/Se/Chor/…) and task.

OUTPUT SCHEMA:
{{
  "summary": "...",
  "morning": [
    {{
      "id": "m1",
      "title": "...",
      "subtitle": "...",
      "time_hint": "Ertalab",
      "icon": "water",
      "product_id": 12,
      "product_name": "..."
    }}
  ],
  "evening": [],
  "weekly": [],
  "weekly_schedule": [{{ "day": "Du", "task": "..." }}],
  "tips": ["...", "..."],
  "avoid": ["...", "..."]
}}
"""


def _normalize_task(raw: Any, *, prefix: str, idx: int) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    title = str(raw.get("title") or "").strip()
    if not title:
        return None
    icon = str(raw.get("icon") or "sparkles").strip().lower()
    if icon not in ICON_KEYS:
        icon = "sparkles"
    pid = raw.get("product_id")
    product_id: int | None = None
    if isinstance(pid, int) and pid > 0:
        product_id = pid
    elif isinstance(pid, str) and pid.isdigit():
        product_id = int(pid)
    return {
        "id": str(raw.get("id") or f"{prefix}{idx}"),
        "title": title[:80],
        "subtitle": str(raw.get("subtitle") or "").strip()[:140],
        "time_hint": str(raw.get("time_hint") or "").strip()[:60],
        "icon": icon,
        "product_id": product_id,
        "product_name": str(raw.get("product_name") or "").strip()[:80],
    }


def _normalize_plan(data: dict[str, Any]) -> dict[str, Any]:
    slots: dict[str, list[dict[str, Any]]] = {}
    for key in SLOT_KEYS:
        rows: list[dict[str, Any]] = []
        raw_list = data.get(key)
        if isinstance(raw_list, list):
            for i, item in enumerate(raw_list[:6]):
                task = _normalize_task(item, prefix=key[0], idx=i + 1)
                if task:
                    rows.append(task)
        slots[key] = rows

    schedule: list[dict[str, str]] = []
    raw_sched = data.get("weekly_schedule")
    if isinstance(raw_sched, list):
        for item in raw_sched[:7]:
            if not isinstance(item, dict):
                continue
            day = str(item.get("day") or "").strip()[:8]
            task = str(item.get("task") or "").strip()[:100]
            if day and task:
                schedule.append({"day": day, "task": task})

    tips = [str(x).strip()[:120] for x in (data.get("tips") or []) if str(x).strip()][:5]
    avoid = [str(x).strip()[:120] for x in (data.get("avoid") or []) if str(x).strip()][:5]

    return {
        "summary": str(data.get("summary") or "").strip()[:280],
        "morning": slots["morning"],
        "evening": slots["evening"],
        "weekly": slots["weekly"],
        "weekly_schedule": schedule,
        "tips": tips,
        "avoid": avoid,
    }


def generate_care_plan(
    *,
    condition: str,
    texture: str,
    color_status: str,
    products: list[dict[str, Any]],
    scalp: str = "",
    concerns: list[str] | None = None,
) -> dict[str, Any]:
    prompt = _build_prompt(
        condition=condition,
        texture=texture,
        color_status=color_status,
        scalp=scalp or "",
        concerns=concerns or [],
        products=products,
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.35,
            "responseMimeType": "application/json",
        },
    }

    model = _vision_model()
    provider = "vertex" if vertex_configured() else "studio"
    started = time.perf_counter()

    if vertex_configured():
        try:
            payload = generate_content(model, body, timeout=45, kind="general")
        except AiStyleError:
            raise
        except Exception as exc:
            logger.warning("Vertex care plan error (%s): %s", model, exc)
            raise AiStyleError("AI parvarish reja vaqtincha ishlamayapti.", 502) from exc
    else:
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not api_key:
            raise AiStyleError(
                "AI xizmati hozircha ulanmagan. "
                "VERTEX_SERVICE_ACCOUNT_JSON yoki GEMINI_API_KEY kerak.",
                503,
            )
        body_legacy = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": body["generationConfig"],
        }
        try:
            payload = _post_gemini(model, api_key, body_legacy)
        except urllib.error.HTTPError as exc:
            logger.warning("Gemini care plan HTTP %s: %s", exc.code, exc)
            raise AiStyleError("AI parvarish reja xatosi.", 502) from exc
        except Exception as exc:
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI javob bermadi.", 502)
    parts = (candidates[0].get("content") or {}).get("parts") or []
    text_parts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
    if not text_parts:
        raise AiStyleError("AI javob bermadi.", 502)

    data = _extract_json("".join(text_parts))
    plan = _normalize_plan(data)
    if not plan["morning"] and not plan["evening"] and not plan["weekly"]:
        raise AiStyleError("AI reja bo'sh qaytdi. Qayta urinib ko'ring.", 502)

    usage_nums = finalize_usage(payload, kind="analyze")
    plan["_usage"] = {
        **usage_nums,
        "provider": provider,
        "model": model,
        "latency_ms": latency_ms,
    }
    return plan
