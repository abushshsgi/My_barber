"""Explore soch rasmlari — har yosh guruhi va uslub uchun AI promptlar."""

from __future__ import annotations

# ── Explore erkak personajlari (5 ta — foydalanuvchi tasdiqlagan promptlar) ──
EXPLORE_MEN_PERSONAS: dict[str, dict[str, str]] = {
    "britan": {
        "label": "Britan",
        "code": "EU-3",
        "description": (
            "young British European man age 24, fair skin with light freckles, green-hazel eyes, "
            "sandy brown hair, neutral short textured cut, clean-shaven"
        ),
    },
    "irland": {
        "label": "Irland",
        "code": "EU-8",
        "description": (
            "young Irish European man age 24, fair skin with warm undertone, light green eyes, "
            "reddish-brown hair, neutral short textured cut, light ginger stubble"
        ),
    },
    "slavyan": {
        "label": "Slavyan",
        "code": "EU-6",
        "description": (
            "young Eastern European man age 26, pale Slavic skin, gray-green eyes, "
            "straight dark ash-brown hair, neutral short cut, clean-shaven, defined Slavic jawline"
        ),
    },
    "evro": {
        "label": "Evro",
        "code": "EU-2",
        "description": (
            "young Caucasian European man age 24, fair skin, light brown eyes, "
            "defined jawline with light stubble, thick dark brown wavy hair, neutral short length"
        ),
    },
    "fransuz": {
        "label": "Fransuz",
        "code": "EU-4",
        "description": (
            "young French European man age 27, light skin, dark brown eyes, refined features, "
            "light designer stubble, dark brown hair with natural wave, neutral short sides"
        ),
    },
}

PERSONA_REFERENCE_PROMPTS: dict[str, str] = {
    "britan": """
Professional barber studio portrait, young British European man age 24,
fair skin with light freckles, green-hazel eyes, sandy brown hair,
neutral short textured cut, clean-shaven,

three-quarter view, subtle natural smile suppressed, candid barber moment,
plain white t-shirt, solid flat #E8E8E8 background, bright soft lighting,
ultra sharp photorealistic, 3:4 vertical, 768x1024
""".strip(),
    "irland": """
Professional barber studio portrait, young Irish European man age 24,
fair skin with warm undertone, light green eyes, reddish-brown hair,
neutral short textured cut, light ginger stubble,

three-quarter angle, friendly neutral expression, natural candid pose,
plain white t-shirt, solid flat #E8E8E8, soft studio light,
photorealistic, sharp hair texture, 3:4 vertical, 768x1024
""".strip(),
    "slavyan": """
Professional barber studio portrait, young Eastern European man age 26,
pale Slavic skin, gray-green eyes, straight dark ash-brown hair,
neutral short cut, clean-shaven, defined Slavic jawline,

three-quarter profile looking slightly away, neutral expression,
plain white t-shirt, solid flat #E8E8E8, even studio light,
photorealistic, 85mm portrait, 3:4 vertical, 768x1024
""".strip(),
    "evro": """
Professional barber studio portrait, young man age 24, Caucasian European,
fair skin, light brown eyes, defined jawline with light stubble,
thick dark brown wavy hair, neutral short length, natural texture,

three-quarter profile, head turned slightly right, looking off-camera,
relaxed candid expression, NOT front-facing passport pose,

plain white crew-neck t-shirt,
solid flat background #E8E8E8, soft studio lighting,
ultra sharp photorealistic, 85mm portrait, 8K detail,
3:4 vertical, 768x1024
""".strip(),
    "fransuz": """
Professional barber studio portrait, young French European man age 27,
light skin, dark brown eyes, refined features, light designer stubble,
dark brown hair with natural wave, neutral short sides,

three-quarter profile right, elegant relaxed posture, NOT passport pose,
plain white crew-neck, solid flat #E8E8E8, soft diffused studio light,
photorealistic barber catalog, 3:4 vertical, 768x1024
""".strip(),
}

DEFAULT_MEN_PERSONA_ID = "evro"
SELECTED_MEN_PERSONA_ID = DEFAULT_MEN_PERSONA_ID
SELECTED_MEN_PERSONA_LABEL = "Evro"
SELECTED_MEN_AGE_GROUP = "young"

FRANSUZ_PERSONA = EXPLORE_MEN_PERSONAS["fransuz"]["description"]
FRANSUZ_REFERENCE_PROMPT = PERSONA_REFERENCE_PROMPTS["fransuz"]


def _normalize_persona_id(persona_id: str | None) -> str:
    if persona_id == "skandinav":
        return "evro"
    if persona_id and persona_id in EXPLORE_MEN_PERSONAS:
        return persona_id
    return DEFAULT_MEN_PERSONA_ID


def persona_reference_prompt(*, persona_id: str) -> str:
    return PERSONA_REFERENCE_PROMPTS[_normalize_persona_id(persona_id)]


def persona_style_context(*, persona_id: str) -> str:
    pid = _normalize_persona_id(persona_id)
    persona = EXPLORE_MEN_PERSONAS[pid]
    ref_path = f"men/personas/{pid}/reference.webp"
    return f"""
Same exact person as reference "{persona['label']}" — identical {persona['description']},
identical face, skin tone, eyes, expression, pose, white crew-neck t-shirt,
identical #E8E8E8 flat background and soft studio lighting.
ONLY the hairstyle changes. Use Character Reference from {ref_path}.
Midjourney: --cref [reference-url] --cw 100 --ar 3:4 --style raw
""".strip()


def persona_output_path(*, persona_id: str, slug: str) -> str:
    return f"men/personas/{_normalize_persona_id(persona_id)}/{slug}.webp"


def persona_ref_path(*, persona_id: str) -> str:
    return f"men/personas/{_normalize_persona_id(persona_id)}/reference.webp"

STYLE_NEGATIVE_PROMPT = (
    "different person, changed face, changed age, changed skin tone, "
    "passport photo, ID photo, mugshot, stiff front-facing, "
    "cartoon, anime, watermark, text, logo, busy background, gradient, vignette, "
    "deformed face, multiple people"
)

# Eski rejim: har rasm alohida odam (ayollar va boshqa yosh guruhlari uchun).
EXPLORE_GENERATION_CONTEXT = """
ROLE: Explore katalogi uchun professional salon/barber studiya rasmlari generatsiya qiluvchi AI.

QOIDALAR (majburiy):
1. HAR BIR RASM — BOSHQA ERKAK. Bir xil yuz, bir xil odam, Character Reference ishlatma.
2. Milliyat/mamlakat ko‘rsatma — tabiiy xilma-xil yuzlar (yevropalik, afro, osiyolik, yevrosiyo va h.k.).
3. POZA tabiiy bo‘lsin — salon kreslosidan yangi chiqqandek, yengil 3/4 burchak (10–20°),
   qattiq to‘g‘ri old tomondan passport/ID suratiga o‘xshamasin.
4. Stok foto, oldindan tayyorlangan katalog, manken/plastik ifoda bo‘lmasin —
   jonli, real odam, salondan chiqqan tabiiy lahza.
5. Fon DOIM bir xil: solid flat #E8E8E8, gradient/vignette yo‘q.
6. Maket bir xil: bosh + yelkalar, 3:4 vertical, yumshoq studiya yorug‘ligi.
7. Faqat soch uslubi va model (yuz) har safar yangi — fon va kadrlash uslubi bir xil qoladi.
""".strip()

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

# Har bir uslub uchun turli personaj — generatsiya vaqtida slug bo‘yicha tanlanadi.
MEN_PERSONA_HINTS: tuple[str, ...] = (
    "Mediterranean man, olive skin, dark wavy hair texture",
    "Black man, deep brown skin, tight curl hair texture",
    "East Asian man, light skin, straight thick hair",
    "Scandinavian man, fair skin, light brown hair",
    "Middle Eastern man, tan skin, thick dark hair",
    "Latino man, warm tan skin, dark brown eyes",
    "South Asian man, brown skin, black hair",
    "Mixed-race man, ambiguous features, natural skin tone",
    "Eastern European man, pale skin, ash brown hair",
    "African-European mixed man, medium brown skin",
    "Caucasian man, freckled fair skin, auburn undertones",
    "Pacific Islander man, tan skin, coarse dark hair",
)

WOMEN_PERSONA_HINTS: tuple[str, ...] = (
    "Mediterranean woman, olive skin, dark wavy hair",
    "Black woman, deep brown skin, natural curl pattern",
    "East Asian woman, light skin, straight silky hair",
    "Scandinavian woman, fair skin, light blonde-brown hair",
    "Middle Eastern woman, tan skin, thick dark hair",
    "Latino woman, warm tan skin, soft features",
    "South Asian woman, brown skin, long black hair",
    "Mixed-race woman, ambiguous features, natural glow",
)

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

NATURAL_POSE_BLOCK = (
    "natural relaxed posture, slight three-quarter angle about 15 degrees, "
    "candid fresh-from-barber moment, organic shoulders, alive expression, "
    "NOT passport photo, NOT mugshot, NOT stiff front-facing ID picture, "
    "NOT stock catalog mannequin pose"
)

NEGATIVE_PROMPT = (
    "same person as another image, identical face, character reference, clone face, "
    "passport photo, ID photo, mugshot, visa photo, driver's license photo, "
    "stiff front-facing, perfectly symmetrical passport pose, dead center stare, "
    "stock photo, pre-shot catalog, mannequin, plastic skin, fake smile, "
    "cartoon, anime, illustration, watermark, text, logo, busy background, "
    "barber shop interior, mirror, side profile only, sunglasses, hat, jewelry, "
    "dramatic lighting, colored background, gradient, vignette, deformed face, multiple people"
)


def _persona_hint(*, audience: str, slug: str) -> str:
    hints = WOMEN_PERSONA_HINTS if audience == "women" else MEN_PERSONA_HINTS
    idx = sum(ord(c) for c in slug) % len(hints)
    return hints[idx]


def reference_prompt(
    *,
    audience: str,
    age_group: str,
    slug: str = "_reference",
    persona_id: str | None = None,
) -> str:
    if audience == "men" and age_group == SELECTED_MEN_AGE_GROUP:
        pid = _normalize_persona_id(persona_id)
        return persona_reference_prompt(persona_id=pid)

    age_map = WOMEN_AGE_DESCRIPTIONS if audience == "women" else AGE_GROUP_DESCRIPTIONS
    age_desc = age_map[age_group]
    persona = _persona_hint(audience=audience, slug=slug)
    hair = "neutral medium length hair" if audience == "women" else "neutral short hair"
    return (
        f"{EXPLORE_GENERATION_CONTEXT}\n\n"
        f"Generate ONE standalone portrait. Model: {age_desc}, {persona}. "
        f"Background: solid flat #E8E8E8 only. {NATURAL_POSE_BLOCK}. "
        f"{hair}, soft even studio lighting, photorealistic, ultra sharp hair and skin detail, "
        f"plain dark t-shirt, 3:4 vertical, salon photography. "
        f"This is a UNIQUE person — not the same model as any other catalog image."
    )


def style_prompt(
    *,
    audience: str,
    age_group: str,
    slug: str,
    persona_id: str | None = None,
) -> str:
    style_map = WOMEN_STYLE_PROMPTS if audience == "women" else MEN_STYLE_PROMPTS
    style_detail = style_map[slug]

    if audience == "men" and age_group == SELECTED_MEN_AGE_GROUP:
        pid = _normalize_persona_id(persona_id)
        return (
            f"{persona_style_context(persona_id=pid)}\n\n"
            f"Hairstyle: {style_detail}. "
            f"Professional fresh barber finish, ultra sharp hair detail, photorealistic, 3:4 vertical."
        )

    age_map = WOMEN_AGE_DESCRIPTIONS if audience == "women" else AGE_GROUP_DESCRIPTIONS
    age_desc = age_map[age_group]
    persona = _persona_hint(audience=audience, slug=slug)
    return (
        f"{EXPLORE_GENERATION_CONTEXT}\n\n"
        f"Generate ONE standalone portrait. NEW different person: {age_desc}, {persona}. "
        f"Hairstyle: {style_detail}. Background: solid flat #E8E8E8. {NATURAL_POSE_BLOCK}. "
        f"Plain dark t-shirt, soft even studio lighting, photorealistic, ultra sharp hair detail, "
        f"professional fresh barber/salon finish, 3:4 vertical. "
        f"Do NOT reuse face from any other image — this model must look like a different man."
    )


def output_path(*, audience: str, age_group: str, slug: str, persona_id: str | None = None) -> str:
    if audience == "men" and age_group == SELECTED_MEN_AGE_GROUP and persona_id:
        return persona_output_path(persona_id=persona_id, slug=slug)
    if age_group == "young":
        return f"{audience}/{slug}.webp"
    return f"{audience}/{age_group}/{slug}.webp"
