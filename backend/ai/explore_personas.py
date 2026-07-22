"""Explore erkak personajlari — 3 ta model, har biri uchun bitta reference + faol uslublar."""

from __future__ import annotations

EXPLORE_PERSONA_IDS = frozenset({"irland", "slavyan", "niki"})

# Har bir personaj — bitta three-quarter reference (foydalanuvchi tasdiqlagan promptlar).
PERSONA_REFERENCE_PROMPTS: dict[str, str] = {
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

DEFAULT_MEN_PERSONA = "irland"

# Dev generatsiya — soqol darajasi (profil ko'rinishlarda bir xil bo'lishi shart).
PERSONA_FACIAL_HAIR: dict[str, str] = {
    "irland": "light ginger stubble only — faint short shadow, NOT a full beard",
    "slavyan": "clean-shaven — no facial hair at all",
    "niki": "light stubble only — faint short shadow on jaw, barely visible, NOT a full beard, NOT thick stubble",
}


def persona_facial_hair_line(persona_id: str | None) -> str:
    pid = normalize_persona_id(persona_id) or DEFAULT_MEN_PERSONA
    return PERSONA_FACIAL_HAIR.get(pid, "match facial hair exactly as in the reference photos")

# Arxiv — avvalgi 12 uslub (diskdagi rasmlar saqlanadi, katalog/explore-gen da faol emas).
MEN_ARCHIVED_STYLE_SLUGS = frozenset(
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

# Faol katalog — Old Money orqa jingalak uslublari (explore-gen).
MEN_CATALOG_STYLE_SLUGS = frozenset(
    {
        "old-money-loose-curl",
        "old-money-soft-wave",
        "old-money-defined-curl",
        "old-money-layered-curl",
        "old-money-tousled-curl",
    }
)

# Yangi uslublar generate/publish qilinmaguncha faqat reference tayyor.
NIKI_READY_SLUGS: frozenset[str] = frozenset()
PERSONA_READY_ASSETS: dict[str, frozenset[str]] = {
    pid: frozenset({"reference"}) for pid in ("irland", "slavyan", "niki")
}

# Git (public) ga qo'yilgan qo'shimcha ko'rinishlar. Front doim ready deb hisoblanadi;
# bu yerda faqat chap/o'ng/orqa kabi qo'shimcha ko'rinishlar e'lon qilinadi. Production
# backend (Railway) da public papka bo'lmagani uchun fayl tizimiga tayanmaymiz.
# Yangi Old Money uslublar publish qilingach shu yerga qo'shiladi.
PERSONA_READY_VIEWS: dict[str, dict[str, tuple[str, ...]]] = {}


def persona_static_extra_views(persona_id: str | None, slug: str) -> tuple[str, ...]:
    """Personaj uchun git'ga qo'yilgan qo'shimcha (non-front) ko'rinishlar."""
    pid = normalize_persona_id(persona_id)
    if not pid:
        return ()
    return PERSONA_READY_VIEWS.get(pid, {}).get(slug, ())


def normalize_persona_id(raw: str | None) -> str | None:
    value = (raw or "").strip().lower()
    if value in EXPLORE_PERSONA_IDS:
        return value
    # Eski saqlangan idlar → irland
    if value in {"skandinav", "fransuz", "britan", "evro"}:
        return "irland"
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

    order = ("irland", "slavyan", "niki")
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
