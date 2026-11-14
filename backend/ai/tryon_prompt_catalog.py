"""Catalog-backed try-on style prompts — per-slug structure, volume, and Pruna length budget."""

from __future__ import annotations

from ai.hairstyle_seed import HAIRSTYLE_SEED
from ai.hairstyle_seed_curly_batch import CURLY_BATCH_PROMPTS
from ai.hairstyle_seed_women import WOMEN_HAIRSTYLE_SEED
from ai.style_prompts import style_detail_for

PRUNA_STYLE_PROMPT_MAX = 2000

# ── Shared instruction blocks (compact; appended to every slug) ──

SHAPE_PRESERVATION = (
    "Reproduce this hairstyle's original silhouette, haircut geometry, structural proportions, "
    "hair distribution, volume, length, texture, layering and styling direction with maximum accuracy. "
    "Preserve its distinctive shape and visual identity. Do not redesign, reinterpret, exaggerate, "
    "inflate, flatten or distort. Maintain realistic proportions and natural integration with the "
    "user's head shape."
)

VOLUME_LOW = (
    "Maintain a compact, natural, low-volume hairstyle. Hair follows the head contour without "
    "excessive height, width or artificial fullness."
)

VOLUME_MEDIUM = (
    "Maintain balanced, realistic medium volume with accurate top height and side proportions. "
    "Avoid excessive thickness or unnatural expansion."
)

VOLUME_HIGH = (
    "Preserve the intended hairstyle volume and silhouette while maintaining realistic hair density, "
    "natural gravity and believable proportions."
)

HEAD_ADAPT = (
    "Adapt the selected hairstyle to the user's natural head dimensions, hairline and facial geometry "
    "without modifying the face. Fit as if professionally cut and styled by a real barber or stylist. "
    "Preserve the defining silhouette while adjusting only the minimum necessary for a natural fit."
)

FIT_SHORT = (
    "Keep the haircut compact, neat and closely fitted to the head. Preserve short length, natural "
    "scalp contour and precise side proportions."
)

FIT_LONG = (
    "Preserve intended length, layering, styling direction and natural hair movement without excessive "
    "volume or distorted proportions."
)

REALISTIC_HAIR = (
    "Photorealistic human hair: natural individual strands, realistic roots, believable density, subtle "
    "strand separation, natural shadows, authentic texture. Hair attached to the scalp with realistic "
    "transitions at forehead, temples, ears and neckline. No artificial volume, plastic texture, "
    "wig-like look, repetitive curls, unnatural clumps or distorted hairlines."
)

CURLY_EXTRA = (
    "Preserve the intended curl pattern: natural spiral structure, realistic curl density and size, mixed "
    "curl direction, natural movement, balanced volume, natural root transitions and strand separation. "
    "Do not use oversized circular curls, artificial ringlets, identical repeated curls, excessive forehead "
    "volume, plastic curls or unnatural expansion."
)

NEGATIVE_CONSTRAINTS = (
    "Do not change the face, skin, age, expression or pose. Do not change hair color unless explicitly "
    "requested. No new person, no beauty filter, no wig cap."
)

# Hand-tuned cores (override heuristic builder) — shape/volume blocks still appended.
STYLE_CORE_OVERRIDES: dict[str, str] = {
    "textured-fringe": (
        "Catalog cut: modern textured fringe. Short tapered sides; textured top with soft forward movement "
        "and irregular fringe on the forehead. Matte natural finish, believable density, clean hairline."
    ),
    "french-crop": (
        "Catalog cut: French crop. Short faded or tapered sides; textured top with forward fringe on the "
        "forehead. Matte finish, clean hairline, precise barber geometry."
    ),
    "textured-crop": (
        "Catalog cut: textured crop. Short faded sides; choppy forward texture on top with natural fringe. "
        "Matte salon finish, sharp barber lines."
    ),
    "mid-fade": (
        "Catalog cut: mid fade. Gradual fade at mid height on sides and back; short textured top; clean "
        "lineup; natural taper blend at temples."
    ),
    "low-fade": (
        "Catalog cut: low fade. Soft taper low near the ears; neat short top; conservative volume; clean finish."
    ),
    "skin-fade": (
        "Catalog cut: skin fade. Buzzed sides fading to skin; short top with sharp lineup; controlled low volume."
    ),
    "high-fade": (
        "Catalog cut: high fade. High fade line on sides; short textured top; defined temple blend."
    ),
    "buzz-cut": (
        "Catalog cut: buzz cut. Uniform short clipper length all over; minimal styling; natural scalp shadow."
    ),
    "pompadour": (
        "Catalog cut: pompadour. Volume swept up and back from the front; faded or tapered sides; height within "
        "natural skull width, not oversized."
    ),
    "undercut": (
        "Catalog cut: undercut. Very short sides with longer disconnected top; clear weight line; no head widening."
    ),
    "side-part": (
        "Catalog cut: side part. Clean parting; tapered sides; combed neat top; professional finish."
    ),
    "slick-back": (
        "Catalog cut: slick back. Hair combed straight back from the hairline; tapered sides; natural shine; "
        "do not push the hairline back."
    ),
    "curly-top-fade": (
        "Catalog cut: curly top fade. Natural curls on top with believable coil size; faded sides; volume within "
        "head width."
    ),
    "modern-mullet": (
        "Catalog cut: modern mullet. Shorter front and sides; longer back flow; balanced silhouette."
    ),
    "crew-cut": (
        "Catalog cut: crew cut. Slightly longer textured top; short tapered sides; military-neat finish."
    ),
    "quiff": (
        "Catalog cut: quiff. Forward-up volume at the front; faded sides; defined shape without oversized frontal mass."
    ),
    "messy-fringe": (
        "Catalog cut: messy fringe. Tousled forward texture; short sides; matte casual finish; irregular strands."
    ),
    "medium-curly": (
        "Catalog cut: medium-length curly hair. Soft defined 3A–3B curls with realistic distribution on top and sides "
        "slightly shorter; balanced volume; individual strands and natural roots."
    ),
    "natural-curly": (
        "Catalog cut: natural medium curls. Mixed coil direction, believable density, strand separation, volume inside "
        "original head width."
    ),
    "long-curly-hair": (
        "Catalog cut: long curly hair. Soft defined curls past the ears; realistic length, movement and balanced volume."
    ),
    "soft-bob": (
        "Catalog cut: soft bob. Collarbone length, slightly rounded ends, natural movement, salon blow-dry finish."
    ),
    "long-layers": (
        "Catalog cut: long layers. Below-shoulder length with face-framing layers, movement and healthy shine."
    ),
    "balayage": (
        "Catalog cut: long hair with dimensional balayage-style painting. Keep believable roots from the user photo "
        "unless a color change is requested."
    ),
    "pixie-cut": (
        "Catalog cut: feminine pixie. Textured short top; tapered nape and sides; modern crop silhouette."
    ),
    "beach-waves": (
        "Catalog cut: beach waves. Medium-length loose S-waves; lived-in soft volume; not tight curls."
    ),
    "straight-lob": (
        "Catalog cut: straight lob. Collarbone length, blunt-ish ends, sleek straight finish."
    ),
    "curtain-bangs": (
        "Catalog cut: curtain bangs. Center part with curtain fringe and soft face-framing medium layers."
    ),
    "shag-cut": (
        "Catalog cut: modern shag. Choppy layers, airy texture, light fringe, lived-in finish."
    ),
    "braids": (
        "Catalog cut: salon braids. Polished braid style with tidy edges; structured braid pattern."
    ),
    "updo-bun": (
        "Catalog cut: low updo bun. Elegant chignon with soft face-framing pieces; clean nape."
    ),
    "blunt-cut": (
        "Catalog cut: blunt cut. One-length medium hair with sharp salon line."
    ),
    "highlights": (
        "Catalog cut: highlighted layers. Medium length with subtle dimensional highlights respecting base color."
    ),
    "taper-cut": (
        "Catalog cut: taper cut. Soft gradual taper on sides; short neat top; natural professional blend."
    ),
    "ivy-league": (
        "Catalog cut: Ivy League. Short top slightly longer than a crew; tapered sides; neat partable texture."
    ),
    "caesar-cut": (
        "Catalog cut: Caesar. Short horizontal fringe; even short length; classic flat top profile."
    ),
    "bro-flow": (
        "Catalog cut: bro flow. Medium length swept back off the face; soft layers; athletic natural flow."
    ),
    "curtain-fringe": (
        "Catalog cut: curtain fringe. Center part with curtain bangs falling to each side; medium length."
    ),
    "drop-fade": (
        "Catalog cut: drop fade. Fade curving lower behind the ear; short textured top."
    ),
    "burst-fade": (
        "Catalog cut: burst fade. Circular fade around the ear; short or textured top preserved."
    ),
    "high-and-tight": (
        "Catalog cut: high and tight. Very short sides; short cropped top; minimal volume."
    ),
    "classic-taper": (
        "Catalog cut: classic taper. Neat short sides with soft blend; tidy short top."
    ),
    "soft-quiff": (
        "Catalog cut: soft quiff. Gentle front lift; natural texture; low fade sides."
    ),
    "forward-fringe": (
        "Catalog cut: forward fringe. Short fringe on forehead; faded sides; modern profile."
    ),
    "layered-medium": (
        "Catalog cut: layered medium. Movement through layers; soft ends; natural medium length."
    ),
    "comb-over-fade": (
        "Catalog cut: comb-over fade. Side-swept top; clean mid fade; polished silhouette."
    ),
    "faux-hawk": (
        "Catalog cut: faux hawk. Central ridge with short tapered sides; edgy but controlled height."
    ),
    "disconnected-crop": (
        "Catalog cut: disconnected crop. Textured top with hard disconnect to very short sides."
    ),
    "wet-curl-taper": (
        "Catalog cut: wet curl taper. Defined glossy curls on top and back; clean low taper at ears; "
        "wet-look finish; not straight or frizzy."
    ),
}


def all_catalog_rows() -> list[dict]:
    return [*HAIRSTYLE_SEED, *WOMEN_HAIRSTYLE_SEED]


def catalog_index() -> dict[tuple[str, str], dict]:
    index: dict[tuple[str, str], dict] = {}
    for row in all_catalog_rows():
        aud = str(row.get("audience", "men")).lower()
        slug = str(row.get("slug", "")).lower()
        if slug:
            index[(aud, slug)] = row
    return index


_CATALOG_BY_KEY = catalog_index()


_MANUAL_REVIEW: frozenset[str] | None = None


def slugs_needing_manual_review() -> frozenset[str]:
    global _MANUAL_REVIEW
    if _MANUAL_REVIEW is None:
        flagged: set[str] = set()
        for row in all_catalog_rows():
            slug = row["slug"]
            aud = row["audience"]
            detail = style_detail_for(aud, slug)
            if not detail or detail == slug.replace("-", " "):
                flagged.add(slug)
        _MANUAL_REVIEW = frozenset(flagged)
    return _MANUAL_REVIEW


_LOW_VOLUME_SLUGS = frozenset(
    {
        "buzz-cut",
        "high-and-tight",
        "crew-cut",
        "caesar-cut",
        "ivy-league",
        "skin-fade",
        "classic-taper",
        "taper-cut",
    }
)


def _volume_tier(row: dict | None, slug: str) -> str:
    if row:
        tags = [str(t).lower() for t in (row.get("tags") or [])]
        hl = str(row.get("hair_length", "medium")).lower()
    else:
        tags = []
        hl = "medium"
    blob = f"{slug} {' '.join(tags)}".lower()
    if slug in _LOW_VOLUME_SLUGS or "buzz" in blob:
        return "low"
    if any(
        k in blob
        for k in (
            "pompadour",
            "quiff",
            "afro",
            "mullet",
            "faux-hawk",
            "bowl",
            "wet-curl",
            "two-block",
            "balayage",
            "beach-waves",
        )
    ):
        return "high"
    return "medium"


def _is_curly(row: dict | None, slug: str) -> bool:
    if slug in {"beach-waves"}:
        return False
    tags = [str(t).lower() for t in ((row or {}).get("tags") or [])]
    if "curly" in tags or "perm" in tags:
        return True
    blob = f"{slug} {' '.join(tags)}".lower()
    return any(m in blob for m in ("curl", "coil", "ringlet", "afro", "perm")) and "slick" not in slug


def _fade_instruction(slug: str) -> str:
    if "skin-fade" in slug or slug == "skin-fade":
        return "Taper: skin/zero fade to bare skin on sides; crisp temple blend. "
    if "drop-fade" in slug:
        return "Taper: drop fade curving lower behind the ear toward the neckline. "
    if "burst-fade" in slug:
        return "Taper: burst fade radiating around the ear; short lower sides. "
    if "high-fade" in slug or slug == "high-fade":
        return "Taper: high fade line with short upper sides. "
    if "mid-fade" in slug or slug == "mid-fade":
        return "Taper: mid-level gradual fade on sides. "
    if "low-fade" in slug or slug == "low-fade":
        return "Taper: low fade with soft blend near the ears. "
    if "fade" in slug or "taper" in slug or "undercut" in slug:
        return "Taper: clean barber fade or taper on sides as defined by this cut. "
    return ""


def _fringe_instruction(slug: str) -> str:
    if any(k in slug for k in ("fringe", "crop", "caesar", "curtain", "bangs", "quiff")):
        return "Fringe: forward or curtain fringe positioned as in this style; do not add fringe if absent elsewhere. "
    return ""


def _length_instruction(hair_length: str) -> str:
    if hair_length == "short":
        return "Length: short overall — top, sides and back stay within short-barber proportions; do not lengthen. "
    if hair_length == "long":
        return "Length: long overall — preserve reach past shoulders where applicable. "
    return "Length: medium — ears to collarbone zone unless style specifies otherwise. "


def _expand_heuristic_core(*, audience: str, slug: str, title: str, row: dict | None) -> str:
    aud = audience.lower()
    hair_length = str((row or {}).get("hair_length", "medium")).lower()
    category = "women's salon" if aud == "women" else "men's barber"
    detail = style_detail_for(aud, slug)
    if slug in CURLY_BATCH_PROMPTS:
        detail = CURLY_BATCH_PROMPTS[slug].strip()
    safe_title = " ".join(str(title or slug).split())
    fade = _fade_instruction(slug)
    fringe = _fringe_instruction(slug)
    length = _length_instruction(hair_length)
    curly = _is_curly(row, slug)
    texture = (
        "Texture: natural curl or wave pattern as described; varied coil size and direction."
        if curly
        else "Texture: straight or natural salon texture as described; individual strand detail."
    )
    direction = ""
    if "slick" in slug:
        direction = "Direction: swept straight back from the hairline. "
    elif "side-part" in slug or "comb-over" in slug:
        direction = "Direction: side part with hair swept to one side. "
    elif "middle-part" in slug or "curtain" in slug:
        direction = "Direction: center or curtain part with hair falling to each side. "
    return (
        f"Apply catalog hairstyle \"{safe_title}\" ({slug}). Category: {category}. {length}"
        f"{fade}{fringe}{direction}{texture} "
        f"Structure: {detail}. Density natural; hairline realistic. Change only the hair."
    )


def style_core_for(*, audience: str, slug: str, title: str) -> str:
    key = (slug or "").strip().lower()
    aud = (audience or "men").strip().lower()
    if key in STYLE_CORE_OVERRIDES:
        return STYLE_CORE_OVERRIDES[key]
    row = _CATALOG_BY_KEY.get((aud, key))
    return _expand_heuristic_core(audience=aud, slug=key, title=title, row=row)


def _volume_block(tier: str) -> str:
    if tier == "low":
        return VOLUME_LOW
    if tier == "high":
        return VOLUME_HIGH
    return VOLUME_MEDIUM


def _fit_block(hair_length: str) -> str:
    return FIT_SHORT if hair_length == "short" else FIT_LONG


def build_style_instruction(
    *,
    audience: str,
    slug: str,
    title: str,
    max_chars: int | None = None,
) -> str:
    """Hairstyle-specific positive prompt without the global identity block."""
    aud = (audience or "men").strip().lower()
    key = (slug or "").strip().lower()
    row = _CATALOG_BY_KEY.get((aud, key))
    hair_length = str((row or {}).get("hair_length", "medium")).lower()
    tier = _volume_tier(row, key)
    curly = _is_curly(row, key)

    parts: list[tuple[str, bool]] = [
        (style_core_for(audience=aud, slug=key, title=title), False),
        (SHAPE_PRESERVATION, False),
        (_volume_block(tier), False),
        (HEAD_ADAPT, False),
        (_fit_block(hair_length), True),
        (REALISTIC_HAIR, True),
        (CURLY_EXTRA if curly else "", True),
        (NEGATIVE_CONSTRAINTS, True),
    ]
    limit = max_chars if max_chars is not None else PRUNA_STYLE_PROMPT_MAX
    return _join_with_budget(parts, limit=limit)


def _join_with_budget(parts: list[tuple[str, bool]], *, limit: int) -> str:
    """Drop optional trailing sections, then trim the core at sentence boundaries."""
    items = [(text.strip(), droppable) for text, droppable in parts if text and text.strip()]
    while True:
        rendered = " ".join(text for text, _ in items)
        if len(rendered) <= limit:
            return rendered
        drop_at = next((i for i in range(len(items) - 1, -1, -1) if items[i][1]), None)
        if drop_at is not None:
            items.pop(drop_at)
            continue
        core_text, _ = items[0]
        trimmed = _trim_at_boundary(core_text, limit - sum(len(t) for t, _ in items[1:]) - len(items) + 1)
        items[0] = (trimmed, False)
        rendered = " ".join(text for text, _ in items)
        return rendered if len(rendered) <= limit else rendered[:limit].rsplit(" ", 1)[0]


def _trim_at_boundary(text: str, budget: int) -> str:
    if len(text) <= budget:
        return text
    chunk = text[:budget]
    for sep in (". ", "; "):
        if sep in chunk:
            return chunk.rsplit(sep, 1)[0].strip() + "."
    return chunk.rstrip(" ,;.")