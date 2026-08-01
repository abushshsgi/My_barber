"""Vertex AI try-on — selfie + katalog uslubi → preview rasm."""

from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

from django.conf import settings

from ai.style_prompts import style_detail_for
from ai.usage_pricing import finalize_usage

from .gemini_style import AiStyleError, parse_data_url
from .image_response import extract_image_bytes, to_data_url
from .studio_image import image_generation_provider, studio_image_model
from .vertex_image import generate_image_content, vertex_image_configured, vertex_image_model

logger = logging.getLogger(__name__)

PUBLIC_ROOT = Path(settings.BASE_DIR).parent / "apps" / "user" / "public"


@dataclass(frozen=True)
class TryOnResult:
    preview_image: str
    prompt: str
    model: str
    provider: str
    prompt_tokens: int
    candidates_tokens: int
    thoughts_tokens: int
    total_tokens: int
    cost_usd: Decimal
    tokens_estimated: bool
    latency_ms: int


def _build_tryon_prompt(*, title: str, style_detail: str, has_reference: bool) -> str:
    ref_hint = (
        "A second reference photo shows the target hairstyle on a model — match that hair shape and length."
        if has_reference
        else ""
    )
    return f"""You are a professional barber/salon AI for mysaloon.uz.

Edit the person in the FIRST photo (client selfie) to show this hairstyle: "{title}" — {style_detail}.
{ref_hint}

CRITICAL:
- Keep the EXACT same face, identity, skin tone, age, and facial features
- Keep pose, camera angle, and expression as close as possible
- ONLY change the hair to a photorealistic professional salon result
- Natural hair texture, realistic lighting on hair
- Do NOT add text, watermarks, logos, or extra people
- Do NOT dramatically change the background
- Front-facing portrait, shoulders visible if present in original

Output a single edited portrait photo."""


def load_public_image(relative_url: str) -> tuple[str, bytes] | None:
    rel = (relative_url or "").lstrip("/")
    if not rel:
        return None
    path = PUBLIC_ROOT / rel
    if not path.is_file():
        return None
    suffix = path.suffix.lower()
    mime = {
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(suffix, "image/webp")
    return mime, path.read_bytes()


def _resolve_model_provider() -> tuple[str, str]:
    provider = image_generation_provider() or "studio"
    if provider == "studio":
        return studio_image_model(), provider
    return vertex_image_model(), "vertex"


def generate_tryon_preview(
    *,
    selfie_data_url: str,
    audience: str,
    slug: str,
    title: str,
    reference_image_url: str | None = None,
) -> TryOnResult:
    if not vertex_image_configured():
        raise AiStyleError(
            "AI rasm xizmati hozircha ulanmagan. "
            "VERTEX_PROJECT_ID + VERTEX_SERVICE_ACCOUNT_JSON qo'ying "
            "(yoki zaxira sifatida GEMINI_API_KEY).",
            503,
        )

    mime, selfie_bytes = parse_data_url(selfie_data_url)
    style_detail = style_detail_for(audience, slug)

    reference: tuple[str, bytes] | None = None
    if reference_image_url:
        reference = load_public_image(reference_image_url)

    prompt = _build_tryon_prompt(
        title=title,
        style_detail=style_detail,
        has_reference=reference is not None,
    )

    parts: list[dict[str, Any]] = [{"text": prompt}]
    parts.append(
        {
            "inline_data": {
                "mime_type": mime,
                "data": base64.b64encode(selfie_bytes).decode("ascii"),
            }
        }
    )
    input_images = 1
    if reference:
        ref_mime, ref_bytes = reference
        parts.append({"text": "Reference hairstyle target (match this hair on the client):"})
        parts.append(
            {
                "inline_data": {
                    "mime_type": ref_mime,
                    "data": base64.b64encode(ref_bytes).decode("ascii"),
                }
            }
        )
        input_images = 2

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4"},
        },
    }

    model, provider = _resolve_model_provider()
    started = time.perf_counter()
    payload = generate_image_content(body)
    latency_ms = int((time.perf_counter() - started) * 1000)
    out_mime, out_bytes = extract_image_bytes(payload)
    usage = finalize_usage(payload, kind="tryon", input_images=input_images)

    return TryOnResult(
        preview_image=to_data_url(out_mime, out_bytes),
        prompt=prompt,
        model=model,
        provider=provider,
        prompt_tokens=usage["prompt_tokens"],
        candidates_tokens=usage["candidates_tokens"],
        thoughts_tokens=usage["thoughts_tokens"],
        total_tokens=usage["total_tokens"],
        cost_usd=usage["cost_usd"],
        tokens_estimated=usage["tokens_estimated"],
        latency_ms=latency_ms,
    )


def _side_consistency_hint(*, slug: str, view: str) -> str:
    if "curl" in slug or "wave" in slug:
        if view == "back":
            return (
                "CRITICAL: back-of-head curl/wave pattern must stay readable — "
                "same curl size and length as the front try-on."
            )
        return (
            "CRITICAL: keep the same curl/wave texture and length on the visible side "
            "as in the front try-on."
        )
    if "fade" not in slug and slug != "undercut":
        return ""
    if view == "back":
        return (
            "CRITICAL: nape and side fade must continue cleanly around the back — "
            "same fade depth as the front try-on."
        )
    return (
        "CRITICAL fade symmetry: temple taper/fade on the visible side must match "
        "the front try-on — same clipper depth and line-up."
    )


def _build_tryon_rotation_prompt(*, title: str, style_detail: str, slug: str, view: str) -> str:
    from ai.explore_views import view_pose_line

    pose = view_pose_line(view)
    side = _side_consistency_hint(slug=slug, view=view)
    side_block = f"\n{side}\n" if side else ""
    return f"""You are a professional barber/salon AI for mysaloon.uz.

The attached photo(s) show the SAME client with their FINAL try-on hairstyle: "{title}" — {style_detail}.
Re-render THIS EXACT person with THIS EXACT hairstyle, changing ONLY the camera/head angle.

Pose / camera angle (CRITICAL — must match exactly):
{pose}
{side_block}
KEEP 100% IDENTICAL:
- Same face, identity, skin tone, age, and facial features
- Same haircut on all sides: length, fade/taper, parting, texture, hair color
- Same clothing and background as much as possible
- ONLY the head rotation / camera angle changes
- Photorealistic salon result, no text, watermarks, or extra people
- 3:4 vertical portrait

Output a single photo of the SAME person and SAME hairstyle from the new angle only."""


def generate_tryon_rotated_view(
    *,
    front_data_url: str,
    view: str,
    audience: str,
    slug: str,
    title: str,
    side_anchor_data_urls: list[str] | None = None,
) -> TryOnResult:
    """Front try-on natijasidan left/right/back burchakni yaratish."""
    from ai.explore_views import normalize_explore_view

    if not vertex_image_configured():
        raise AiStyleError(
            "AI rasm xizmati hozircha ulanmagan. "
            "VERTEX_PROJECT_ID + VERTEX_SERVICE_ACCOUNT_JSON qo'ying "
            "(yoki zaxira sifatida GEMINI_API_KEY).",
            503,
        )

    normalized = normalize_explore_view(view)
    if normalized == "front":
        mime, raw = parse_data_url(front_data_url)
        return TryOnResult(
            preview_image=to_data_url(mime, raw),
            prompt="front_passthrough",
            model=_resolve_model_provider()[0],
            provider=_resolve_model_provider()[1],
            prompt_tokens=0,
            candidates_tokens=0,
            thoughts_tokens=0,
            total_tokens=0,
            cost_usd=Decimal("0"),
            tokens_estimated=True,
            latency_ms=0,
        )

    style_detail = style_detail_for(audience, slug)
    prompt = _build_tryon_rotation_prompt(
        title=title,
        style_detail=style_detail,
        slug=slug,
        view=normalized,
    )

    parts: list[dict[str, Any]] = [{"text": prompt}]
    input_images = 0
    for idx, source in enumerate([front_data_url, *(side_anchor_data_urls or [])]):
        if not source:
            continue
        mime, payload = parse_data_url(source)
        label = "Front try-on (primary identity + hairstyle anchor)" if idx == 0 else f"Side anchor {idx}"
        parts.append({"text": label})
        parts.append(
            {
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(payload).decode("ascii"),
                }
            }
        )
        input_images += 1

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "3:4"},
        },
    }

    model, provider = _resolve_model_provider()
    started = time.perf_counter()
    payload = generate_image_content(body)
    latency_ms = int((time.perf_counter() - started) * 1000)
    out_mime, out_bytes = extract_image_bytes(payload)
    usage = finalize_usage(payload, kind="tryon", input_images=max(1, input_images))

    return TryOnResult(
        preview_image=to_data_url(out_mime, out_bytes),
        prompt=prompt,
        model=model,
        provider=provider,
        prompt_tokens=usage["prompt_tokens"],
        candidates_tokens=usage["candidates_tokens"],
        thoughts_tokens=usage["thoughts_tokens"],
        total_tokens=usage["total_tokens"],
        cost_usd=usage["cost_usd"],
        tokens_estimated=usage["tokens_estimated"],
        latency_ms=latency_ms,
    )


def generate_tryon_multiview(
    *,
    front_data_url: str,
    audience: str,
    slug: str,
    title: str,
) -> dict[str, Any]:
    """Front + left + right + back. Returns views dict + aggregated usage fields."""
    views: dict[str, str] = {"front": front_data_url}
    total_prompt = 0
    total_candidates = 0
    total_thoughts = 0
    total_tokens = 0
    total_cost = Decimal("0")
    total_latency = 0
    model = ""
    provider = ""
    prompts: list[str] = []

    left = generate_tryon_rotated_view(
        front_data_url=front_data_url,
        view="left",
        audience=audience,
        slug=slug,
        title=title,
    )
    views["left"] = left.preview_image
    total_prompt += left.prompt_tokens
    total_candidates += left.candidates_tokens
    total_thoughts += left.thoughts_tokens
    total_tokens += left.total_tokens
    total_cost += left.cost_usd
    total_latency += left.latency_ms
    model, provider = left.model, left.provider
    prompts.append(left.prompt)

    right = generate_tryon_rotated_view(
        front_data_url=front_data_url,
        view="right",
        audience=audience,
        slug=slug,
        title=title,
        side_anchor_data_urls=[left.preview_image],
    )
    views["right"] = right.preview_image
    total_prompt += right.prompt_tokens
    total_candidates += right.candidates_tokens
    total_thoughts += right.thoughts_tokens
    total_tokens += right.total_tokens
    total_cost += right.cost_usd
    total_latency += right.latency_ms
    prompts.append(right.prompt)

    back = generate_tryon_rotated_view(
        front_data_url=front_data_url,
        view="back",
        audience=audience,
        slug=slug,
        title=title,
        side_anchor_data_urls=[left.preview_image, right.preview_image],
    )
    views["back"] = back.preview_image
    total_prompt += back.prompt_tokens
    total_candidates += back.candidates_tokens
    total_thoughts += back.thoughts_tokens
    total_tokens += back.total_tokens
    total_cost += back.cost_usd
    total_latency += back.latency_ms
    prompts.append(back.prompt)

    return {
        "views": views,
        "prompt": "\n---\n".join(prompts)[:4000],
        "model": model,
        "provider": provider,
        "prompt_tokens": total_prompt,
        "candidates_tokens": total_candidates,
        "thoughts_tokens": total_thoughts,
        "total_tokens": total_tokens,
        "cost_usd": total_cost,
        "tokens_estimated": False,
        "latency_ms": total_latency,
    }
