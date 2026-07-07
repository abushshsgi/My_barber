"""Explore persona katalog rasmlarini generatsiya qilish (dev tooling)."""

from __future__ import annotations

import base64
import logging
import time
from io import BytesIO
from pathlib import Path
from typing import Any

from django.conf import settings
from PIL import Image

from ai.explore_personas import (
    EXPLORE_PERSONAS,
    MEN_CATALOG_STYLE_SLUGS,
    normalize_persona_id,
    persona_reference_prompt,
    resolve_persona_ref_image,
    resolve_persona_style_image,
)
from ai.explore_published import (
    draft_asset_path,
    is_explore_asset_published,
    live_asset_path,
    resolve_explore_asset_url,
)
from ai.services.image_response import extract_image_bytes
from ai.services.studio_image import image_generation_provider, studio_image_configured
from ai.services.vertex_auth import vertex_configured
from ai.services.vertex_image import generate_image_content, image_generation_configured
from ai.style_prompts import style_detail_for

logger = logging.getLogger(__name__)

PUBLIC_ROOT = Path(settings.BASE_DIR).parent / "apps" / "user" / "public"
OUTPUT_W, OUTPUT_H = 768, 1024
WEBP_QUALITY = 92

def _detect_image_mime(raw: bytes, path: Path | None = None) -> str:
    if path is not None:
        suffix = path.suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            return "image/jpeg"
        if suffix == ".png":
            return "image/png"
    if raw[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    return "image/webp"


def _load_public_image(relative_url: str) -> tuple[str, bytes] | None:
    rel = (relative_url or "").lstrip("/")
    if not rel:
        return None
    path = PUBLIC_ROOT / rel
    if not path.is_file():
        return None
    raw = path.read_bytes()
    return _detect_image_mime(raw, path), raw


def _catalog_style_image_path(slug: str) -> str:
    return f"/hairstyles/men/{slug}.webp"


STYLE_NEGATIVE = (
    "different person, changed face, changed age, changed skin tone, "
    "passport photo, ID photo, mugshot, stiff front-facing, cartoon, anime, "
    "watermark, text, logo, busy background, gradient, vignette, plastic skin, "
    "over-smoothed face, deformed face, multiple people"
)


def _uses_public_output() -> bool:
    return PUBLIC_ROOT.is_dir()


def output_mode() -> str:
    return "public" if _uses_public_output() else "media"


def asset_file_path(*, persona_id: str, slug: str) -> Path:
    return draft_asset_path(persona_id=persona_id, slug=slug)


def explore_gen_configured() -> dict[str, bool | str | None]:
    provider = image_generation_provider()
    return {
        "gemini_api_key": studio_image_configured(),
        "studio_image": image_generation_configured(),
        "provider": provider,
        "vertex": vertex_configured(),
    }


def _relative_asset_path(*, persona_id: str, slug: str) -> str:
    if slug == "reference":
        url = resolve_persona_ref_image(audience="men", persona_id=persona_id)
    else:
        url = resolve_persona_style_image(audience="men", persona_id=persona_id, slug=slug)
    return url.lstrip("/")


def _public_url_for(*, persona_id: str, slug: str, path: Path) -> str:
    if is_explore_asset_published(persona_id, slug):
        return resolve_explore_asset_url(audience="men", persona_id=persona_id, slug=slug)
    rel = _relative_asset_path(persona_id=persona_id, slug=slug)
    if _uses_public_output() and path.is_relative_to(PUBLIC_ROOT):
        return f"/{rel}"
    return ""


def _download_path(*, persona_id: str, slug: str) -> str:
    pid = normalize_persona_id(persona_id) or persona_id
    return f"/api/v1/ai/dev/explore-gen/download/?persona_id={pid}&slug={slug}"


def _persona_order() -> tuple[str, ...]:
    return tuple(EXPLORE_PERSONAS.keys())


def list_explore_gen_jobs() -> list[dict[str, Any]]:
    mode = output_mode()
    jobs: list[dict[str, Any]] = []
    for persona_id in _persona_order():
        persona = EXPLORE_PERSONAS[persona_id]
        for slug in ("reference", *sorted(MEN_CATALOG_STYLE_SLUGS)):
            rel = _relative_asset_path(persona_id=persona_id, slug=slug)
            path = asset_file_path(persona_id=persona_id, slug=slug)
            live = live_asset_path(persona_id=persona_id, slug=slug)
            public_url = _public_url_for(persona_id=persona_id, slug=slug, path=path)
            published = is_explore_asset_published(persona_id, slug)
            jobs.append(
                {
                    "persona_id": persona_id,
                    "persona_label": persona["label"],
                    "slug": slug,
                    "kind": "reference" if slug == "reference" else "style",
                    "relative_path": rel,
                    "public_url": public_url or None,
                    "download_path": _download_path(persona_id=persona_id, slug=slug),
                    "exists": path.is_file() or live.is_file(),
                    "published": published,
                    "live_url": resolve_explore_asset_url(audience="men", persona_id=persona_id, slug=slug)
                    if published
                    else None,
                    "output_mode": mode,
                    "prompt": build_explore_gen_prompt(persona_id=persona_id, slug=slug),
                }
            )
    return jobs


def build_explore_gen_prompt(*, persona_id: str, slug: str) -> str:
    pid = normalize_persona_id(persona_id) or "evro"
    if slug == "reference":
        return _build_reference_generation_prompt(persona_id=pid)

    persona = EXPLORE_PERSONAS[pid]
    style_detail = style_detail_for("men", slug)
    return _build_style_text_prompt(
        persona_description=persona["description"],
        style_detail=style_detail,
    )


def _build_reference_generation_prompt(*, persona_id: str) -> str:
    pid = normalize_persona_id(persona_id) or "evro"
    persona = EXPLORE_PERSONAS[pid]
    scene = persona_reference_prompt(persona_id=pid)
    return f"""You are a professional barber catalog photographer for mysaloon.uz.

Create ONE ultra-sharp photorealistic studio portrait for a men's hairstyle reference catalog.

Person: {persona['description']}

Creative direction:
{scene}

Technical requirements:
- Three-quarter portrait, candid barber moment, natural relaxed expression
- Plain white crew-neck t-shirt, solid flat #E8E8E8 background
- Soft even studio lighting, 85mm portrait lens look
- Realistic skin texture and hair detail, no airbrushing
- 3:4 vertical, shoulders visible, catalog-ready quality

AVOID: {STYLE_NEGATIVE}

Output a single high-quality reference portrait photo."""


def _build_style_text_prompt(*, persona_description: str, style_detail: str) -> str:
    return f"""You are a professional barber catalog photographer for mysaloon.uz.

Create ONE ultra-sharp photorealistic studio portrait.

Person: {persona_description}
Hairstyle: {style_detail}

Scene:
- Three-quarter portrait, same person identity throughout the catalog
- Plain white crew-neck t-shirt, solid flat #E8E8E8 background
- Soft studio lighting, fresh professional barber result
- 3:4 vertical, 768x1024, catalog-ready quality

AVOID: {STYLE_NEGATIVE}

Output a single portrait photo with only this hairstyle."""


def _build_style_edit_prompt(*, persona_id: str, slug: str, has_catalog_ref: bool) -> str:
    pid = normalize_persona_id(persona_id) or "evro"
    persona = EXPLORE_PERSONAS[pid]
    style_detail = style_detail_for("men", slug)
    catalog_hint = (
        "A second reference photo shows the target hairstyle on a model — "
        "match that exact hair shape, length, and fade on the person in the first photo."
        if has_catalog_ref
        else ""
    )
    return f"""You are a professional barber catalog AI for mysaloon.uz Explore.

Edit the FIRST portrait photo (persona reference) to show this hairstyle: "{style_detail}".
{catalog_hint}

CRITICAL — same catalog series as Explore page:
- Keep the EXACT same face, identity, skin tone, age, and facial features ({persona['description']})
- Keep the same three-quarter pose, camera angle, expression, white crew-neck t-shirt
- Keep solid flat #E8E8E8 studio background — no props, no gradient
- ONLY change the hair to a photorealistic fresh barber result with natural texture
- Match mysaloon.uz Explore catalog quality: sharp, clean, consistent lighting
- Do NOT add text, watermarks, logos, or extra people
- 3:4 vertical portrait, shoulders visible

AVOID: {STYLE_NEGATIVE}

Output a single edited portrait photo."""


def _image_body(
    *,
    prompt: str,
    persona_bytes: bytes | None = None,
    persona_mime: str = "image/webp",
    catalog_bytes: bytes | None = None,
    catalog_mime: str = "image/webp",
) -> dict[str, Any]:
    parts: list[dict[str, Any]] = []
    if persona_bytes is not None:
        parts.append(
            {
                "inline_data": {
                    "mime_type": persona_mime,
                    "data": base64.b64encode(persona_bytes).decode("ascii"),
                }
            }
        )
    if catalog_bytes is not None:
        parts.append(
            {
                "text": (
                    "Target hairstyle reference from catalog — match this haircut on the person above:"
                )
            }
        )
        parts.append(
            {
                "inline_data": {
                    "mime_type": catalog_mime,
                    "data": base64.b64encode(catalog_bytes).decode("ascii"),
                }
            }
        )
    parts.append({"text": prompt})
    return {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4"},
        },
    }


def _generate_image(
    *,
    prompt: str,
    persona_bytes: bytes | None = None,
    persona_mime: str = "image/webp",
    catalog_bytes: bytes | None = None,
    catalog_mime: str = "image/webp",
) -> bytes:
    if not image_generation_configured():
        raise AiStyleError(
            "Rasm generatsiya sozlanmagan. GEMINI_API_KEY (AI Studio) qo'ying.",
            503,
        )

    payload = generate_image_content(
        _image_body(
            prompt=prompt,
            persona_bytes=persona_bytes,
            persona_mime=persona_mime,
            catalog_bytes=catalog_bytes,
            catalog_mime=catalog_mime,
        )
    )
    _mime, out_bytes = extract_image_bytes(payload)
    return out_bytes


def _generation_method(*, edit: bool) -> str:
    provider = image_generation_provider() or "studio"
    return f"{provider}_{'edit' if edit else 'generate'}"


def _resize_webp(raw: bytes, dest: Path) -> None:
    img = Image.open(BytesIO(raw)).convert("RGB")
    img = img.resize((OUTPUT_W, OUTPUT_H), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=WEBP_QUALITY)


def generate_explore_asset(
    *,
    persona_id: str,
    slug: str,
    force: bool = False,
) -> dict[str, Any]:
    pid = normalize_persona_id(persona_id)
    if not pid:
        raise AiStyleError("Noto'g'ri persona_id.", 400)

    if slug != "reference" and slug not in MEN_CATALOG_STYLE_SLUGS:
        raise AiStyleError("Noto'g'ri slug.", 400)

    dest = asset_file_path(persona_id=pid, slug=slug)
    rel = _relative_asset_path(persona_id=pid, slug=slug)

    if dest.is_file() and not force:
        return {
            "status": "skipped",
            "persona_id": pid,
            "slug": slug,
            "relative_path": rel,
            "public_url": _public_url_for(persona_id=pid, slug=slug, path=dest) or None,
            "download_path": _download_path(persona_id=pid, slug=slug),
            "output_mode": output_mode(),
            "message": "Fayl allaqachon mavjud (--force yo'q).",
        }

    prompt = build_explore_gen_prompt(persona_id=pid, slug=slug)
    started = time.monotonic()

    if slug == "reference":
        raw = _generate_image(prompt=prompt)
        method = _generation_method(edit=False)
    else:
        ref_path = asset_file_path(persona_id=pid, slug="reference")
        if not ref_path.is_file():
            live_ref = live_asset_path(persona_id=pid, slug="reference")
            if live_ref.is_file():
                ref_path = live_ref
            else:
                raise AiStyleError(
                    "Avval reference generatsiya qiling. Uslub faqat shu portretdan edit qilinadi.",
                    400,
                )
        ref_bytes = ref_path.read_bytes()
        ref_mime = _detect_image_mime(ref_bytes, ref_path)
        catalog = _load_public_image(_catalog_style_image_path(slug))
        catalog_bytes = catalog[1] if catalog else None
        catalog_mime = catalog[0] if catalog else "image/webp"
        raw = _generate_image(
            prompt=_build_style_edit_prompt(
                persona_id=pid,
                slug=slug,
                has_catalog_ref=catalog is not None,
            ),
            persona_bytes=ref_bytes,
            persona_mime=ref_mime,
            catalog_bytes=catalog_bytes,
            catalog_mime=catalog_mime,
        )
        method = _generation_method(edit=True)

    _resize_webp(raw, dest)
    elapsed_ms = int((time.monotonic() - started) * 1000)

    return {
        "status": "created",
        "persona_id": pid,
        "slug": slug,
        "relative_path": rel,
        "public_url": _public_url_for(persona_id=pid, slug=slug, path=dest) or None,
        "download_path": _download_path(persona_id=pid, slug=slug),
        "output_mode": output_mode(),
        "method": method,
        "elapsed_ms": elapsed_ms,
        "prompt": prompt,
    }
