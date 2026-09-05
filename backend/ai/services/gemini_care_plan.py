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
    return "\n".join(lines) if lines else "(foydalanuvchida mahsulot yo'q)"


def _normalize_clock(raw: Any) -> str:
    """Return HH:MM or empty."""
    s = str(raw or "").strip()
    if not s:
        return ""
    s = s.replace(".", ":")
    parts = s.split(":")
    if len(parts) < 2:
        return ""
    try:
        h = int(parts[0].strip())
        m = int("".join(ch for ch in parts[1].strip() if ch.isdigit())[:2] or "0")
    except ValueError:
        return ""
    if h < 0 or h > 23 or m < 0 or m > 59:
        return ""
    return f"{h:02d}:{m:02d}"


def _wash_architecture(condition: str) -> str:
    return {
        "oily": "Yuvish 3–4×/hafta (masalan Du, Chor, Ju, Yak). Boshqa kunlar: ildizni yangilash / yengil leave-in.",
        "dry": "Yuvish 2×/hafta (masalan Se, Shan). Boshqa kunlar: leave-in / suv bilan yangilash.",
        "damaged": "Yuvish 2×/hafta + 1 maska kechasi. Har kuni shampun yo‘q.",
        "normal": "Yuvish 2–3×/hafta. Oraliq kunlarda yengil styling.",
    }.get(condition, "Yuvish 2–3×/hafta.")


def _build_prompt(
    *,
    condition: str,
    texture: str,
    color_status: str,
    scalp: str,
    concerns: list[str],
    products: list[dict[str, Any]],
    gender: str = "",
    morning_time: str = "",
    evening_time: str = "",
) -> str:
    catalog = _format_products(products)
    has_products = bool(products)
    concern_s = ", ".join(concerns) if concerns else "none"
    scalp_s = scalp or "unknown"
    gender_s = (gender or "").strip().lower()
    gender_line = ""
    if gender_s in ("male", "female"):
        gender_line = f"\n- gender: {gender_s}"

    m_anchor = _normalize_clock(morning_time) or "07:30"
    e_anchor = _normalize_clock(evening_time) or "21:00"

    product_rule = (
        "CRITICAL: User HAS products. Almost EVERY step MUST use one of them "
        "(product_id + exact product_name from the list). Do NOT invent generic "
        "'Shampun'/'Konditsioner' if a matching category exists. "
        "Map: shampoo→shampoo, balsam/conditioner→balsam, mask→mask, oil→oil, spray→spray."
        if has_products
        else "User has NO products yet — still give a timed architecture with product_name as "
        "category hints (e.g. 'Namlantiruvchi shampun') and product_id=null."
    )

    return f"""You are a senior trichologist + routine ARCHITECT for Morf AI (MyBarber).
Build a REAL daily/weekly schedule with CLOCK TIMES — not a vague tip list.

USER HAIR PROFILE:
- condition: {condition}
- texture: {texture}
- color_status: {color_status}
- scalp: {scalp_s}
- concerns: {concern_s}{gender_line}

USER PREFERRED WINDOWS (HARD CONSTRAINT):
- morning ritual MUST start at {m_anchor} (first morning step time = {m_anchor}, then +5–10 min steps)
- evening ritual MUST start at {e_anchor} (first evening step time = {e_anchor}, then ascending)
- Adapt step density to hair condition ({condition}) — oily may wash more days; dry/damaged fewer washes + more leave-in/mask.

USER PRODUCTS:
{catalog}

{product_rule}

ARCHITECTURE RULES:
1. Output RAW JSON only (no markdown). All user strings in Uzbek Latin.
2. morning: 3–5 steps, times ascending starting at {m_anchor}.
3. evening: 3–5 steps, times ascending starting at {e_anchor}.
4. Each morning/evening/weekly task MUST include:
   - "time": "HH:MM" (24h, REQUIRED)
   - "time_hint": clock + short context (e.g. "{m_anchor} · Ertalab")
   - "duration_min": integer 1–30
   - title, subtitle (how-to for THIS hair)
   - icon: water|flask|sparkles|shield|leaf|cut
   - product_id / product_name per rules above
5. weekly: 3–4 deep-care steps (mask, scalp, trim…) near evening window when possible.
6. weekly_schedule: EXACTLY 7 days in order Du,Se,Chor,Pay,Ju,Shan,Ya — each with:
   day, time (HH:MM), task, product_name, product_id (or null).
   Wash architecture: {_wash_architecture(condition)}
   Non-wash days still get a short timed task (leave-in, scalp massage, pillowcare…).
7. summary: 1–2 sentences naming wash frequency + focus + preferred windows + products if any.
8. tips: 3 tips; avoid: 3 things to skip.
9. Sort every slot by "time" ascending.
10. NEVER use vague-only time_hint like "Ertalab" without HH:MM.

OUTPUT SCHEMA:
{{
  "summary": "...",
  "morning": [
    {{
      "id": "m1",
      "title": "...",
      "subtitle": "...",
      "time": "{m_anchor}",
      "time_hint": "{m_anchor} · Ertalab",
      "duration_min": 5,
      "icon": "water",
      "product_id": 12,
      "product_name": "Exact product name"
    }}
  ],
  "evening": [],
  "weekly": [],
  "weekly_schedule": [
    {{ "day": "Du", "time": "{m_anchor}", "task": "...", "product_id": 12, "product_name": "..." }}
  ],
  "tips": ["...", "..."],
  "avoid": ["...", "..."]
}}
"""


def _clock_to_min(clock: str) -> int:
    parts = clock.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def _min_to_clock(total: int) -> str:
    x = total % 1440
    if x < 0:
        x += 1440
    return f"{x // 60:02d}:{x % 60:02d}"


def _anchor_task_list(tasks: list[dict[str, Any]], anchor: str) -> list[dict[str, Any]]:
    """Shift slot so first timed step lands on preferred anchor; keep gaps."""
    if not tasks or not anchor:
        return tasks
    clocks = [_normalize_clock(t.get("time")) for t in tasks]
    first = next((c for c in clocks if c), "")
    if not first:
        base = _clock_to_min(anchor)
        out: list[dict[str, Any]] = []
        for i, t in enumerate(tasks):
            clock = _min_to_clock(base + i * 8)
            hint = str(t.get("time_hint") or "").strip()
            rest = hint
            for old in clocks:
                if old and hint.startswith(old):
                    rest = hint[len(old) :].lstrip(" ·")
                    break
            row = dict(t)
            row["time"] = clock
            row["time_hint"] = f"{clock} · {rest}" if rest else clock
            out.append(row)
        return out
    delta = _clock_to_min(anchor) - _clock_to_min(first)
    out = []
    for t in tasks:
        row = dict(t)
        clock = _normalize_clock(row.get("time"))
        if clock:
            new_c = _min_to_clock(_clock_to_min(clock) + delta)
            hint = str(row.get("time_hint") or "")
            if hint.startswith(clock):
                hint = new_c + hint[len(clock) :]
            elif hint:
                hint = f"{new_c} · {hint}"
            else:
                hint = new_c
            row["time"] = new_c
            row["time_hint"] = hint
        out.append(row)
    return out


def _apply_preferred_times(
    plan: dict[str, Any],
    *,
    morning_time: str,
    evening_time: str,
) -> dict[str, Any]:
    m = _normalize_clock(morning_time)
    e = _normalize_clock(evening_time)
    if m:
        plan["morning"] = _anchor_task_list(list(plan.get("morning") or []), m)
    if e:
        plan["evening"] = _anchor_task_list(list(plan.get("evening") or []), e)
        plan["weekly"] = _anchor_task_list(list(plan.get("weekly") or []), e)
    return plan


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

    clock = _normalize_clock(raw.get("time") or raw.get("clock"))
    time_hint = str(raw.get("time_hint") or "").strip()[:60]
    if clock and clock not in time_hint:
        time_hint = f"{clock} · {time_hint}" if time_hint else clock
    elif not time_hint and clock:
        time_hint = clock

    duration = raw.get("duration_min")
    duration_min: int | None = None
    if isinstance(duration, int) and 1 <= duration <= 60:
        duration_min = duration
    elif isinstance(duration, str) and duration.isdigit():
        n = int(duration)
        if 1 <= n <= 60:
            duration_min = n

    return {
        "id": str(raw.get("id") or f"{prefix}{idx}"),
        "title": title[:80],
        "subtitle": str(raw.get("subtitle") or "").strip()[:140],
        "time": clock,
        "time_hint": time_hint[:60],
        "duration_min": duration_min,
        "icon": icon,
        "product_id": product_id,
        "product_name": str(raw.get("product_name") or "").strip()[:80],
    }


def _normalize_schedule_row(item: dict[str, Any]) -> dict[str, Any] | None:
    day = str(item.get("day") or "").strip()[:8]
    task = str(item.get("task") or "").strip()[:120]
    if not day or not task:
        return None
    clock = _normalize_clock(item.get("time"))
    pid = item.get("product_id")
    product_id: int | None = None
    if isinstance(pid, int) and pid > 0:
        product_id = pid
    elif isinstance(pid, str) and pid.isdigit():
        product_id = int(pid)
    return {
        "day": day,
        "time": clock,
        "task": task,
        "product_id": product_id,
        "product_name": str(item.get("product_name") or "").strip()[:80],
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
        rows.sort(key=lambda r: r.get("time") or "99:99")
        slots[key] = rows

    schedule: list[dict[str, Any]] = []
    raw_sched = data.get("weekly_schedule")
    if isinstance(raw_sched, list):
        for item in raw_sched[:7]:
            if not isinstance(item, dict):
                continue
            row = _normalize_schedule_row(item)
            if row:
                schedule.append(row)

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

    existing_compact = {
        "morning": existing_plan.get("morning") or [],
        "evening": existing_plan.get("evening") or [],
        "weekly": existing_plan.get("weekly") or [],
        "weekly_schedule": existing_plan.get("weekly_schedule") or [],
    }
    existing_json = json.dumps(existing_compact, ensure_ascii=False)[:3500]

    return f"""You are a senior trichologist for Morf AI (MyBarber).
The user ALREADY has a timed care architecture. They ADDED new product(s).
ONLY create NEW timed steps for the NEW products. Do NOT rewrite existing steps.

USER HAIR PROFILE:
- condition: {condition}
- texture: {texture}
- color_status: {color_status}
- scalp: {scalp_s}
- concerns: {concern_s}{gender_line}

EXISTING PLAN (read-only):
{existing_json}

NEW PRODUCTS ONLY:
{catalog}

RULES:
1. RAW JSON only. Uzbek Latin strings.
2. 1–2 new steps per new product across morning/evening/weekly as fits.
3. Every new step MUST have product_id + exact product_name, "time": "HH:MM", time_hint, duration_min.
4. Choose times that do NOT collide with existing clocks (e.g. +5–10 min after a related step).
5. Unique ids prefixed with "n".
6. weekly_schedule: only EXTRA day notes for new products (day+time+task+product).
7. summary: one short sentence about what was ADDED.
8. tips/avoid: only new ones or [].

OUTPUT SCHEMA:
{{
  "summary": "...",
  "morning": [],
  "evening": [],
  "weekly": [],
  "weekly_schedule": [{{ "day": "Se", "time": "20:30", "task": "...", "product_id": 9, "product_name": "..." }}],
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
        out[key].sort(key=lambda r: (r.get("time") or "99:99") if isinstance(r, dict) else "99:99")

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
        out["weekly_schedule"].append(
            {
                "day": key[0][:8],
                "time": _normalize_clock(row.get("time")),
                "task": key[1][:120],
                "product_id": row.get("product_id"),
                "product_name": str(row.get("product_name") or "").strip()[:80],
            }
        )

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
    out["weekly_schedule"] = out["weekly_schedule"][:14]
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
    morning_time: str = "",
    evening_time: str = "",
) -> dict[str, Any]:
    mode_s = (mode or "full").strip().lower()
    m_time = _normalize_clock(morning_time)
    e_time = _normalize_clock(evening_time)
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
        merged = _apply_preferred_times(merged, morning_time=m_time, evening_time=e_time)
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
        morning_time=m_time,
        evening_time=e_time,
    )
    plan = _call_gemini_plan(prompt)
    if not plan["morning"] and not plan["evening"] and not plan["weekly"]:
        raise AiStyleError("AI reja bo'sh qaytdi. Qayta urinib ko'ring.", 502)
    return _apply_preferred_times(plan, morning_time=m_time, evening_time=e_time)
