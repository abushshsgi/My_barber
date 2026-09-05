"""Gemini — "Bad Hair Day" (SOS) tezkor styling yechimi.

Bu oqim SALON/SARTAROSHNI TAVSIYA QILMAYDI — faqat uyda 2 daqiqada
bajariladigan styling hiylalari, tez pricheska va life-hack beradi.
"""

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

TIME_LABELS = {
    "2min": "atigi 2 daqiqa",
    "5-10min": "5-10 daqiqa",
    "15min+": "15 daqiqa yoki ko'proq",
}

ISSUE_LABELS = {
    "frizzy": "soch chirib/ko'tarilib ketgan (frizzy, static)",
    "oily": "ildiz yog'lanib, soch yopishib qolgan",
    "bedhead": "uyquda shaklsiz/g'ijim bo'lib qolgan (bedhead)",
    "dry": "juda quruq va qattiq, boshqarilmaydi",
}

TOOL_LABELS = {
    "dryer": "fen",
    "dry_shampoo": "quruq shampun / teshik upasi",
    "water_spray": "suv purkagich / sprey",
    "comb": "taroq yoki braking",
    "wax_gel": "vosk / gel / pomada / lak",
    "nothing": "hech qanday vosita yo'q — faqat qo'l va suv",
}

#: Modeldan chiqib ketishi mumkin bo'lgan "salonga bor" tipidagi so'zlar.
BANNED_TERMS = (
    "sartarosh",
    "salon",
    "barber",
    "usta ",
    "ustaga",
    "trixolog",
    "tricholog",
    "shifokor",
    "navbat ol",
    "band qil",
    "booking",
    "appointment",
)

FALLBACK: dict[str, dict[str, Any]] = {
    "frizzy": {
        "title": "Chirigan sochni 60 soniyada tinchitish",
        "steps": [
            "Kaftingizni ho'llab, ortiqcha suvni qoqib tashlang va faqat soch ustiga yengil bosib silang.",
            "Barmoq uchida bir tomchi vosk yoki krem oling, kaftga yoying va sochni pastdan yuqoriga siqib shakl bering.",
            "Yuqori qatlamni taroq bilan tarab, chirigan tuklarni asosiy massaga qo'shib qo'ying.",
        ],
        "suggested_hairstyle": "Messy Textured Look",
        "pro_tip": "Sochni sochiqda emas, paxta futbolkada quritsangiz ishqalanish kamayadi va chirish kamayadi.",
    },
    "oily": {
        "title": "Yog'langan ildizni tez yangilash",
        "steps": [
            "Ildizga quruq shampun yoki ozgina upa sepib, 30 soniya kutib barmoq uchi bilan ishqalang.",
            "Sochni pastga qarab tarab, keyin orqaga silliq taqsimlang — yog' porlashi tekislanadi.",
            "Faqat uchlariga juda oz vosk qo'ying, ildizga tegmang.",
        ],
        "suggested_hairstyle": "Slick Back",
        "pro_tip": "Quruq shampun bo'lmasa, salfetkani ildizga bosib 20 soniya ushlang — ortiqcha yog'ni tortib oladi.",
    },
    "bedhead": {
        "title": "Uyqudan keyin shaklni qaytarish",
        "steps": [
            "Faqat ildizni suv bilan namlang — butun sochni ho'llash shart emas.",
            "Fen bilan (yoki kaft bilan) ildizni ko'tarib, sochni ketmoqchi bo'lgan tomonga yotqizing.",
            "Gel yoki vosk bilan aniq taqsimot chizig'i qo'yib mustahkamlang.",
        ],
        "suggested_hairstyle": "Quick Side Parting",
        "pro_tip": "Sovuq havo bilan 15 soniya puflang — shakl issiq havodan ko'ra uzoq turadi.",
    },
    "dry": {
        "title": "Quruq sochni yumshatib shakllash",
        "steps": [
            "Purkagich yoki ho'l kaft bilan sochni yengil namlang, tomchilatib yubormang.",
            "Bir tomchi moy yoki krem kaftda isitib, uchlaridan boshlab yoying.",
            "Barmoq bilan (taroq bilan emas) tarab, tabiiy shaklda yotqizing.",
        ],
        "suggested_hairstyle": "Natural Textured Flow",
        "pro_tip": "Quruq sochni quruqligida tarash sindiradi — avval namlang, keyin barmoq bilan taqsimlang.",
    },
}


def _labels(keys: list[str], table: dict[str, str]) -> str:
    vals = [table[k] for k in keys if k in table]
    return ", ".join(vals) if vals else "aniqlanmagan"


def _has_banned(text: str) -> bool:
    low = f" {text.lower()} "
    return any(term in low for term in BANNED_TERMS)


def _fallback_fix(issues: list[str], tools: list[str]) -> dict[str, Any]:
    primary = next((i for i in issues if i in FALLBACK), "bedhead")
    base = FALLBACK[primary]
    steps = list(base["steps"])
    if "nothing" in tools or not tools:
        steps = [s for s in steps if "vosk" not in s and "gel" not in s and "shampun" not in s]
        steps.append("Kaftni ho'llab sochni siqib shakl bering — suv eng tez ishlaydigan styling vositasi.")
    return {
        "title": base["title"],
        "steps": steps[:3],
        "suggested_hairstyle": base["suggested_hairstyle"],
        "pro_tip": base["pro_tip"],
    }


def _build_prompt(
    *,
    time_available: str,
    issues: list[str],
    tools: list[str],
    condition: str,
    texture: str,
    gender: str,
) -> str:
    profile_lines = ""
    if condition:
        profile_lines += f"\n- hair condition: {condition}"
    if texture:
        profile_lines += f"\n- hair texture: {texture}"
    if gender in ("male", "female"):
        profile_lines += f"\n- gender: {gender}"

    return f"""You are Morf AI, an expert instant hair-styling assistant integrated into the MySaloon app.
The user is experiencing a "Bad Hair Day" and needs an immediate, pragmatic fix.

USER INPUT context:
- Time available: {TIME_LABELS.get(time_available, time_available)}
- Hair issue: {_labels(issues, ISSUE_LABELS)}
- Tools available: {_labels(tools, TOOL_LABELS)}{profile_lines}

RULES:
1. DO NOT mention or recommend barbers, salons, trichologists, or booking appointments under any circumstances.
2. Focus ONLY on actionable DIY home styling, quick hacks, or instant restructuring techniques.
3. Use ONLY the tools the user listed. If they have nothing, rely on water and hand technique.
4. Every step must fit inside the available time.
5. Keep the tone encouraging, fast-paced, and concise.
6. Response language MUST be clear, modern Uzbek (Latin script).

OUTPUT: RAW JSON only, no markdown fences.
{{
  "title": "Short catchy fix title (max 46 chars)",
  "steps": ["step 1", "step 2", "step 3"],
  "suggested_hairstyle": "Quick hairstyle name",
  "pro_tip": "1 sentence smart life-hack"
}}
Rules for JSON: max 3 steps, each step max 140 chars and starts with an action verb.
"""


def _normalize(data: dict[str, Any], *, issues: list[str], tools: list[str]) -> dict[str, Any]:
    fallback = _fallback_fix(issues, tools)

    steps: list[str] = []
    raw_steps = data.get("steps")
    if isinstance(raw_steps, list):
        for item in raw_steps:
            if isinstance(item, dict):
                item = item.get("text") or item.get("step") or item.get("title") or ""
            text = str(item or "").strip().lstrip("0123456789.)- ").strip()
            if not text or _has_banned(text):
                continue
            steps.append(text[:140])
            if len(steps) == 3:
                break
    if not steps:
        steps = fallback["steps"]

    title = str(data.get("title") or "").strip()[:60]
    if not title or _has_banned(title):
        title = fallback["title"]

    hairstyle = str(data.get("suggested_hairstyle") or data.get("hairstyle") or "").strip()[:60]
    if not hairstyle or _has_banned(hairstyle):
        hairstyle = fallback["suggested_hairstyle"]

    pro_tip = str(data.get("pro_tip") or data.get("tip") or "").strip()[:200]
    if not pro_tip or _has_banned(pro_tip):
        pro_tip = fallback["pro_tip"]

    return {
        "title": title,
        "steps": steps,
        "suggested_hairstyle": hairstyle,
        "pro_tip": pro_tip,
    }


def _call_gemini(prompt: str) -> tuple[dict[str, Any], dict[str, Any]]:
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.55,
            "maxOutputTokens": 700,
            "responseMimeType": "application/json",
        },
    }

    model = _vision_model()
    provider = "vertex" if vertex_configured() else "studio"
    started = time.perf_counter()

    if vertex_configured():
        try:
            payload = generate_content(model, body, timeout=20, kind="general")
        except AiStyleError:
            raise
        except Exception as exc:
            logger.warning("Vertex SOS fix error (%s): %s", model, exc)
            raise AiStyleError("Tezkor yechim vaqtincha ishlamayapti.", 502) from exc
    else:
        api_key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not api_key:
            raise AiStyleError("AI xizmati hozircha ulanmagan.", 503)
        body_legacy = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": body["generationConfig"],
        }
        try:
            payload = _post_gemini(model, api_key, body_legacy)
        except urllib.error.HTTPError as exc:
            logger.warning("Gemini SOS fix HTTP %s: %s", exc.code, exc)
            raise AiStyleError("Tezkor yechim xatosi.", 502) from exc
        except Exception as exc:
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    candidates = payload.get("candidates") or []
    parts = (candidates[0].get("content") or {}).get("parts") or [] if candidates else []
    text_parts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
    if not text_parts:
        raise AiStyleError("AI javob bermadi.", 502)

    data = _extract_json("".join(text_parts))
    usage = {
        **finalize_usage(payload, kind="analyze"),
        "provider": provider,
        "model": model,
        "latency_ms": latency_ms,
    }
    return data, usage


def generate_sos_fix(
    *,
    time_available: str,
    issues: list[str],
    tools: list[str],
    condition: str = "",
    texture: str = "",
    gender: str = "",
) -> dict[str, Any]:
    """SOS tezkor yechim. AI yiqilsa ham deterministik yechim qaytaradi."""
    prompt = _build_prompt(
        time_available=time_available,
        issues=issues,
        tools=tools,
        condition=condition,
        texture=texture,
        gender=(gender or "").strip().lower(),
    )
    try:
        data, usage = _call_gemini(prompt)
    except AiStyleError as exc:
        logger.info("SOS fix fallback: %s", exc)
        return {**_fallback_fix(issues, tools), "source": "fallback"}

    fix = _normalize(data, issues=issues, tools=tools)
    fix["source"] = "ai"
    fix["_usage"] = usage
    return fix
