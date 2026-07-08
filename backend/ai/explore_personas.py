"""Explore erkak personajlari — 4 ta model, har biri uchun bitta reference + 12 uslub."""

from __future__ import annotations

EXPLORE_PERSONA_IDS = frozenset({"britan", "irland", "slavyan", "evro", "niki"})

# Har bir personaj — bitta three-quarter reference (foydalanuvchi tasdiqlagan promptlar).
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
    "niki": """
Professional barber studio portrait, young European man age 25,
fair skin with light freckles, green-hazel eyes, light sandy-brown wavy hair,
neutral short textured cut, defined jawline, light stubble,

three-quarter view, head turned slightly toward camera, subtle natural smile,
relaxed candid barber moment, NOT front-facing passport pose,

plain white crew-neck t-shirt,
solid flat #E8E8E8 background, soft studio lighting,
ultra sharp photorealistic, 85mm portrait, 8K detail,
3:4 vertical, 768x1024
""".strip(),
}

EXPLORE_PERSONAS: dict[str, dict] = {
    "britan": {
        "id": "britan",
        "label": "Britan",
        "code": "EU-3",
        "description": (
            "young British European man age 24, fair skin with light freckles, "
            "green-hazel eyes, sandy brown hair, neutral short textured cut, clean-shaven"
        ),
    },
    "irland": {
        "id": "irland",
        "label": "Irland",
        "code": "EU-8",
        "description": (
            "young Irish European man age 24, fair skin with warm undertone, light green eyes, "
            "reddish-brown hair, neutral short textured cut, light ginger stubble"
        ),
    },
    "slavyan": {
        "id": "slavyan",
        "label": "Slavyan",
        "code": "EU-6",
        "description": (
            "young Eastern European man age 26, pale Slavic skin, gray-green eyes, "
            "straight dark ash-brown hair, neutral short cut, clean-shaven, defined Slavic jawline"
        ),
    },
    "evro": {
        "id": "evro",
        "label": "Evro",
        "code": "EU-2",
        "description": (
            "young Caucasian European man age 24, fair skin, light brown eyes, "
            "defined jawline with light stubble, thick dark brown wavy hair, neutral short length"
        ),
    },
    "niki": {
        "id": "niki",
        "label": "Niki",
        "code": "EU-9",
        "description": (
            "young European man age 25, fair skin with light freckles, green-hazel eyes, "
            "light sandy-brown wavy hair, neutral short textured cut, defined jawline, light stubble"
        ),
    },
}

DEFAULT_MEN_PERSONA = "evro"

MEN_CATALOG_STYLE_SLUGS = frozenset(
    {
        "mid-fade",
        "low-fade",
        "skin-fade",
        "buzz-cut",
        "textured-crop",
        "pompadour",
        "undercut",
        "side-part",
        "french-crop",
        "slick-back",
        "curly-top-fade",
        "modern-mullet",
    }
)

# Generatsiya qilingan assetlar — persona papkasida bo'lmasa flat katalog fallback.
# Niki uchun hozircha low-fade yo'q (front rasmlari keyin qo'shiladi).
NIKI_READY_SLUGS = frozenset(MEN_CATALOG_STYLE_SLUGS - {"low-fade"})
PERSONA_READY_ASSETS: dict[str, frozenset[str]] = {
    **{
        pid: frozenset({"reference", *MEN_CATALOG_STYLE_SLUGS})
        for pid in ("britan", "irland", "slavyan", "evro")
    },
    "niki": frozenset({"reference", *NIKI_READY_SLUGS}),
}


def normalize_persona_id(raw: str | None) -> str | None:
    value = (raw or "").strip().lower()
    if value in EXPLORE_PERSONA_IDS:
        return value
    # Eski saqlangan idlar → evro
    if value in {"skandinav", "fransuz"}:
        return "evro"
    return None


def static_persona_ref_image_path(*, audience: str, persona_id: str) -> str:
    pid = normalize_persona_id(persona_id) or persona_id
    return f"/hairstyles/{audience}/personas/{pid}/reference.webp"


def static_persona_style_image_path(*, audience: str, persona_id: str, slug: str) -> str:
    pid = normalize_persona_id(persona_id) or persona_id
    return f"/hairstyles/{audience}/personas/{pid}/{slug}.webp"


def list_explore_personas() -> list[dict]:
    from ai.explore_persona_labels import persona_display_label
    from ai.explore_published import explore_asset_available

    order = ("britan", "irland", "slavyan", "evro", "niki")
    rows: list[dict] = []
    for pid in order:
        if not explore_asset_available(pid, "reference"):
            continue
        persona = EXPLORE_PERSONAS[pid]
        rows.append(
            {
                **persona,
                "label": persona_display_label(pid),
                "reference_url": static_persona_ref_image_path(audience="men", persona_id=pid),
            }
        )
    return rows


def resolve_persona_style_image(*, audience: str, persona_id: str, slug: str) -> str:
    from ai.explore_published import resolve_explore_asset_url

    return resolve_explore_asset_url(
        audience=audience,
        persona_id=persona_id,
        slug=slug,
        view="front",
    )


def list_persona_style_gallery(*, audience: str, persona_id: str, slug: str) -> list[dict[str, str]]:
    from ai.explore_published import list_persona_style_gallery as _gallery

    return _gallery(audience=audience, persona_id=persona_id, slug=slug)


def resolve_persona_ref_image(*, audience: str, persona_id: str) -> str:
    return static_persona_ref_image_path(audience=audience, persona_id=persona_id)


def has_persona_reference(persona_id: str | None) -> bool:
    from ai.explore_published import explore_asset_available

    pid = normalize_persona_id(persona_id)
    if not pid:
        return False
    return explore_asset_available(pid, "reference")


def has_persona_style_asset(persona_id: str | None, slug: str) -> bool:
    from ai.explore_published import explore_asset_available

    pid = normalize_persona_id(persona_id)
    if not pid:
        return False
    return explore_asset_available(pid, slug)


def persona_reference_prompt(*, persona_id: str) -> str:
    pid = normalize_persona_id(persona_id) or DEFAULT_MEN_PERSONA
    return PERSONA_REFERENCE_PROMPTS[pid]
