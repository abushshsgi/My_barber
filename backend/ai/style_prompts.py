"""Soch uslubi tavsiflari — AI try-on promptlari uchun."""

from __future__ import annotations

MEN_STYLE_PROMPTS: dict[str, str] = {
    "mid-fade": "mid fade haircut, clean taper, short textured top",
    "low-fade": "low fade haircut, natural taper, neat short top",
    "skin-fade": "skin fade zero fade sides, very short top, sharp line-up",
    "buzz-cut": "buzz cut uniform short clipper length all over",
    "textured-crop": "textured crop short faded sides messy forward fringe top",
    "pompadour": "pompadour volume swept up and back faded sides",
    "undercut": "undercut short sides long top dramatic disconnect",
    "side-part": "classic side part neat tapered sides professional look",
    "french-crop": "french crop short forward fringe faded sides",
    "slick-back": "slick back medium hair combed straight back pomade shine",
    "curly-top-fade": "curly top fade natural curls on top skin fade sides",
    "modern-mullet": "modern mullet short front faded sides longer back",
}

# Yangi 20 uslub promptlari
from ai.hairstyle_seed_new20 import NEW_MEN_STYLE_PROMPTS  # noqa: E402

MEN_STYLE_PROMPTS.update(NEW_MEN_STYLE_PROMPTS)

WOMEN_STYLE_PROMPTS: dict[str, str] = {
    "soft-bob": "soft bob haircut shoulder length",
    "long-layers": "long layered hair with movement",
    "balayage": "balayage highlighted long hair natural tones",
    "pixie-cut": "pixie cut short feminine",
    "beach-waves": "beach waves medium length hair",
    "straight-lob": "straight lob haircut blunt ends",
    "curtain-bangs": "curtain bangs medium length hair",
    "shag-cut": "shag cut layered textured",
    "braids": "braided hairstyle neat braids",
    "updo-bun": "elegant updo bun hairstyle",
    "blunt-cut": "blunt cut straight medium hair",
    "highlights": "highlighted medium hair salon color",
}


def style_detail_for(audience: str, slug: str) -> str:
    catalog = WOMEN_STYLE_PROMPTS if audience == "women" else MEN_STYLE_PROMPTS
    return catalog.get(slug, slug.replace("-", " "))
