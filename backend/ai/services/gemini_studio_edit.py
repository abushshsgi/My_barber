"""Morf AI Studio — generatsiya qilingan rasmni variant bo'yicha tahrirlash."""

from __future__ import annotations

import base64
import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from ai.studio_presets import get_studio_option
from ai.usage_pricing import finalize_usage

from .gemini_style import AiStyleError, parse_data_url
from .image_response import extract_image_bytes, to_data_url
from .studio_image import image_generation_provider, studio_image_model
from .vertex_image import generate_image_content, vertex_image_configured, vertex_image_model

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StudioEditResult:
    preview_image: str
    prompt: str
    preset_id: str
    preset_label: str
    model: str
    provider: str
    prompt_tokens: int
    candidates_tokens: int
    thoughts_tokens: int
    total_tokens: int
    cost_usd: Decimal
    tokens_estimated: bool
    latency_ms: int


def _build_studio_prompt(*, instruction: str, preset_label: str) -> str:
    return f"""You are a professional barber/salon AI photo editor for mysaloon.uz (Morf AI Studio).

Edit the person in this photo with this studio change: "{preset_label}".
{instruction}

CRITICAL:
- Keep the EXACT same person identity, face structure, age, and pose
- Photorealistic professional salon result only
- Do NOT add text, watermarks, logos, or extra people
- Do NOT dramatically change the background unless the instruction requires lighting mood only
- Front-facing portrait, shoulders visible if present in original
- Apply ONLY the requested change; leave everything else intact

Output a single edited portrait photo."""


def _resolve_model_provider() -> tuple[str, str]:
    provider = image_generation_provider() or "studio"
    if provider == "studio":
        return studio_image_model(), provider
    return vertex_image_model(), "vertex"


def generate_studio_edit(
    *,
    image_data_url: str,
    preset_id: str,
) -> StudioEditResult:
    if not vertex_image_configured():
        raise AiStyleError(
            "AI rasm xizmati hozircha ulanmagan. GEMINI_API_KEY qo'ying.",
            503,
        )

    option = get_studio_option(preset_id)
    if option is None:
        raise AiStyleError("Noto'g'ri studio varianti tanlandi.", 400)

    mime, image_bytes = parse_data_url(image_data_url)
    prompt = _build_studio_prompt(
        instruction=option["instruction"],
        preset_label=option["label_uz"],
    )

    parts: list[dict[str, Any]] = [
        {"text": prompt},
        {
            "inline_data": {
                "mime_type": mime,
                "data": base64.b64encode(image_bytes).decode("ascii"),
            }
        },
    ]

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
    usage = finalize_usage(payload, kind="studio", input_images=1)

    return StudioEditResult(
        preview_image=to_data_url(out_mime, out_bytes),
        prompt=prompt,
        preset_id=option["id"],
        preset_label=option["label_uz"],
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
