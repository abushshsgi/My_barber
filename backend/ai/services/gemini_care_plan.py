"""Gemini — foydalanuvchi soch holati + mahsulotlaridan shaxsiy parvarish rejasi."""

from __future__ import annotations

import json
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
    gender: str = "",
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
    gender_s = (gender or "").strip().lower()
    gender_line = ""
    if gender_s in ("male", "female"):
        gender_line = f"\n- gender: {gender_s}"

    return f"""You are a senior trichologist for Morf AI (MyBarber).
Build a PERSONAL hair-care routine for THIS user using THEIR products when possible.

USER HAIR PROFILE:
- condition: {condition}
- texture: {texture}
- color_status: {color_status}
- scalp: {scalp_s}
- concerns: {concern_s}{gender_line}

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


def _format_products(products: list[dict[str, Any]]) -> str:
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
    return "\n".join(lines) if lines else "(foydalanuvchida mahsulot yo'q — umumiy tavsiya bering)"


def _build_append_prompt(
    *,
    condition: str,
    texture: str,
    color_status: str,
    scalp: str,
    concerns: list[str],
    new_products: list[dict[str, Any]],
    existing_plan: dict[str, Any],
    gender: str = "",
) -> str:
    catalog = _format_products(new_products)
    concern_s = ", ".join(concerns) if concerns else "none"
    scalp_s = scalp or "unknown"
    gender_s = (gender or "").strip().lower()
    gender_line = ""
    if gender_s in ("male", "female"):
        gender_line = f"\n- gender: {gender_s}"

    # Keep existing plan compact for context — do not ask model to rewrite it.
    existing_compact = {
        "morning": existing_plan.get("morning") or [],
        "evening": existing_plan.get("evening") or [],
        "weekly": existing_plan.get("weekly") or [],
        "weekly_schedule": existing_plan.get("weekly_schedule") or [],
    }
    existing_json = json.dumps(existing_compact, ensure_ascii=False)[:3500]

    return f"""You are a senior trichologist for Morf AI (MyBarber).
The user ALREADY has a care plan. They just ADDED new product(s).
You must ONLY create NEW routine steps for the NEW products.
Do NOT rewrite, renumber, remove, or alter any existing steps.

USER HAIR PROFILE:
- condition: {condition}
- texture: {texture}
- color_status: {color_status}
- scalp: {scalp_s}
- concerns: {concern_s}{gender_line}

EXISTING PLAN (read-only context — leave untouched):
{existing_json}

NEW PRODUCTS ONLY (create steps for these):
{catalog}

RULES:
1. Output RAW JSON only (no markdown).
2. All user-facing strings MUST be Uzbek (Latin script), short and actionable.
3. Return ONLY new steps to APPEND. Prefer 1–2 steps per new product, split across morning/evening/weekly as appropriate.
4. Every new step MUST set product_id to the new product id and product_name to its name.
5. Use unique ids that do NOT collide with existing ids (prefix with "n").
6. time_hint: when to do it.
7. icon must be one of: water, flask, sparkles, shield, leaf, cut.
8. summary: ONE short sentence about what was ADDED only (not a full plan rewrite).
9. weekly_schedule: ONLY extra day notes for the new product(s). Do not repeat old days unless adding a new task for that day.
10. tips / avoid: only NEW tips for the new product(s), or empty arrays.

OUTPUT SCHEMA:
{{
  "summary": "...",
  "morning": [],
  "evening": [],
  "weekly": [],
  "weekly_schedule": [{{ "day": "Du", "task": "..." }}],
  "tips": [],
  "avoid": []
}}
"""


def _call_gemini_plan(prompt: str) -> dict[str, Any]:
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
    usage_nums = finalize_usage(payload, kind="analyze")
    plan["_usage"] = {
        **usage_nums,
        "provider": provider,
        "model": model,
        "latency_ms": latency_ms,
    }
    return plan


def merge_care_plan_patch(
    existing: dict[str, Any],
    patch: dict[str, Any],
) -> dict[str, Any]:
    """Append-only merge: keep existing steps, add patch steps with unique ids."""
    existing_ids: set[str] = set()
    for key in SLOT_KEYS:
        for row in existing.get(key) or []:
            if isinstance(row, dict) and row.get("id"):
                existing_ids.add(str(row["id"]))

    out: dict[str, Any] = {
        "summary": str(existing.get("summary") or "").strip()[:280],
        "morning": list(existing.get("morning") or []),
        "evening": list(existing.get("evening") or []),
        "weekly": list(existing.get("weekly") or []),
        "weekly_schedule": list(existing.get("weekly_schedule") or []),
        "tips": list(existing.get("tips") or []),
        "avoid": list(existing.get("avoid") or []),
    }

    for key in SLOT_KEYS:
        for i, row in enumerate(patch.get(key) or []):
            if not isinstance(row, dict):
                continue
            tid = str(row.get("id") or f"n{key[0]}{i + 1}")
            if tid in existing_ids:
                tid = f"n{tid}{i + 1}"
            existing_ids.add(tid)
            out[key].append({**row, "id": tid})

    seen_sched = {
        (str(r.get("day")), str(r.get("task")))
        for r in out["weekly_schedule"]
        if isinstance(r, dict)
    }
    for row in patch.get("weekly_schedule") or []:
        if not isinstance(row, dict):
            continue
        key = (str(row.get("day") or ""), str(row.get("task") or ""))
        if not key[0] or not key[1] or key in seen_sched:
            continue
        seen_sched.add(key)
        out["weekly_schedule"].append({"day": key[0][:8], "task": key[1][:100]})

    for tip in patch.get("tips") or []:
        s = str(tip).strip()[:120]
        if s and s not in out["tips"]:
            out["tips"].append(s)
    for tip in patch.get("avoid") or []:
        s = str(tip).strip()[:120]
        if s and s not in out["avoid"]:
            out["avoid"].append(s)

    out["tips"] = out["tips"][:8]
    out["avoid"] = out["avoid"][:8]
    out["weekly_schedule"] = out["weekly_schedule"][:10]
    return out


def generate_care_plan(
    *,
    condition: str,
    texture: str,
    color_status: str,
    products: list[dict[str, Any]],
    scalp: str = "",
    concerns: list[str] | None = None,
    gender: str = "",
    mode: str = "full",
    existing_plan: dict[str, Any] | None = None,
) -> dict[str, Any]:
    mode_s = (mode or "full").strip().lower()
    if mode_s == "append":
        if not products:
            raise AiStyleError("Yangi mahsulot kerak.", 400)
        if not isinstance(existing_plan, dict):
            raise AiStyleError("Mavjud reja kerak.", 400)
        prompt = _build_append_prompt(
            condition=condition,
            texture=texture,
            color_status=color_status,
            scalp=scalp or "",
            concerns=concerns or [],
            new_products=products,
            existing_plan=existing_plan,
            gender=gender or "",
        )
        patch = _call_gemini_plan(prompt)
        usage = patch.pop("_usage", None)
        if not patch["morning"] and not patch["evening"] and not patch["weekly"]:
            raise AiStyleError("AI yangi qadam qo'shmadi. Qayta urinib ko'ring.", 502)
        merged = merge_care_plan_patch(existing_plan, patch)
        if usage:
            merged["_usage"] = usage
        return merged

    prompt = _build_prompt(
        condition=condition,
        texture=texture,
        color_status=color_status,
        scalp=scalp or "",
        concerns=concerns or [],
        products=products,
        gender=gender or "",
    )
    plan = _call_gemini_plan(prompt)
    if not plan["morning"] and not plan["evening"] and not plan["weekly"]:
        raise AiStyleError("AI reja bo'sh qaytdi. Qayta urinib ko'ring.", 502)
    return plan
