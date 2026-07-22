"""Soch uslubi tavsiflari — AI try-on promptlari uchun."""

from __future__ import annotations

MEN_STYLE_PROMPTS: dict[str, str] = {
    "old-money-loose-curl": (
        "old money loose curls from behind: medium-length soft open curls cascading "
        "down the nape, polished premium silhouette, neat natural taper at sides, "
        "no harsh skin fade, European classic wealth aesthetic, back-of-head readable shape"
    ),
    "old-money-soft-wave": (
        "old money soft waves from behind: refined S-shaped waves flowing over the crown "
        "and nape, sleek premium finish, tidy length around ears, classic European look, "
        "no street fade, back view shows smooth wave pattern"
    ),
    "old-money-defined-curl": (
        "old money defined curls from behind: clear spiral curl definition across the "
        "back of the head, medium length, neat premium outline, controlled volume at crown, "
        "clean nape, no buzz or skin fade, back-of-head fully readable"
    ),
    "old-money-layered-curl": (
        "old money layered curls from behind: layered curly cut with volume on top and "
        "longer flowing curls down the back, premium old-money silhouette, soft taper sides, "
        "no harsh disconnect, nape shape clear from behind"
    ),
    "old-money-tousled-curl": (
        "old money tousled curls from behind: casually tousled medium curls with effortless "
        "premium texture, natural movement over the nape, neat overall outline, "
        "no aggressive fade, European old-money back view"
    ),
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


def style_detail_for(audience: str, slug: str) -> str:
    catalog = WOMEN_STYLE_PROMPTS if audience == "women" else MEN_STYLE_PROMPTS
    return catalog.get(slug, slug.replace("-", " "))
