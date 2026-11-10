"""Structured hairstyle locks for Try-On prompt consistency.

Each catalog style gets a stable text specification so the same slug produces
the same defining features across users. Fields are filled from seed metadata
and style_detail prompts; ambiguous attributes are not invented.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ai.hairstyle_seed import HAIRSTYLE_SEED
from ai.style_prompts import WOMEN_STYLE_PROMPTS, style_detail_for

_CATALOG_BY_KEY: dict[tuple[str, str], dict[str, Any]] = {}
for _row in HAIRSTYLE_SEED:
    _aud = str(_row.get("audience") or "men")
    _slug = str(_row.get("slug") or "")
    if _slug:
        _CATALOG_BY_KEY[(_aud, _slug)] = _row


@dataclass(frozen=True)
class StyleLock:
    style_id: str
    style_name: str
    reference_image: str
    hair_length: str
    hair_texture: str
    curl_pattern: str
    hair_direction: str
    fringe_type: str
    top_volume: str
    side_length: str
    silhouette: str
    defining_features: str


def _tag_blob(row: dict[str, Any], detail: str) -> str:
    tags = " ".join(str(t) for t in (row.get("tags") or []))
    return f"{tags} {detail} {row.get('slug', '')}".lower()


def _infer_texture(blob: str, length: str) -> str:
    if any(m in blob for m in ("curl", "coil", "ringlet", "jingalak", "perm")):
        return "curly"
    if any(m in blob for m in ("wave", "wavy", "beach")):
        return "wavy"
    if "buzz" in blob or length == "short" and "fade" in blob and "texture" not in blob:
        if "buzz" in blob:
            return "clipper-short"
    if "slick" in blob or "sleek" in blob:
        return "sleek-combed"
    if "textured" in blob or "crop" in blob or "messy" in blob:
        return "textured"
    return "natural"


def _infer_curl_pattern(blob: str, texture: str) -> str:
    if texture != "curly":
        if texture == "wavy":
            return "soft S-waves, mixed direction, no tight spirals"
        return "no defined curls"
    if "slick" in blob and "back" in blob:
        return "defined curls combed backward, medium coil size, not stacked on the forehead"
    if "fringe" in blob or "forward" in blob:
        return "forward-facing curls over the brow, medium coil size, separated strands"
    if "wet" in blob or "gloss" in blob:
        return "defined glossy curls with natural mixed direction, medium coil size"
    return "natural mixed curl direction, medium coil size, strand separation"


def _infer_direction(blob: str) -> str:
    if "slick" in blob and "back" in blob:
        return "swept back from the hairline"
    if "pompadour" in blob or "quiff" in blob:
        return "lifted up and swept backward from the front"
    if "fringe" in blob or "crop" in blob or "caesar" in blob:
        return "forward and down from the crown"
    if "side part" in blob or "side-part" in blob or "comb over" in blob:
        return "parted to one side, swept across the top"
    if "mullet" in blob:
        return "shorter front and sides, longer flow toward the back"
    return "natural growth from the crown following scalp contour"


def _infer_fringe(blob: str) -> str:
    if "buzz" in blob or "high-and-tight" in blob:
        return "no fringe, hairline visible"
    if "fringe" in blob or "crop" in blob or "caesar" in blob or "bang" in blob:
        return "forward fringe over the forehead (anatomy underneath unchanged)"
    if ("slick" in blob and "back" in blob) or "pompadour" in blob:
        return "forehead open, hair pulled off the brow"
    return "match the selected style; do not add unsolicited forehead coverage"


def _infer_volume(blob: str) -> str:
    if "buzz" in blob:
        return "minimal, even scalp-following"
    if "pompadour" in blob or "quiff" in blob:
        return "elevated front volume, structured, within head width"
    if "flat" in blob:
        return "low to moderate"
    if "curly" in blob:
        return "moderate curly volume within original head proportions"
    return "moderate, salon-realistic"


def _infer_sides(blob: str, length: str) -> str:
    if "skin fade" in blob or "skin-fade" in blob:
        return "skin fade to bare skin, blended temples"
    if "fade" in blob or "taper" in blob or "undercut" in blob:
        return "gradually shorter toward the ear and nape"
    if "buzz" in blob:
        return "same clipper length as top"
    if length == "long":
        return "longer at sides or back per style silhouette"
    return "shorter than top, blended transition"


def _infer_silhouette(blob: str, length: str) -> str:
    if "pompadour" in blob:
        return "tall front ridge, tapered sides, backward sweep"
    if "undercut" in blob:
        return "sharp disconnect: very short sides, longer top"
    if "buzz" in blob:
        return "uniform short cap following skull"
    if "mullet" in blob:
        return "short front and sides, longer back"
    if length == "long":
        return "elongated outline past the jaw when the style calls for length"
    return "clean barber silhouette matching the catalog reference description"


# Hand-tuned locks for styles that caused the most inconsistent generations.
_OVERRIDE_LOCKS: dict[tuple[str, str], dict[str, str]] = {
    ("men", "buzz-cut"): {
        "hair_texture": "clipper-short",
        "curl_pattern": "no curls, scalp-visible stubble",
        "hair_direction": "even growth following the scalp, no styling direction",
        "fringe_type": "no fringe, natural hairline fully visible",
        "top_volume": "minimal and even, no extra height",
        "side_length": "same guard length as the top",
        "silhouette": "uniform military buzz, no wig cap",
        "defining_features": (
            "Uniform buzz cut: one even clipper length all over, realistic scalp texture, "
            "clean natural hairline, no top volume and no curls."
        ),
    },
    ("men", "crew-cut"): {
        "hair_texture": "short textured",
        "curl_pattern": "no defined curls",
        "hair_direction": "short upright texture on top, tapered shorter on sides",
        "fringe_type": "short front hair above brows, hairline visible",
        "top_volume": "slightly longer than sides, neat not tall",
        "side_length": "tapered shorter toward ears",
        "silhouette": "classic crew: short sides, marginally longer flat top",
        "defining_features": (
            "Crew cut: slightly longer neat top, tapered short sides, military-clean edges, "
            "no pompadour height."
        ),
    },
    ("men", "textured-crop"): {
        "hair_texture": "textured matte",
        "curl_pattern": "no ringlet curls unless the user already has them",
        "hair_direction": "forward messy texture from the crown",
        "fringe_type": "short forward fringe touching the upper forehead",
        "top_volume": "light textured volume within head width",
        "side_length": "faded or cropped shorter sides",
        "silhouette": "short crop with forward fringe block",
        "defining_features": (
            "Textured crop: faded sides, choppy forward fringe, matte separated strands, "
            "not a plastic helmet."
        ),
    },
    ("men", "curly-fringe"): {
        "hair_texture": "curly",
        "curl_pattern": "forward curls over the forehead, medium coils, separated",
        "hair_direction": "curls fall forward from the crown",
        "fringe_type": "thick curly fringe above the brows (forehead underneath fixed)",
        "top_volume": "moderate curly volume, not wider than the head",
        "side_length": "shorter tapered sides keeping some curl length",
        "silhouette": "rounded curly top with forward fringe",
        "defining_features": (
            "Curly fringe: natural forward curl direction, controlled forehead coverage only, "
            "no random spirals stacked above the hairline, matte sea-salt finish."
        ),
    },
    ("men", "curly-slick-back"): {
        "hair_texture": "curly sleek",
        "curl_pattern": "curls directed backward, medium coil size",
        "hair_direction": "combed back off the forehead",
        "fringe_type": "forehead open; do not drop random forward curls",
        "top_volume": "moderate length on top showing curl texture",
        "side_length": "shorter but long enough to comb back with the top",
        "silhouette": "gentleman slick-back curl profile",
        "defining_features": (
            "Curly slick back: all curls pushed backward, light pomade shine, "
            "no forehead-covering ringlets unless already present in the user photo."
        ),
    },
    ("men", "pompadour"): {
        "hair_texture": "smooth with structure",
        "curl_pattern": "straight or soft wave only, no tight coils",
        "hair_direction": "swept up and back from the front hairline",
        "fringe_type": "front lifted, not hanging over the brow",
        "top_volume": "high front volume swept backward, within skull width",
        "side_length": "faded or tapered shorter sides",
        "silhouette": "signature tall front ridge, clean fade, backward flow",
        "defining_features": (
            "Pompadour: elevated front volume, hair swept up then back, structured silhouette, "
            "faded sides — not a curly mop."
        ),
    },
    ("men", "undercut"): {
        "hair_texture": "contrast: long top, very short sides",
        "curl_pattern": "match user hair; do not invent curls on a straight top",
        "hair_direction": "top swept back or to the side per catalog length",
        "fringe_type": "depends on top styling; do not lower the hairline",
        "top_volume": "longer disconnected top with clear weight",
        "side_length": "very short undercut sides with hard disconnect",
        "silhouette": "sharp undercut wedge: bald-short sides, dominant top",
        "defining_features": (
            "Undercut: dramatic disconnect short sides versus longer top, "
            "no blending that erases the undercut line."
        ),
    },
    ("men", "mid-fade"): {
        "hair_texture": "short textured top",
        "curl_pattern": "no exaggerated curls",
        "hair_direction": "natural top styling, faded temples",
        "fringe_type": "short front if any; keep hairline",
        "top_volume": "moderate short top",
        "side_length": "mid fade blend mid-ear height",
        "silhouette": "tapered sides rising to textured top",
        "defining_features": "Mid fade: fade line mid-ear, clean taper, neat short textured top.",
    },
    ("men", "low-fade"): {
        "hair_texture": "short neat top",
        "curl_pattern": "no exaggerated curls",
        "hair_direction": "natural short styling",
        "fringe_type": "hairline visible unless style has short fringe",
        "top_volume": "low to moderate",
        "side_length": "low fade starting near the temple",
        "silhouette": "subtle gradual taper to short top",
        "defining_features": "Low fade: gentle temple taper, professional short top.",
    },
    ("men", "skin-fade"): {
        "hair_texture": "very short top",
        "curl_pattern": "no curls unless user has them",
        "hair_direction": "minimal styling on short top",
        "fringe_type": "crisp line-up, hairline visible",
        "top_volume": "minimal",
        "side_length": "skin fade to bare skin",
        "silhouette": "sharp zero fade with very short top",
        "defining_features": "Skin fade: zero fade sides, very short top, sharp lineup.",
    },
    ("men", "side-part"): {
        "hair_texture": "neat combed",
        "curl_pattern": "no spiral curls",
        "hair_direction": "parted to one side, swept across",
        "fringe_type": "side-swept front, no heavy forward bangs",
        "top_volume": "low professional volume",
        "side_length": "tapered neat sides",
        "silhouette": "classic professional side part",
        "defining_features": "Side part: visible part line, neat tapered sides, combed professional top.",
    },
}


def _row_for(audience: str, slug: str) -> dict[str, Any] | None:
    return _CATALOG_BY_KEY.get((audience, slug))


def resolve_style_lock(*, audience: str, slug: str, title: str = "") -> StyleLock:
    """Return a style lock for the catalog slug, using overrides when defined."""
    aud = (audience or "men").strip().lower()
    key = slug.strip()
    row = _row_for(aud, key) or {}
    detail = style_detail_for(aud, key)
    if aud == "women" and key in WOMEN_STYLE_PROMPTS:
        detail = WOMEN_STYLE_PROMPTS[key]
    blob = _tag_blob(row, detail)
    length = str(row.get("hair_length") or "medium")
    texture = _infer_texture(blob, length)
    override = _OVERRIDE_LOCKS.get((aud, key), {})

    style_id = str(row.get("style_id") or f"{aud}-{key}")
    style_name = title.strip() or str(row.get("title") or key.replace("-", " ").title())
    ref_image = str(row.get("image_path") or "")

    return StyleLock(
        style_id=style_id,
        style_name=style_name,
        reference_image=ref_image,
        hair_length=length,
        hair_texture=override.get("hair_texture", texture),
        curl_pattern=override.get("curl_pattern", _infer_curl_pattern(blob, texture)),
        hair_direction=override.get("hair_direction", _infer_direction(blob)),
        fringe_type=override.get("fringe_type", _infer_fringe(blob)),
        top_volume=override.get("top_volume", _infer_volume(blob)),
        side_length=override.get("side_length", _infer_sides(blob, length)),
        silhouette=override.get("silhouette", _infer_silhouette(blob, length)),
        defining_features=override.get("defining_features", detail),
    )


def format_style_lock(lock: StyleLock, *, catalog_attached: bool = False) -> str:
    """Layer B: selected hairstyle specification."""
    lines = [
        "SELECTED HAIRSTYLE LOCK (layer B):",
        f'Style: "{lock.style_name}" ({lock.style_id}).',
        f"Hair length: {lock.hair_length}.",
        f"Texture: {lock.hair_texture}.",
        f"Curl pattern: {lock.curl_pattern}.",
        f"Direction: {lock.hair_direction}.",
        f"Fringe: {lock.fringe_type}.",
        f"Top volume: {lock.top_volume}.",
        f"Sides/back: {lock.side_length}.",
        f"Silhouette: {lock.silhouette}.",
        "Defining features:",
        lock.defining_features,
        (
            "Apply this exact haircut design to the person in reference image 1. "
            "Adapt length to their head; do not change face or forehead anatomy. "
            "Do not substitute a different hairstyle."
        ),
    ]
    if lock.reference_image:
        if catalog_attached:
            ref_line = (
                f"Catalog reference image 2 path: {lock.reference_image} "
                "(hairstyle silhouette only — do not copy this person's face)."
            )
        else:
            ref_line = (
                f"Catalog reference image (structure only, not attached as a model face): "
                f"{lock.reference_image}."
            )
        lines.insert(2, ref_line)
    return "\n".join(lines)
