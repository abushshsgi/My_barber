"""Explore soch rasmlari — har yosh guruhi va uslub uchun AI promptlar."""

from __future__ import annotations

AGE_GROUP_DESCRIPTIONS: dict[str, str] = {
    "kids": "boy age 10-12",
    "teen": "teenage boy age 14-16",
    "young": "young man age 22-28",
    "adult": "man age 35-42",
    "mature": "mature man age 50-58",
}

WOMEN_AGE_DESCRIPTIONS: dict[str, str] = {
    "kids": "girl age 10-12",
    "teen": "teenage girl age 14-16",
    "young": "young woman age 22-28",
    "adult": "woman age 35-42",
    "mature": "mature woman age 50-58",
}

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

NEGATIVE_PROMPT = (
    "cartoon, anime, illustration, watermark, text, logo, busy background, "
    "barber shop, side profile, sunglasses, hat, jewelry, dramatic lighting, "
    "colored background, gradient, deformed face, multiple people"
)


def reference_prompt(*, audience: str, age_group: str) -> str:
    age_map = WOMEN_AGE_DESCRIPTIONS if audience == "women" else AGE_GROUP_DESCRIPTIONS
    age_desc = age_map[age_group]
    subject = "woman" if audience == "women" else "man"
    hair = "neutral medium length hair" if audience == "women" else "neutral short hair"
    return (
        f"Professional studio portrait, {age_desc} Central Asian {subject}, "
        f"neutral light gray background exactly #E8E8E8, front-facing, shoulders visible, "
        f"{hair}, soft even studio lighting, photorealistic, clean skin, "
        f"plain dark t-shirt, neutral expression, 3:4 vertical aspect ratio, salon catalog"
    )


def style_prompt(*, audience: str, age_group: str, slug: str) -> str:
    style_map = WOMEN_STYLE_PROMPTS if audience == "women" else MEN_STYLE_PROMPTS
    style_detail = style_map[slug]
    age_map = WOMEN_AGE_DESCRIPTIONS if audience == "women" else AGE_GROUP_DESCRIPTIONS
    age_desc = age_map[age_group]
    subject = "woman" if audience == "women" else "man"
    return (
        f"Professional studio headshot, {age_desc} Central Asian {subject}, "
        f"identical gray background #E8E8E8, front-facing, shoulders visible, "
        f"neutral expression, plain dark t-shirt, soft even lighting, photorealistic, "
        f"ONLY hairstyle changed to {style_detail}, professional salon result, "
        f"3:4 vertical aspect ratio, sharp hair detail"
    )


def output_path(*, audience: str, age_group: str, slug: str) -> str:
    if age_group == "young":
        return f"{audience}/{slug}.webp"
    return f"{audience}/{age_group}/{slug}.webp"
