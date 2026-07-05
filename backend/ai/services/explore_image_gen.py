"""Explore persona katalog rasmlarini generatsiya qilish (dev tooling)."""

from __future__ import annotations

import base64
import logging
import time
from io import BytesIO
from pathlib import Path
from typing import Any

import requests
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
from ai.services.gemini_style import AiStyleError
from ai.services.image_response import extract_image_bytes
from ai.services.vertex_auth import vertex_configured, vertex_image_configured
from ai.services.vertex_image import generate_image_content
from ai.style_prompts import style_detail_for

logger = logging.getLogger(__name__)

PUBLIC_ROOT = Path(settings.BASE_DIR).parent / "apps" / "user" / "public"
OUTPUT_W, OUTPUT_H = 768, 1024


def _uses_public_output() -> bool:
    return PUBLIC_ROOT.is_dir()


def output_mode() -> str:
    return "public" if _uses_public_output() else "media"


def asset_file_path(*, persona_id: str, slug: str) -> Path:
    rel = _relative_asset_path(persona_id=persona_id, slug=slug)
    if _uses_public_output():
        return PUBLIC_ROOT / rel
    return Path(settings.MEDIA_ROOT) / rel

STYLE_NEGATIVE = (
    "different person, changed face, changed age, changed skin tone, "
    "passport photo, ID photo, cartoon, watermark, text, busy background, gradient"
)

IMAGEN_MODEL = "imagen-4.0-generate-001"


def explore_gen_configured() -> dict[str, bool]:
    has_vertex = vertex_configured()
    return {
        "vertex": has_vertex,
        "vertex_imagen": has_vertex,
        "vertex_image": vertex_image_configured(),
    }


def _relative_asset_path(*, persona_id: str, slug: str) -> str:
    if slug == "reference":
        url = resolve_persona_ref_image(audience="men", persona_id=persona_id)
    else:
        url = resolve_persona_style_image(audience="men", persona_id=persona_id, slug=slug)
    return url.lstrip("/")


def _public_url_for(*, persona_id: str, slug: str, path: Path) -> str:
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
            public_url = _public_url_for(persona_id=persona_id, slug=slug, path=path)
            jobs.append(
                {
                    "persona_id": persona_id,
                    "persona_label": persona["label"],
                    "slug": slug,
                    "kind": "reference" if slug == "reference" else "style",
                    "relative_path": rel,
                    "public_url": public_url or None,
                    "download_path": _download_path(persona_id=persona_id, slug=slug),
                    "exists": path.is_file(),
                    "output_mode": mode,
                    "prompt": build_explore_gen_prompt(persona_id=persona_id, slug=slug),
                }
            )
    return jobs


def build_explore_gen_prompt(*, persona_id: str, slug: str) -> str:
    pid = normalize_persona_id(persona_id) or "evro"
    if slug == "reference":
        return persona_reference_prompt(persona_id=pid)

    persona = EXPLORE_PERSONAS[pid]
    style_detail = style_detail_for("men", slug)
    return (
        f"Professional barber studio portrait. Same exact person: {persona['description']}. "
        f"Identical face, skin tone, eyes, expression, pose, plain white t-shirt, "
        f"solid flat #E8E8E8 background, soft studio lighting. "
        f"Hairstyle: {style_detail}. Ultra sharp photorealistic, 3:4 vertical, 768x1024. "
        f"ONLY the hairstyle changes."
    )


def _build_style_edit_prompt(*, persona_id: str, slug: str) -> str:
    pid = normalize_persona_id(persona_id) or "evro"
    persona = EXPLORE_PERSONAS[pid]
    style_detail = style_detail_for("men", slug)
    return f"""You are a professional barber catalog AI for mysaloon.uz.

Edit the portrait photo to show this hairstyle on the SAME person: "{style_detail}".

CRITICAL:
- Keep the EXACT same face, identity, skin tone, age, and facial features ({persona['description']})
- Keep pose, camera angle, expression, white t-shirt, and solid flat #E8E8E8 background
- ONLY change the hair to a photorealistic fresh barber result
- Do NOT add text, watermarks, or extra people
- 3:4 vertical portrait

Output a single edited portrait photo."""


def _resize_webp(raw: bytes, dest: Path) -> None:
    img = Image.open(BytesIO(raw)).convert("RGB")
    img = img.resize((OUTPUT_W, OUTPUT_H), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=85)


def _parse_imagen_predict_response(data: dict[str, Any]) -> bytes:
    predictions = data.get("predictions") or []
    if predictions:
        encoded = predictions[0].get("bytesBase64Encoded") or predictions[0].get("bytes_base64_encoded")
        if encoded:
            return base64.b64decode(encoded)

    images = data.get("generatedImages") or data.get("generated_images") or []
    if images:
        image_obj = images[0].get("image") or images[0]
        encoded = image_obj.get("imageBytes") or image_obj.get("image_bytes")
        if encoded:
            return base64.b64decode(encoded)

    raise AiStyleError("Imagen rasm qaytarmadi.", 502)


def _vertex_imagen_predict_url() -> str:
    project = (getattr(settings, "VERTEX_PROJECT_ID", None) or "").strip()
    loc = (getattr(settings, "VERTEX_LOCATION", None) or "us-central1").strip() or "us-central1"
    path = (
        f"/v1/projects/{project}/locations/{loc}/publishers/google/models/"
        f"{IMAGEN_MODEL}:predict"
    )
    if loc == "global":
        return f"https://aiplatform.googleapis.com{path}"
    return f"https://{loc}-aiplatform.googleapis.com{path}"


def _generate_imagen_vertex(prompt: str) -> bytes:
    if not vertex_configured():
        raise AiStyleError(
            "Vertex AI sozlanmagan. VERTEX_PROJECT_ID va service account kerak.",
            503,
        )

    from ai.services.vertex_auth import get_vertex_access_token

    payload = {
        "instances": [{"prompt": f"{prompt}. Avoid: {STYLE_NEGATIVE}"}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "3:4",
            "personGeneration": "allow_adult",
        },
    }
    try:
        res = requests.post(
            _vertex_imagen_predict_url(),
            headers={
                "Authorization": f"Bearer {get_vertex_access_token()}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=120,
        )
    except requests.RequestException as exc:
        raise AiStyleError("Vertex Imagen API ga ulanib bo'lmadi.", 502) from exc

    if res.status_code >= 400:
        body = res.text[:800]
        logger.warning("Vertex Imagen HTTP %s: %s", res.status_code, body)
        if res.status_code == 429:
            raise AiStyleError("Vertex limiti. 1–2 daqiqa kutib qayta urinib ko'ring.", 429)
        raise AiStyleError(f"Vertex Imagen xato ({res.status_code}).", 502)

    return _parse_imagen_predict_response(res.json())


def _generate_reference_image(prompt: str) -> tuple[bytes, str]:
    return _generate_imagen_vertex(prompt), "vertex_imagen"


def _generate_vertex_style_edit(*, persona_id: str, slug: str, ref_bytes: bytes) -> bytes:
    if not vertex_image_configured():
        raise AiStyleError(
            "Vertex rasm modeli sozlanmagan. VERTEX_PROJECT_ID va service account kerak.",
            503,
        )

    prompt = _build_style_edit_prompt(persona_id=persona_id, slug=slug)
    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "image/webp",
                            "data": base64.b64encode(ref_bytes).decode("ascii"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4"},
        },
    }
    payload = generate_image_content(body)
    _mime, out_bytes = extract_image_bytes(payload)
    return out_bytes


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
        raw, method = _generate_reference_image(prompt)
    else:
        ref_path = asset_file_path(persona_id=pid, slug="reference")
        if ref_path.is_file() and vertex_image_configured():
            raw = _generate_vertex_style_edit(
                persona_id=pid,
                slug=slug,
                ref_bytes=ref_path.read_bytes(),
            )
            method = "vertex_edit"
        else:
            raw, method = _generate_reference_image(prompt)

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
