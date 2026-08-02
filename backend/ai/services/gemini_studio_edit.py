"""Morf AI Studio — generatsiya qilingan rasmni variant bo'yicha tahrirlash."""

from __future__ import annotations

import base64
import io
import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from PIL import Image

from ai.studio_presets import get_studio_option
from ai.usage_pricing import finalize_usage

from .gemini_style import AiStyleError, load_image_bytes
from .image_response import extract_image_bytes, to_data_url
from .studio_image import image_generation_provider, studio_edit_image_model
from .vertex_image import generate_image_content, vertex_image_configured, vertex_image_model

logger = logging.getLogger(__name__)

# Gemini imageConfig aspectRatio — eng yaqin qiymat
_SUPPORTED_RATIOS: tuple[tuple[float, str], ...] = (
    (1 / 1, "1:1"),
    (2 / 3, "2:3"),
    (3 / 2, "3:2"),
    (3 / 4, "3:4"),
    (4 / 3, "4:3"),
    (4 / 5, "4:5"),
    (5 / 4, "5:4"),
    (9 / 16, "9:16"),
    (16 / 9, "16:9"),
    (21 / 9, "21:9"),
)


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


def _nearest_aspect_ratio(width: int, height: int) -> str:
    if width <= 0 or height <= 0:
        return "3:4"
    ratio = width / height
    best = min(_SUPPORTED_RATIOS, key=lambda item: abs(item[0] - ratio))
    return best[1]


def _image_meta(image_bytes: bytes) -> tuple[int, int, str]:
    """Return (width, height, nearest Gemini aspectRatio)."""
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            w, h = img.size
            return w, h, _nearest_aspect_ratio(w, h)
    except Exception:
        return 0, 0, "3:4"


def _build_studio_prompt(*, instruction: str, preset_label: str, category: str) -> str:
    category_hint = {
        "hair_color": (
            "This is a SELECTIVE HAIR RECOLOR edit. Change hair pigment only. "
            "Do not regenerate the portrait."
        ),
        "beard": (
            "This is a SELECTIVE FACIAL-HAIR edit. Change beard/stubble only. "
            "Do not regenerate the portrait."
        ),
        "finish": (
            "This is a SELECTIVE HAIR FINISH / LIGHTING edit. Minimal global change. "
            "Do not regenerate the face."
        ),
    }.get(category, "Apply only the requested micro-edit.")

    return f"""You are Morf AI Studio — a high-fidelity photo RETOUCHER (not a generative artist).

TASK TYPE: in-place photo edit of the provided image.
EDIT NAME: "{preset_label}"
{category_hint}

EDIT DETAILS:
{instruction}

FIDELITY RULES (must follow):
1) Output must look like the SAME photograph with a tiny local change — not a new AI portrait.
2) Preserve resolution, sharpness, noise pattern, and skin texture of the source.
3) Forbidden: beauty filters, skin smoothing, face morphing, eye/lip repainting, makeup, blotchy skin, plastic CGI skin, warped facial features.
4) Forbidden: changing identity, age, ethnicity, expression, pose, crop, clothing logos/text, or background content.
5) Hair edits must blend at the hairline with natural lighting; no sticker/halo edges.
6) If unsure, change LESS rather than redrawing.

Return ONE edited photo only."""


def _resolve_model_provider(model: str) -> tuple[str, str]:
    provider = image_generation_provider() or "studio"
    return model, provider


def _studio_models_to_try() -> list[str]:
    """Pro edit birinchi; Vertexda ishlaydigan lite — zaxira (404 dan qutulish)."""
    primary = (studio_edit_image_model() or "").strip()
    lite = (vertex_image_model() or "").strip()
    models: list[str] = []
    for item in (primary, lite, "gemini-3.1-flash-lite-image"):
        if item and item not in models:
            models.append(item)
    return models


def _model_supports_pro_image_config(model: str) -> bool:
    """flash-lite Vertexda imageSize/TEXT+IMAGE ni INVALID_ARGUMENT bilan rad etadi."""
    name = (model or "").lower()
    if "lite" in name:
        return False
    return "pro-image" in name or "flash-image" in name


def _studio_generation_configs(aspect_ratio: str, *, model: str) -> list[dict[str, Any]]:
    # Try-on bilan bir xil format — lite uchun ishonchli.
    lite_configs: list[dict[str, Any]] = [
        {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio or "3:4"},
        },
        {
            "responseModalities": ["IMAGE"],
        },
    ]
    if not _model_supports_pro_image_config(model):
        return lite_configs
    return [
        {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio, "imageSize": "2K"},
        },
        *lite_configs,
    ]


def generate_studio_edit(
    *,
    image_data_url: str,
    preset_id: str,
) -> StudioEditResult:
    if not vertex_image_configured():
        raise AiStyleError(
            "AI rasm xizmati hozircha ulanmagan. "
            "VERTEX_PROJECT_ID + VERTEX_SERVICE_ACCOUNT_JSON qo'ying "
            "(yoki zaxira sifatida GEMINI_API_KEY).",
            503,
        )

    option = get_studio_option(preset_id)
    if option is None:
        raise AiStyleError("Noto'g'ri studio varianti tanlandi.", 400)

    mime, image_bytes = load_image_bytes(image_data_url)
    _w, _h, aspect_ratio = _image_meta(image_bytes)
    prompt = _build_studio_prompt(
        instruction=option["instruction"],
        preset_label=option["label_uz"],
        category=option["category_id"],
    )

    # Image first, then instruction — models often preserve the reference better this way.
    parts: list[dict[str, Any]] = [
        {
            "inline_data": {
                "mime_type": mime,
                "data": base64.b64encode(image_bytes).decode("ascii"),
            }
        },
        {"text": prompt},
    ]

    models = _studio_models_to_try()
    body: dict[str, Any] = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": _studio_generation_configs(aspect_ratio, model=models[0])[0],
    }

    started = time.perf_counter()
    payload: dict[str, Any] | None = None
    used_model = models[0]
    last_exc: AiStyleError | None = None

    for model in models:
        for config in _studio_generation_configs(aspect_ratio, model=model):
            body["generationConfig"] = config
            try:
                payload = generate_image_content(body, model=model)
                used_model = model
                break
            except AiStyleError as exc:
                last_exc = exc
                logger.warning(
                    "Studio edit attempt failed model=%s status=%s: %s",
                    model,
                    getattr(exc, "status", "?"),
                    exc,
                )
                continue
        if payload is not None:
            break

    if payload is None:
        if last_exc is not None:
            # API route 404 bo'lib ko'rinmasin — bu model xatosi.
            status = 502 if last_exc.status in (404, 400) else last_exc.status
            raise AiStyleError(
                "Studio tahriri hozir ishlamayapti. Keyinroq urinib ko'ring.",
                status,
            ) from last_exc
        raise AiStyleError("Studio tahriri muvaffaqiyatsiz tugadi.", 502)

    latency_ms = int((time.perf_counter() - started) * 1000)
    out_mime, out_bytes = extract_image_bytes(payload)
    usage = finalize_usage(payload, kind="studio", input_images=1)
    model, provider = _resolve_model_provider(used_model)

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
