"""Try-on prompt sections for FLUX.2 [klein] 9B KV (runware:400@6).

positivePrompt max is 10000 characters. negativePrompt max is 3000.
These are guidance strings. They do not guarantee exact identity preservation.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

POSITIVE_PROMPT_MAX = 10000
NEGATIVE_PROMPT_MAX = 3000

IDENTITY_PRESERVATION_PROMPT = """\
CRITICAL IDENTITY PRESERVATION INSTRUCTIONS:

The uploaded user photograph is the primary and authoritative
identity reference.

The final generated image must represent the same individual
shown in the original uploaded photograph.

Preserve the person's original facial identity as accurately
as the image editing model allows.

Maintain the exact visual appearance of the original face.

Preserve the original forehead shape, forehead proportions,
eye shape, eye size, eye spacing, eyelid structure,
eyebrow shape, eyebrow density, eyebrow position,
nose bridge, nose tip, nostril shape,
mouth shape, lip thickness, lip proportions,
cheek shape, cheekbone structure,
jawline, chin, ears and overall facial geometry.

Preserve the original natural facial symmetry and asymmetry.

Preserve the person's original skin tone,
natural skin texture, freckles, moles,
visible pores and distinguishing facial details.

Preserve the person's original apparent age.

Preserve the original facial expression,
gaze direction, head rotation, head tilt,
camera perspective and face orientation.

Do not generate a new face.

Do not reconstruct or reinterpret the face.

Do not perform a face swap.

Do not copy the face of the hairstyle catalog model.

Do not apply beauty filters.

Do not reshape facial features.

Do not enlarge eyes.

Do not narrow the nose.

Do not alter the jawline.

Do not modify lip shape.

Do not smooth or artificially enhance the skin.

Do not change the person's identity.

Treat the original face as a protected visual region.

The requested transformation applies to the hairstyle only.
"""

ANATOMY_ANCHOR_PROMPT = """\
FOREHEAD, HAIRLINE, AND HEAD ANATOMY:

The original forehead height, forehead width, and forehead shape are fixed.
The original hairline position is fixed.
The original temples and side hairline boundaries are fixed.
The original skull size and head proportions are fixed.

Do not enlarge, shrink, or reconstruct the forehead.
Do not move the hairline forward or backward.
Do not lower the hairline to make the hair look fuller.
Do not invent follicles outside the natural growth boundary.
Do not stretch the face or widen the head to fit the hairstyle.

Adapt the hairstyle to this head.
Hair must grow from the existing scalp and transition from the original hairline.
Keep the original forehead visible unless the selected style explicitly has a fringe.
A fringe may lay natural strands over the forehead without changing the forehead underneath.
"""

CURLY_STYLE_PROMPT = """\
CURLY HAIRSTYLE:

Distribute curls naturally along the scalp.
Use believable curl size and mixed curl direction.
Keep visible separation between curls.
Follow the scalp curve and the existing growth direction.
Keep volume inside the original head proportions.

Do not stack tight spirals or oversized circles above the forehead.
Do not build a wig cap, a floating curl mass, or extra density at the frontal hairline.
"""

STRAIGHT_STYLE_PROMPT = """\
STRAIGHT HAIRSTYLE:

Keep a natural fall and individual strand texture.
Align the hair with the original hairline.
Do not turn the hair into a flat plastic sheet.
Do not move the hairline to create a sharper edge.
"""

FADE_STYLE_PROMPT = """\
FADE HAIRSTYLE:

Blend the temples into the original side hairline.
Keep the fade depth consistent from the temple toward the ear.
Do not paint a new hairline or fill the forehead.
Do not change the head width to make the fade sharper.
"""

SLICK_STYLE_PROMPT = """\
SLICKED HAIRSTYLE:

Direct the hair backward from the original hairline.
Keep realistic scalp visibility where the style is combed close.
Do not push the hairline back and do not enlarge the forehead.
Do not add a shiny helmet of hair.
"""

ORIGINAL_HAIR_COLOR_PROMPT = """\
CRITICAL ORIGINAL HAIR COLOR PRESERVATION:

The user's uploaded photograph is the only authoritative
reference for the user's existing hair color.

Preserve the user's original hair pigmentation.

Preserve the original base hair color.

Preserve the original hair root color.

Preserve the original hair undertones.

Preserve natural hair color variations.

Preserve existing natural highlights and lowlights.

Maintain the original hair color distribution
as naturally as possible after the hairstyle transformation.

Do not transfer the hair color from the hairstyle catalog image.

The catalog image provides hairstyle structure only.

Do not introduce a different hair color.

Do not apply artificial hair dye.

Do not introduce blonde highlights.

Do not introduce bleaching.

Do not introduce ombre.

Do not introduce balayage.

Do not introduce unwanted red, brown, black,
blonde, gray or fantasy color transformations.

Do not change the user's hair pigmentation.

Natural brightness variation caused by lighting
and hairstyle geometry is acceptable.

The resulting hairstyle must retain the original
user's recognizable hair color.

Only the hairstyle geometry and styling should change.
"""

HAIRSTYLE_TRANSFORMATION_PROMPT = """\
PROFESSIONAL HAIRSTYLE TRANSFORMATION:

Transform only the person's existing hairstyle into
the selected hairstyle from the MySaloon catalog.

The selected hairstyle must be reproduced with high
structural accuracy while adapting naturally to
the original person's head and facial geometry.

Match the selected hairstyle's overall silhouette.

Match the intended hair length.

Match the haircut's layer structure.

Match the intended hair volume.

Match the hairstyle's fringe and bangs.

Match the parting direction.

Match the curl pattern when applicable.

Match the wave structure when applicable.

Match the shape of the hair ends.

Match the intended crown volume.

Match the face-framing hair layers.

Maintain natural hair growth direction.

Maintain realistic hair root placement.

Maintain a believable natural hairline.

Maintain realistic individual hair strands.

Maintain physically plausible hair density.

Maintain natural strand overlap.

Maintain realistic hair movement and gravity.

Avoid unrealistic hair volume.

Avoid wig-like hair structure.

Avoid artificial or synthetic-looking hair.

Do not modify the person's facial anatomy.

Do not change the person's hair pigmentation
unless explicitly requested.

The hairstyle must look like it was created
by a professional hairstylist in a real salon.

The final result must remain photographic,
natural, detailed and believable.
"""

PHOTOREALISM_PROMPT = """\
ULTRA-REALISTIC PHOTOGRAPHIC QUALITY:

Produce an authentic high-resolution photograph.

Preserve realistic skin texture.

Preserve natural facial details.

Preserve original lighting direction.

Preserve original shadow softness.

Preserve natural contrast.

Preserve realistic color balance.

Maintain consistent camera perspective.

Generate detailed human hair strands.

Maintain realistic hair fiber texture.

Maintain natural hair shine without excessive gloss.

Maintain believable hair shadows.

Maintain realistic hair density and strand separation.

Maintain physically plausible hair overlap.

Avoid artificial digital beauty effects.

Avoid cartoon-like details.

Avoid CGI appearance.

Avoid overly smooth hair.

Avoid plastic-looking skin.

Avoid unnatural sharpness.

Avoid excessive contrast.

Avoid artificial HDR effects.

Avoid synthetic salon-render appearance.

The final image should resemble an authentic
professional salon photograph of the same person.
"""

BACKGROUND_PRESERVATION_PROMPT = """\
ORIGINAL PHOTOGRAPH PRESERVATION:

Keep the original background unchanged.

Preserve the original environment.

Preserve the original clothing.

Preserve clothing color, texture and structure.

Preserve visible accessories.

Preserve body position.

Preserve shoulder position.

Preserve camera perspective.

Preserve original lighting.

Preserve original shadow direction.

Preserve original image color balance.

Do not introduce new objects.

Do not remove existing objects.

Do not modify the user's outfit.

Do not change the user's body.

Do not change the original scene composition.

Only the hairstyle is authorized to change.

Any unavoidable surrounding changes should
be minimized and remain visually consistent.
"""

# Official inputs.referenceImages is a list of images with no per-image role.
# Use this text only when a second catalog photograph is actually attached.
REFERENCE_IMAGE_PROMPT = """\
REFERENCE IMAGE INTERPRETATION:

The first identity reference is the uploaded user photograph.

The hairstyle catalog image is a hairstyle reference only.

Use the user photograph for:

Facial identity.
Face shape.
Skin tone.
Facial proportions.
Expression.
Head position.
Original hair color.
Clothing.
Background.
Lighting.

Use the hairstyle catalog image only for:

Haircut silhouette.
Hair length.
Hair layering.
Hair volume.
Hair parting.
Bangs.
Fringe.
Curl pattern.
Wave structure.
Hair styling details.

Do not transfer the catalog model's face.

Do not transfer the catalog model's skin tone.

Do not transfer the catalog model's clothing.

Do not transfer the catalog model's background.

Do not transfer the catalog model's hair color.

Do not recreate the catalog model.

Apply only the hairstyle design to the original user.

The generated image must remain recognizable
as the original uploaded person.
"""

# Production path: one image. Do not tell the model a catalog face is present.
SELFIE_REFERENCE_PROMPT = """\
REFERENCE IMAGE INTERPRETATION:

Reference image 1 is the uploaded user photograph.
It is the only image in this request.

Use reference image 1 for facial identity, face shape, skin tone,
facial proportions, expression, head position, original hair color,
clothing, background, and lighting.

The selected hairstyle structure comes from the written catalog
description in this prompt. No second photograph is attached.

Do not invent another person.
Do not copy a catalog model's face, skin tone, clothing, background, or hair color.
Apply only the described hairstyle to the person in reference image 1.
The generated image must remain recognizable as the original uploaded person.
"""

STYLE_COLOR_PROMPT = """\
SELECTED HAIRSTYLE COLOR TREATMENT:

The selected MySaloon hairstyle explicitly includes a color treatment.
Follow only the color treatment written in the selected hairstyle description.
Do not keep the original hair color where it conflicts with that selected treatment.
Do not copy a hair color from a catalog model's photograph.
Do not add a further dye, bleach, highlight, ombre, or balayage beyond the selected hairstyle.
"""

NEGATIVE_PROMPT = """\
different person, identity replacement, face swap, face regeneration, reconstructed face, altered identity, changed face shape, modified facial proportions, distorted forehead, changed eye shape, changed eye size, changed eye spacing, modified eyelids, changed eyebrows, different nose, altered nose bridge, modified nostrils, changed lips, altered mouth, different cheekbones, modified jawline, different chin, distorted ears, changed facial symmetry, changed skin tone, artificial skin, plastic skin, skin smoothing, face retouching, beauty filter, facial enhancement, excessive makeup, changed expression, different gaze, altered head position, changed apparent age, unwanted hair recoloring, changed original hair color, incorrect hair pigmentation, unwanted highlights, unwanted bleaching, unwanted ombre, artificial wig, fake hairline, unnatural roots, synthetic hair, plastic hair, unrealistic hair texture, repeated hair patterns, malformed curls, distorted bangs, floating hair, unrealistic hair density, blurry face, distorted anatomy, enlarged forehead, lowered hairline, moved hairline, stretched head, widened skull, stacked curls, oversized ringlets, wig cap, extra hair volume above the forehead, changed clothing, different background, modified lighting, incorrect shadows, cartoon, illustration, CGI, 3D render, oversharpening, oversmoothing, low-resolution artifacts, compression artifacts
"""

_RECOLOR_MARKERS = (
    "balayage",
    "highlight",
    "blonde",
    "platinum",
    "bleach",
    "dye",
    "color",
    "rang",
    "sariq",
    "qora soch",
)


def style_requests_recolor(title: str, style_detail: str) -> bool:
    blob = f"{title} {style_detail}".lower()
    return any(marker in blob for marker in _RECOLOR_MARKERS)


def build_selected_hair_color_prompt(selected_hair_color: str) -> str:
    color = " ".join(str(selected_hair_color or "").split())
    color = color[:80]
    return (
        "EXPLICIT HAIR COLOR REQUEST:\n\n"
        f'The user explicitly requested this hair color: "{color}".\n'
        "Apply that requested color to the hair only.\n"
        "Do not add highlights, bleaching, ombre, or balayage unless they are part of this request.\n"
        "Do not describe or replace the user's original color with a guessed color.\n"
        "Keep the original face, skin tone, expression, clothing, and background."
    )


_CURLY_MARKERS = ("curl", "coil", "ringlet", "jingalak", "wavy", "wave")
_STRAIGHT_MARKERS = ("straight", "silk", "blunt")
_FADE_MARKERS = ("fade", "taper", "undercut")
_SLICK_MARKERS = ("slick", "slicked", "pompadour")


def style_guidance(title: str, style_detail: str) -> str:
    """Style-specific limits. Anatomy rules stay in effect for every style."""
    blob = f"{title} {style_detail}".lower()
    sections: list[str] = []
    if any(marker in blob for marker in _CURLY_MARKERS):
        sections.append(CURLY_STYLE_PROMPT.strip())
    if any(marker in blob for marker in _SLICK_MARKERS):
        sections.append(SLICK_STYLE_PROMPT.strip())
    elif any(marker in blob for marker in _STRAIGHT_MARKERS):
        sections.append(STRAIGHT_STYLE_PROMPT.strip())
    if any(marker in blob for marker in _FADE_MARKERS):
        sections.append(FADE_STYLE_PROMPT.strip())
    return "\n\n".join(sections)


def _primary_task(title: str) -> str:
    safe_title = " ".join(str(title or "").split())[:160]
    return (
        "PRIMARY TASK:\n\n"
        "Edit the uploaded user photograph in place.\n"
        "The uploaded photograph is the primary and authoritative identity reference.\n"
        f'Selected MySaloon hairstyle: "{safe_title}".\n'
        "Change only the hairstyle."
    )


def _assemble(sections: list[tuple[str, str, bool]], *, limit: int) -> str:
    items = [(name, text.strip(), droppable) for name, text, droppable in sections if text and text.strip()]
    while True:
        rendered = "\n\n".join(text for _, text, _droppable in items)
        if len(rendered) <= limit:
            return rendered
        drop_at = next((index for index in range(len(items) - 1, -1, -1) if items[index][2]), None)
        if drop_at is None:
            logger.warning(
                "Try-on prompt remains over the model limit after required sections length=%s limit=%s",
                len(rendered),
                limit,
            )
            return rendered
        name, _text, _droppable = items.pop(drop_at)
        logger.warning(
            "Try-on prompt section omitted to stay within limit section=%s limit=%s",
            name,
            limit,
        )


def build_tryon_prompt(
    *,
    title: str,
    style_detail: str,
    selected_hair_color: str | None = None,
    include_catalog_image: bool = False,
) -> str:
    """Assemble the edit prompt. Contradictory color instructions are not combined."""
    explicit = " ".join(str(selected_hair_color or "").split())
    if explicit:
        color_section = build_selected_hair_color_prompt(explicit)
    elif style_requests_recolor(title, style_detail):
        color_section = STYLE_COLOR_PROMPT
    else:
        color_section = ORIGINAL_HAIR_COLOR_PROMPT

    catalog = f'Selected hairstyle structure: "{title}". {style_detail}'.strip()
    reference = REFERENCE_IMAGE_PROMPT if include_catalog_image else SELFIE_REFERENCE_PROMPT
    sections = [
        ("primary", _primary_task(title), False),
        ("identity", IDENTITY_PRESERVATION_PROMPT, False),
        ("anatomy", ANATOMY_ANCHOR_PROMPT, False),
        ("hairstyle", HAIRSTYLE_TRANSFORMATION_PROMPT, False),
        ("style", style_guidance(title, style_detail), False),
        ("catalog", catalog, False),
        ("color", color_section, False),
        ("reference", reference, True),
        ("photorealism", PHOTOREALISM_PROMPT, True),
        ("background", BACKGROUND_PRESERVATION_PROMPT, True),
    ]
    return _assemble(sections, limit=POSITIVE_PROMPT_MAX)
