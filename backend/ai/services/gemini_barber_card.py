"""Gemini Vision — hairstyle image → Barber Master Card JSON."""

from __future__ import annotations

import logging
from typing import Any

from ai.services.errors import AiStyleError
from ai.services.gemini_style import (
    _gemini_vision_json,
    load_image_bytes,
)

logger = logging.getLogger(__name__)

FADE_TYPES = frozenset({"Skin", "Low", "Mid", "High"})
CUT_TECHNIQUES = frozenset({"Point cut", "Blunt"})


def _build_barber_card_prompt(style_name: str | None) -> str:
    name_hint = (style_name or "").strip()
    name_line = (
        f'Target style name hint: "{name_hint}". Use it in style_overview.name when plausible.\n'
        if name_hint
        else ""
    )
    return f"""You are a master barber and educator. Analyze the hairstyle in this image and produce a
technical Barber Master Card used in a salon.

Use international barber terminology:
- Clipper guards #0 (0 mm / skin) through #4 (~13 mm)
- Fade types: Skin, Low, Mid, High
- Cutting: Point cut, Blunt
- Note hair density, neckline shape, and facial hair if present

{name_line}
Return ONLY valid JSON with this exact shape (no markdown):
{{
  "style_overview": {{
    "name": "string",
    "category": "string",
    "face_shape": "oval|round|square|heart|diamond|oblong"
  }},
  "sides_and_back": {{
    "fade_type": "Skin|Low|Mid|High",
    "starting_guard": 0,
    "transition_guard": 3,
    "neckline": "string"
  }},
  "top_section": {{
    "estimated_length_cm": 5,
    "cutting_technique": "Point cut|Blunt",
    "texturizing_level": "None|Light|Medium|Heavy",
    "styling_product": "string"
  }},
  "beard_and_facial_hair": {{
    "present": false,
    "style": "",
    "cheek_line": "",
    "length_mm": 0
  }},
  "notes_for_barber": "short practical tip"
}}

Rules:
- starting_guard and transition_guard are millimeters (0–25)
- estimated_length_cm is centimeters (0–40)
- If no beard, present=false and empty strings / 0 for beard fields
- Be specific and actionable for a barber executing the cut"""


def default_barber_master_card(style_name: str | None = None) -> dict[str, Any]:
    return {
        "style_overview": {
            "name": (style_name or "Custom cut").strip() or "Custom cut",
            "category": "Fade",
            "face_shape": "oval",
        },
        "sides_and_back": {
            "fade_type": "Mid",
            "starting_guard": 0,
            "transition_guard": 3,
            "neckline": "Tapered",
        },
        "top_section": {
            "estimated_length_cm": 5,
            "cutting_technique": "Point cut",
            "texturizing_level": "Medium",
            "styling_product": "Matte clay",
        },
        "beard_and_facial_hair": {
            "present": False,
            "style": "",
            "cheek_line": "",
            "length_mm": 0,
        },
        "notes_for_barber": "",
    }


def _as_float(value: Any, default: float, lo: float, hi: float) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return default
    if n < lo:
        return lo
    if n > hi:
        return hi
    return n


def _as_str(value: Any, default: str, max_len: int = 120) -> str:
    text = str(value or "").strip() or default
    return text[:max_len]


def normalize_barber_master_card(
    data: dict[str, Any] | None,
    *,
    style_name: str | None = None,
) -> dict[str, Any]:
    base = default_barber_master_card(style_name)
    if not isinstance(data, dict):
        return base

    overview = data.get("style_overview") if isinstance(data.get("style_overview"), dict) else {}
    sides = data.get("sides_and_back") if isinstance(data.get("sides_and_back"), dict) else {}
    top = data.get("top_section") if isinstance(data.get("top_section"), dict) else {}
    beard = (
        data.get("beard_and_facial_hair")
        if isinstance(data.get("beard_and_facial_hair"), dict)
        else {}
    )

    fade = _as_str(sides.get("fade_type"), "Mid", 16)
    if fade not in FADE_TYPES:
        fade = "Mid"
    technique = _as_str(top.get("cutting_technique"), "Point cut", 32)
    if technique not in CUT_TECHNIQUES:
        technique = "Point cut"

    present = bool(beard.get("present"))
    return {
        "style_overview": {
            "name": _as_str(overview.get("name"), base["style_overview"]["name"], 120),
            "category": _as_str(overview.get("category"), "Fade", 80),
            "face_shape": _as_str(overview.get("face_shape"), "oval", 40),
        },
        "sides_and_back": {
            "fade_type": fade,
            "starting_guard": _as_float(sides.get("starting_guard"), 0, 0, 25),
            "transition_guard": _as_float(sides.get("transition_guard"), 3, 0, 25),
            "neckline": _as_str(sides.get("neckline"), "Tapered", 80),
        },
        "top_section": {
            "estimated_length_cm": _as_float(top.get("estimated_length_cm"), 5, 0, 40),
            "cutting_technique": technique,
            "texturizing_level": _as_str(top.get("texturizing_level"), "Medium", 80),
            "styling_product": _as_str(top.get("styling_product"), "Matte clay", 120),
        },
        "beard_and_facial_hair": {
            "present": present,
            "style": _as_str(beard.get("style"), "", 80) if present else "",
            "cheek_line": _as_str(beard.get("cheek_line"), "", 80) if present else "",
            "length_mm": _as_float(beard.get("length_mm"), 0, 0, 100) if present else 0,
        },
        "notes_for_barber": _as_str(data.get("notes_for_barber"), "", 500),
    }


def generate_barber_master_card(
    image_source: str,
    *,
    style_name: str | None = None,
) -> dict[str, Any]:
    """Returns { master_card, fallback, _usage }."""
    mime, image_bytes = load_image_bytes(image_source)
    prompt = _build_barber_card_prompt(style_name)
    try:
        data, usage = _gemini_vision_json(prompt, mime, image_bytes)
        card = normalize_barber_master_card(data, style_name=style_name)
        return {
            "master_card": card,
            "fallback": False,
            "_usage": usage,
        }
    except AiStyleError:
        raise
    except Exception as exc:
        logger.warning("Barber card parse/normalize failed: %s", exc)
        return {
            "master_card": default_barber_master_card(style_name),
            "fallback": True,
            "_usage": {},
            "detail": "AI response incomplete; used safe fallback card.",
        }
