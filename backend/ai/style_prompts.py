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

# Yangi 20 uslub + curly batch promptlari
from ai.hairstyle_seed_curly_batch import CURLY_BATCH_PROMPTS  # noqa: E402
from ai.hairstyle_seed_new20 import NEW_MEN_STYLE_PROMPTS  # noqa: E402

MEN_STYLE_PROMPTS.update(NEW_MEN_STYLE_PROMPTS)
MEN_STYLE_PROMPTS.update(CURLY_BATCH_PROMPTS)

WOMEN_STYLE_PROMPTS: dict[str, str] = {
    "soft-bob": (
        "soft bob haircut at collarbone length, slightly rounded ends, natural movement, "
        "clean salon finish, feminine silhouette"
    ),
    "long-layers": (
        "long layered hair below the shoulders with face-framing layers, movement and volume, "
        "healthy shine, salon blow-dry"
    ),
    "balayage": (
        "long hair with natural balayage highlights, sun-kissed dimension, soft grown-out roots, "
        "flowing layers"
    ),
    "pixie-cut": (
        "short feminine pixie cut, textured top, tapered nape and sides, modern salon crop"
    ),
    "beach-waves": (
        "medium-length beach waves, loose S-shaped texture, lived-in salon waves, soft volume"
    ),
    "straight-lob": (
        "straight long bob (lob) at the collarbone, blunt-ish ends, sleek salon-straight finish"
    ),
    "curtain-bangs": (
        "medium-length hair with curtain bangs parted in the center, face-framing fringe, "
        "soft layers"
    ),
    "shag-cut": (
        "modern shag cut, choppy layers, airy texture, light fringe, lived-in salon finish"
    ),
    "braids": (
        "neat salon braided hairstyle, two clean braids or a polished braid look, "
        "tidy edges, feminine"
    ),
    "updo-bun": (
        "elegant low updo bun, polished salon chignon, soft face-framing pieces, clean nape"
    ),
    "blunt-cut": (
        "blunt cut straight medium hair, one-length ends, sharp salon line, healthy shine"
    ),
    "highlights": (
        "medium-length salon hair with dimensional highlights, bright but natural color, "
        "layered movement"
    ),
}


def style_detail_for(audience: str, slug: str) -> str:
    catalog = WOMEN_STYLE_PROMPTS if audience == "women" else MEN_STYLE_PROMPTS
    return catalog.get(slug, slug.replace("-", " "))
