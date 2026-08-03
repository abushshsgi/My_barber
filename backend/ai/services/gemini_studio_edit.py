"""Morf AI Studio — generatsiya qilingan rasmni variant bo'yicha tahrirlash."""

from __future__ import annotations

import base64
import io
import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Literal

from PIL import Image

from ai.studio_presets import get_studio_option
from ai.usage_pricing import finalize_usage

from .gemini_style import AiStyleError, load_image_bytes
from .image_response import extract_image_bytes, to_studio_response_data_url
from .studio_image import (
    generate_image_content as studio_generate_image_content,
    studio_edit_image_model,
    studio_image_configured,
)
from .vertex_image import (
    generate_image_content as vertex_first_generate_image_content,
    vertex_image_configured,
    vertex_image_model,
)

logger = logging.getLogger(__name__)

ProviderName = Literal["studio", "vertex"]

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

# Edit fidelity (stable IDs). Default — arzon flash-image (1K); Pro/2K yo'q.
# flash-lite — faqat oxirgi zaxira (butun portretni qayta chizishi mumkin).
_FLASH_IMAGE_MODEL = "gemini-3.1-flash-image"
_FLASH_IMAGE_25_MODEL = "gemini-2.5-flash-image"


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
7) Do not invent new objects, accessories, logos, jewelry, tattoos, or background details.

Return ONE edited photo only."""


def _is_lite_model(model: str) -> bool:
    return "lite" in (model or "").lower()


def _model_supports_image_config(model: str) -> bool:
    """flash-lite Vertexda imageConfig/TEXT+IMAGE ni INVALID_ARGUMENT bilan rad etadi."""
    if _is_lite_model(model):
        return False
    name = (model or "").lower()
    return "pro-image" in name or "flash-image" in name


def _studio_models_to_try() -> list[str]:
    """Arzon flash-image birinchi; Pro zanjirda yo'q; lite — oxirgi zaxira."""
    primary = (studio_edit_image_model() or "").strip()
    lite = (vertex_image_model() or "").strip() or "gemini-3.1-flash-lite-image"
    models: list[str] = []
    for item in (
        primary,
        _FLASH_IMAGE_MODEL,
        _FLASH_IMAGE_25_MODEL,
        lite,
        "gemini-3.1-flash-lite-image",
    ):
        if item and item not in models:
            models.append(item)
    # Lite ni oxiriga suramiz — sifat uchun.
    quality = [m for m in models if not _is_lite_model(m)]
    fallback = [m for m in models if _is_lite_model(m)]
    return quality + fallback


def _studio_generation_configs(aspect_ratio: str, *, model: str) -> list[dict[str, Any]]:
    # 1K default — 2K qimmat va sekin; UI baribir ~1280 ga siqadi.
    lite_configs: list[dict[str, Any]] = [
        {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio or "3:4"},
        },
        {
            "responseModalities": ["IMAGE"],
        },
    ]
    if not _model_supports_image_config(model):
        return lite_configs
    return [
        {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio, "imageSize": "1K"},
        },
        {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio},
        },
        *lite_configs[1:],
    ]


def _generate_for_studio_edit(
    body: dict[str, Any],
    *,
    model: str,
) -> tuple[dict[str, Any], ProviderName]:
    """
    Studio tahrir: AI Studio (GEMINI_API_KEY) + edit model birinchi.
    Vertex/lite — faqat zaxira. Lite butun portretni qayta chizib sifatni buzadi.
    """
    last_exc: AiStyleError | None = None

    # 1) Edit-sifatli model → avvalo Google AI Studio
    if studio_image_configured() and not _is_lite_model(model):
        try:
            return studio_generate_image_content(body, model=model), "studio"
        except AiStyleError as exc:
            last_exc = exc
            logger.warning(
                "AI Studio edit failed model=%s status=%s: %s",
                model,
                getattr(exc, "status", "?"),
                exc,
            )

    # 2) Vertex (yoki umumiy zanjir) — lite yoki Studio yo'q/bo'lmaganda
    try:
        return vertex_first_generate_image_content(body, model=model), "vertex"
    except AiStyleError as exc:
        last_exc = exc
        logger.warning(
            "Vertex/edit chain failed model=%s status=%s: %s",
            model,
            getattr(exc, "status", "?"),
            exc,
        )

    # 3) Lite model uchun ham AI Studio zaxira
    if studio_image_configured() and _is_lite_model(model):
        try:
            return studio_generate_image_content(body, model=model), "studio"
        except AiStyleError as exc:
            last_exc = exc

    if last_exc is not None:
        raise last_exc
    raise AiStyleError("Studio tahriri muvaffaqiyatsiz tugadi.", 502)


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
    used_provider: ProviderName = "studio"
    last_exc: AiStyleError | None = None

    for model in models:
        for config in _studio_generation_configs(aspect_ratio, model=model):
            body["generationConfig"] = config
            try:
                payload, used_provider = _generate_for_studio_edit(body, model=model)
                used_model = model
                if _is_lite_model(model):
                    logger.warning(
                        "Studio edit used lite fallback model=%s — fidelity may be low",
                        model,
                    )
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
            status = 502 if last_exc.status in (404, 400) else last_exc.status
            raise AiStyleError(
                "Studio tahriri hozir ishlamayapti. Keyinroq urinib ko'ring.",
                status,
            ) from last_exc
        raise AiStyleError("Studio tahriri muvaffaqiyatsiz tugadi.", 502)

    latency_ms = int((time.perf_counter() - started) * 1000)
    out_mime, out_bytes = extract_image_bytes(payload)
    usage = finalize_usage(payload, kind="studio", input_images=1)

    return StudioEditResult(
        # PNG data URL keyingi tahrirda proxy 413 beradi — siqilgan JPEG qaytaramiz.
        preview_image=to_studio_response_data_url(out_mime, out_bytes),
        prompt=prompt,
        preset_id=option["id"],
        preset_label=option["label_uz"],
        model=used_model,
        provider=used_provider,
        prompt_tokens=usage["prompt_tokens"],
        candidates_tokens=usage["candidates_tokens"],
        thoughts_tokens=usage["thoughts_tokens"],
        total_tokens=usage["total_tokens"],
        cost_usd=usage["cost_usd"],
        tokens_estimated=usage["tokens_estimated"],
        latency_ms=latency_ms,
    )
