"""Morf AI Try-On via Runware image editing.

Primary: Pruna P-Image-Edit, AIR ``prunaai:2@1``.

Dual-reference: ``inputs.referenceImages[0]`` = user selfie, ``[1]`` = Explore catalog.
Pruna documents fixed 1K dimension presets (not arbitrary width/height). FLUX models remain
in ``VERIFIED_EDIT_MODELS`` for non–Try-On tooling only; Try-On defaults do not use them.

``strength``, ``seedImage``, and masks are not supported. Try-On never falls back to Gemini.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any

from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageOps

from ai.style_prompts import style_detail_for

from .errors import AiStyleError
from .gemini_style import load_image_bytes
from .image_response import to_data_url
from .runware_client import download_image, run_image_inference
from .tryon_preserve import preserve_face, preserve_hair_only_edit
from .tryon_prompts import (
    NEGATIVE_PROMPT,
    NEGATIVE_PROMPT_MAX,
    build_tryon_prompt,
    resolve_tryon_prompt_version,
)
from .tryon_quality import assess_tryon_quality
from ai.usage_pricing import estimate_tryon_request_usd, tryon_cost_cap_usd

logger = logging.getLogger(__name__)

PUBLIC_ROOT = Path(settings.BASE_DIR).parent / "apps" / "user" / "public"

PRUNA_TRYON_MODEL = "prunaai:2@1"
FLUX3_TRYON_MODEL = "bfl:flux@3-image-klein"
DEFAULT_TRYON_MODEL = PRUNA_TRYON_MODEL
DEFAULT_FALLBACK_MODELS = ""

# Runware OpenAPI: width/height must be exactly one of these pairs (additionalProperties false).
PRUNA_DIMENSION_PRESETS: tuple[tuple[int, int], ...] = (
    (1024, 1024),  # 1:1
    (1184, 896),  # 4:3
    (896, 1184),  # 3:4
    (1376, 768),  # 16:9
    (768, 1376),  # 9:16
    (1248, 832),  # 3:2
    (832, 1248),  # 2:3
)
# Task fields allowed by the P-Image-Edit OpenAPI request schema (before client envelope).
PRUNA_TRYON_TASK_FIELDS = frozenset(
    {
        "model",
        "positivePrompt",
        "width",
        "height",
        "inputs",
        "providerSettings",
        "outputFormat",
        "outputQuality",
    }
)

# Verified against Runware docs. Do not add a model here unless its page lists
# Edit (or image-to-image) and reference image input.
VERIFIED_EDIT_MODELS: dict[str, dict[str, int | bool]] = {
    PRUNA_TRYON_MODEL: {
        "min_edge": 768,
        "max_edge": 1376,
        "step": 1,
        "max_references": 4,
        "default_steps": 1,
        "supports_steps": False,
        "supports_negative": False,
        "supports_cfg": False,
        "supports_scheduler": False,
        "supports_seed": False,
        "requires_dual_reference": True,
        "positive_prompt_max": 2000,
        "fixed_dimensions": True,
    },
    FLUX3_TRYON_MODEL: {
        "min_edge": 128,
        "max_edge": 4096,
        "step": 16,
        "max_references": 4,
        "default_steps": 16,
        "supports_negative": False,
        "supports_cfg": False,
        "supports_scheduler": False,
        "requires_dual_reference": True,
    },
    "runware:400@2": {
        "min_edge": 128,
        "max_edge": 2048,
        "step": 16,
        "max_references": 4,
        "default_steps": 4,
        "supports_negative": True,
        "supports_cfg": True,
        "supports_scheduler": True,
        "requires_dual_reference": False,
    },
    "runware:400@6": {
        "min_edge": 128,
        "max_edge": 2048,
        "step": 16,
        "max_references": 4,
        "default_steps": 4,
        "supports_negative": True,
        "supports_cfg": True,
        "supports_scheduler": True,
        "requires_dual_reference": False,
    },
    "runware:400@4": {
        "min_edge": 128,
        "max_edge": 2048,
        "step": 16,
        "max_references": 4,
        "default_steps": 4,
        "supports_negative": True,
        "supports_cfg": True,
        "supports_scheduler": True,
        "requires_dual_reference": False,
    },
}

INPUT_MAX_EDGE = 1536
INPUT_JPEG_QUALITY = 92
RESULT_JPEG_QUALITY = 92
# Only very wide frames (phone video is often 16:9) lose side pixels.
# 4:3 and 3:2 photographs stay intact. The top and bottom rows are never removed.
WIDE_FRAME_RATIO = 1.60
PORTRAIT_CROP_RATIO = 3 / 4  # width / height after a side-only crop
LONG_HAIR_BOTTOM_PAD = 0.12
# Fields this edit model documents. Anything else is omitted.
DOCUMENTED_TASK_FIELDS = frozenset(
    {
        "model",
        "positivePrompt",
        "negativePrompt",
        "width",
        "height",
        "steps",
        "inputs",
        "CFGScale",
        "seed",
        "scheduler",
        "outputFormat",
        "outputQuality",
    }
)
SAFER_RETRY_SUFFIX = (
    "SAFER REVISION: Keep the original forehead height, hairline, temples, and head shape. "
    "Lower the hair volume. Do not cover the forehead with extra curls or a wig-like mass. "
    "Use catalog reference 2 for haircut shape only — keep the user's hair color, skin, clothing, "
    "and background from reference image 1; do not copy catalog edge colors or studio lighting."
)
HAIR_CHANGE_RETRY_SUFFIX = (
    "HAIR TRANSFER RETRY: The previous result kept the original hair. "
    "Replace the entire haircut with the selected MySaloon style from the prompt and catalog. "
    "The new hair must be obviously different in length, silhouette, or fade. "
    "Keep the same face, skin, clothing, and background from reference image 1."
)
CATALOG_HEAD_KEEP_FRACTION = 0.58
CATALOG_DESATURATE_BLEND = 0.82
# Per-model defaults live in VERIFIED_EDIT_MODELS["default_steps"].
TRYON_CFG = 3.5
PROMPT_MAX = 10000
SEED_MAX = 9223372036854776000
OUTPUT_FORMATS = frozenset({"JPG", "PNG", "WEBP"})
FORBIDDEN_TASK_KEYS = frozenset(
    {
        "mask",
        "maskImage",
        "inpaintingMask",
        "seedImage",
        "strength",
    }
)
# Documented scheduler names for runware:400@6. Internal "default" is not sent.
DOCUMENTED_SCHEDULERS = frozenset(
    {
        "DDIM",
        "DDIMScheduler",
        "DDPMScheduler",
        "DEISMultistepScheduler",
        "Default",
        "DPM++",
        "DPM++ 2M",
        "DPM++ 2M Beta",
        "DPM++ 2M Exponential",
        "DPM++ 2M Karras",
        "DPM++ 2M SDE",
        "DPM++ 2M SDE Beta",
        "DPM++ 2M SDE Exponential",
        "DPM++ 2M SDE Karras",
        "DPM++ 2M SDE Uniform",
        "DPM++ 2M Uniform",
        "DPM++ 3M",
        "DPM++ 3M Beta",
        "DPM++ 3M Exponential",
        "DPM++ 3M Karras",
        "DPM++ 3M SDE Uniform",
        "DPM++ 3M Uniform",
        "DPM++ Beta",
        "DPM++ Exponential",
        "DPM++ Karras",
        "DPM++ SDE",
        "DPM++ SDE Beta",
        "DPM++ SDE Exponential",
        "DPM++ SDE Karras",
        "DPM++ Uniform",
        "DPM++ Uniform Beta",
        "DPM++ Uniform Exponential",
        "DPM++ Uniform Karras",
        "DPMSolverMultistepInverse",
        "DPMSolverMultistepScheduler",
        "DPMSolverSinglestepScheduler",
        "EDMDPMSolverMultistepScheduler",
        "EDMEulerScheduler",
        "Euler",
        "Euler a",
        "Euler Beta",
        "Euler Exponential",
        "Euler Karras",
        "EulerAncestralDiscreteScheduler",
        "EulerDiscreteScheduler",
        "FlowMatchEulerDiscreteScheduler",
        "Heun",
        "HeunDiscreteScheduler",
        "Heun Karras",
        "IPNDMScheduler",
        "IPNDM Uniform",
        "IPNDM Uniform Beta",
        "IPNDM Uniform Exponential",
        "IPNDM Uniform Karras",
        "KDPM2AncestralDiscreteScheduler",
        "KDPM2DiscreteScheduler",
        "LCM",
        "LCMScheduler",
        "LMS",
        "LMSDiscreteScheduler",
        "LMS Karras",
        "PNDMScheduler",
        "TCDScheduler",
        "UniPC",
        "UniPC 2M",
        "UniPC 2M Karras",
        "UniPC 2M Uniform",
        "UniPC 3M",
        "UniPC 3M Karras",
        "UniPC 3M Uniform",
        "UniPC Karras",
        "UniPC Uniform",
        "UniPC Uniform Beta",
        "UniPC Uniform Exponential",
        "UniPC Uniform Karras",
    }
)


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


def tryon_provider_name() -> str:
    raw = (getattr(settings, "TRYON_PROVIDER", None) or "runware").strip().lower() or "runware"
    if raw != "runware":
        raise AiStyleError(
            "Morf Try-On faqat Runware orqali ishlaydi. TRYON_PROVIDER=runware qiling.",
            503,
            retryable=False,
        )
    return "runware"


def snap_dimension(value: int, *, step: int = 16, lo: int = 128, hi: int = 4096) -> int:
    snapped = (max(lo, min(hi, int(value))) // step) * step
    if snapped < lo:
        snapped = lo
    return min(snapped, hi)


_DEFAULT_MODEL_SPEC: dict[str, int | bool] = {
    "min_edge": 128,
    "max_edge": 4096,
    "step": 16,
    "max_references": 4,
    "default_steps": 16,
    "supports_steps": True,
    "supports_negative": False,
    "supports_cfg": False,
    "supports_scheduler": False,
    "supports_seed": True,
    "requires_dual_reference": False,
    "fixed_dimensions": False,
    "positive_prompt_max": 10000,
}


def resolved_tryon_model() -> str:
    model = (getattr(settings, "RUNWARE_TRYON_MODEL", None) or DEFAULT_TRYON_MODEL).strip()
    if model not in VERIFIED_EDIT_MODELS:
        raise AiStyleError(
            "RUNWARE_TRYON_MODEL Try-On uchun tasdiqlanmagan. "
            f"Image editing modeli kerak ({PRUNA_TRYON_MODEL} — Pruna P-Image-Edit).",
            503,
            retryable=False,
        )
    return model


def _is_pruna_model(model: str) -> bool:
    return (model or "").strip() == PRUNA_TRYON_MODEL


def _configured_tryon_dimensions() -> tuple[int, int]:
    return (
        int(getattr(settings, "RUNWARE_TRYON_WIDTH", 768) or 768),
        int(getattr(settings, "RUNWARE_TRYON_HEIGHT", 1024) or 1024),
    )


def resolve_pruna_output_size(*, src_w: int = 0, src_h: int = 0) -> tuple[int, int]:
    """Map env/selfie aspect to a documented Pruna 1K preset (768×1024 env → 896×1184 3:4)."""
    preferred = _configured_tryon_dimensions()
    if preferred in PRUNA_DIMENSION_PRESETS:
        return preferred
    if src_w > 0 and src_h > 0:
        ratio = src_w / src_h

        def _distance(wh: tuple[int, int]) -> float:
            return abs(wh[0] / wh[1] - ratio)

        return min(PRUNA_DIMENSION_PRESETS, key=_distance)
    return (896, 1184)


def assert_pruna_dimensions(width: int, height: int) -> tuple[int, int]:
    """Reject non-preset pairs before HTTP (OpenAPI oneOf on width×height)."""
    pair = (int(width), int(height))
    if pair in PRUNA_DIMENSION_PRESETS:
        return pair
    snapped = resolve_pruna_output_size(src_w=int(width), src_h=int(height))
    if snapped not in PRUNA_DIMENSION_PRESETS:
        raise AiStyleError(
            "Try-on o'lchamlari Pruna modeli uchun noto'g'ri.",
            503,
            retryable=False,
        )
    logger.info("Pruna dimensions snapped from=%sx%s to=%sx%s", width, height, *snapped)
    return snapped


def resolved_pruna_provider_settings() -> dict[str, Any] | None:
    if not _flag("RUNWARE_TRYON_PRUNA_TURBO", False):
        return None
    return {"prunaai": {"turbo": True}}


def _chain_within_cost_cap(chain: list[str], *, width: int, height: int, reference_count: int) -> list[str]:
    """Drop fallbacks whose documented estimate exceeds the business cost cap."""
    cap = tryon_cost_cap_usd()
    kept: list[str] = []
    for model in chain:
        estimate = estimate_tryon_request_usd(
            model=model,
            width=width,
            height=height,
            reference_count=reference_count,
            steps=tryon_steps_for_model(model),
        )
        if estimate > cap and kept:
            logger.warning(
                "Try-on model omitted from chain: estimate $%s exceeds cap $%s model=%s",
                estimate,
                cap,
                model,
            )
            continue
        kept.append(model)
    return kept or chain[:1]


def tryon_model_chain() -> list[str]:
    """Asosiy model, keyin zaxira modellar. Ko'pi bilan 4 ta."""
    primary = resolved_tryon_model()
    raw = getattr(settings, "RUNWARE_TRYON_FALLBACK_MODELS", "") or DEFAULT_FALLBACK_MODELS
    extras = [part.strip() for part in str(raw).split(",") if part.strip() and part.strip() != primary]
    chain = [primary, *extras][:4]
    verified = [model for model in chain if model in VERIFIED_EDIT_MODELS]
    return verified or [primary]


def overflow_threshold() -> int:
    """Queue depth above this starts new jobs on a reserve model."""
    raw = getattr(settings, "RUNWARE_TRYON_OVERFLOW_DEPTH", None)
    if raw is not None and str(raw).strip() not in ("", "0"):
        try:
            value = int(raw)
        except (TypeError, ValueError):
            value = 0
        if value > 0:
            return value
    try:
        return max(1, int(getattr(settings, "TRYON_PROVIDER_CONCURRENCY", 8) or 8))
    except (TypeError, ValueError):
        return 8


def tryon_model_chain_for_pressure(queue_depth: int | None = None) -> list[str]:
    """Quiet traffic stays on the primary. Overflow rotates the two reserves."""
    chain = tryon_model_chain()
    if not chain or queue_depth is None:
        return chain
    try:
        depth = int(queue_depth)
    except (TypeError, ValueError):
        return chain
    if depth <= overflow_threshold():
        return chain
    reserves = chain[1:]
    if not reserves:
        return chain
    slot = (depth - overflow_threshold() - 1) % len(reserves)
    chosen = reserves[slot]
    others = [model for model in reserves if model != chosen]
    primary = chain[0]
    return [chosen, *others, primary]


def _model_spec(model: str) -> dict[str, int | bool]:
    return VERIFIED_EDIT_MODELS.get(model) or _DEFAULT_MODEL_SPEC


def tryon_steps_for_model(model: str) -> int:
    spec = _model_spec(model)
    default = int(spec.get("default_steps") or 16)
    if not bool(spec.get("supports_steps", True)):
        return default
    if model != FLUX3_TRYON_MODEL:
        return default
    raw = getattr(settings, "RUNWARE_TRYON_STEPS", None)
    if raw is not None and str(raw).strip() not in ("", "0"):
        try:
            value = int(raw)
            if 1 <= value <= 50:
                return value
        except (TypeError, ValueError):
            pass
    return default


def model_requires_dual_reference(model: str) -> bool:
    return bool(_model_spec(model).get("requires_dual_reference"))


def dual_reference_required(model: str | None = None) -> bool:
    chosen = (model or resolved_tryon_model()).strip()
    if model_requires_dual_reference(chosen):
        return True
    return dual_reference_enabled()


def resolved_tryon_size(model: str | None = None) -> tuple[int, int]:
    chosen = model or resolved_tryon_model()
    if _is_pruna_model(chosen):
        return resolve_pruna_output_size()
    spec = _model_spec(chosen)
    width = snap_dimension(
        int(getattr(settings, "RUNWARE_TRYON_WIDTH", 1024) or 1024),
        step=spec["step"],
        lo=spec["min_edge"],
        hi=spec["max_edge"],
    )
    height = snap_dimension(
        int(getattr(settings, "RUNWARE_TRYON_HEIGHT", 1536) or 1536),
        step=spec["step"],
        lo=spec["min_edge"],
        hi=spec["max_edge"],
    )
    return width, height


_LONG_HAIR_MARKERS = (
    "long layered",
    "below the shoulder",
    "below shoulder",
    "collarbone",
    "long bob",
    "long hair",
    "longer back",
)


@dataclass(frozen=True)
class SelfiePrep:
    payload: bytes
    original_width: int
    original_height: int
    normalized_width: int
    normalized_height: int
    image_format: str
    exif_orientation: int | None
    exif_transposed: bool
    crop_strategy: str
    jpeg_quality: int | None


def _image_format(raw: bytes) -> str:
    if raw.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if raw.startswith(b"RIFF") and raw[8:12] == b"WEBP":
        return "webp"
    return "unknown"


def _exif_orientation(image: Image.Image) -> int | None:
    try:
        value = image.getexif().get(274)
    except Exception:
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    if parsed < 1 or parsed > 8:
        return None
    return parsed


def prepare_selfie_bytes(raw: bytes, *, style_detail: str = "") -> SelfiePrep:
    """One normalizer for camera and gallery bytes.

    EXIF orientation is applied. Wide frames lose side pixels only.
    Nothing is added above the hair, and the image is never stretched.
    """
    image_format = _image_format(raw)
    try:
        image = Image.open(BytesIO(raw))
        orientation = _exif_orientation(image)
        oriented = ImageOps.exif_transpose(image)
        transposed = oriented.size != image.size or orientation not in (None, 1)
        if oriented.mode != "RGB":
            oriented = oriented.convert("RGB")
            transposed = True
    except Exception:
        return SelfiePrep(
            payload=raw,
            original_width=0,
            original_height=0,
            normalized_width=0,
            normalized_height=0,
            image_format=image_format,
            exif_orientation=None,
            exif_transposed=False,
            crop_strategy="none",
            jpeg_quality=None,
        )

    src_w, src_h = oriented.size
    if src_w < 1 or src_h < 1:
        return SelfiePrep(
            payload=raw,
            original_width=src_w,
            original_height=src_h,
            normalized_width=src_w,
            normalized_height=src_h,
            image_format=image_format,
            exif_orientation=orientation,
            exif_transposed=transposed,
            crop_strategy="none",
            jpeg_quality=None,
        )

    strategy = "none"
    working = oriented
    if src_h > 0 and (src_w / src_h) >= WIDE_FRAME_RATIO:
        target_w = max(1, int(round(src_h * PORTRAIT_CROP_RATIO)))
        if target_w < src_w - 1:
            left = max(0, (src_w - target_w) // 2)
            working = oriented.crop((left, 0, left + target_w, src_h))
            strategy = "horizontal_portrait"

    width, height = working.size
    detail = (style_detail or "").lower()
    needs_length = any(marker in detail for marker in _LONG_HAIR_MARKERS)
    if needs_length and width > 0 and (height / width) < 1.15:
        extra_bottom = max(int(height * LONG_HAIR_BOTTOM_PAD), 1)
        fill = working.getpixel((width // 2, height - 1))
        canvas = Image.new("RGB", (width, height + extra_bottom), fill)
        canvas.paste(working, (0, 0))
        working = canvas
        strategy = "bottom_length" if strategy == "none" else f"{strategy}+bottom_length"

    if strategy == "none" and not transposed:
        return SelfiePrep(
            payload=raw,
            original_width=src_w,
            original_height=src_h,
            normalized_width=src_w,
            normalized_height=src_h,
            image_format=image_format,
            exif_orientation=orientation,
            exif_transposed=False,
            crop_strategy="none",
            jpeg_quality=None,
        )

    buffer = BytesIO()
    working.save(buffer, format="JPEG", quality=INPUT_JPEG_QUALITY, optimize=True)
    payload = buffer.getvalue() or raw
    out_w, out_h = working.size
    return SelfiePrep(
        payload=payload,
        original_width=src_w,
        original_height=src_h,
        normalized_width=out_w,
        normalized_height=out_h,
        image_format="jpeg",
        exif_orientation=orientation,
        exif_transposed=transposed,
        crop_strategy=strategy,
        jpeg_quality=INPUT_JPEG_QUALITY,
    )


def _pad_selfie_for_hair(raw: bytes, *, style_detail: str = "") -> bytes:
    """Backward-compatible wrapper. Does not add space above the hair."""
    return prepare_selfie_bytes(raw, style_detail=style_detail).payload


def _output_size_for_bytes(raw: bytes, model: str) -> tuple[int, int]:
    """Keep the selfie aspect ratio so the face is not stretched."""
    fallback = resolved_tryon_size(model)
    spec = _model_spec(model)
    try:
        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        src_w, src_h = image.size
    except Exception:
        return fallback
    if src_w < 1 or src_h < 1:
        return fallback
    if bool(spec.get("fixed_dimensions")):
        return resolve_pruna_output_size(src_w=src_w, src_h=src_h)
    target_long = snap_dimension(
        max(fallback),
        step=spec["step"],
        lo=spec["min_edge"],
        hi=spec["max_edge"],
    )
    if src_h >= src_w:
        height = target_long
        width = snap_dimension(
            int(round(height * src_w / src_h)),
            step=spec["step"],
            lo=spec["min_edge"],
            hi=spec["max_edge"],
        )
    else:
        width = target_long
        height = snap_dimension(
            int(round(width * src_h / src_w)),
            step=spec["step"],
            lo=spec["min_edge"],
            hi=spec["max_edge"],
        )
    return width, height


def dual_reference_enabled() -> bool:
    return _flag("RUNWARE_TRYON_DUAL_REFERENCE", True)


def prepare_catalog_hair_reference(raw: bytes) -> bytes:
    """Strip catalog color/lighting bleed; keep head crop for haircut geometry only."""
    try:
        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        if image.mode != "RGB":
            image = image.convert("RGB")
    except Exception:
        return raw
    width, height = image.size
    if width < 32 or height < 32:
        return raw
    crop_h = max(32, int(height * CATALOG_HEAD_KEEP_FRACTION))
    image = image.crop((0, 0, width, min(height, crop_h)))
    gray = ImageOps.grayscale(image).convert("RGB")
    blend = max(0.0, min(1.0, CATALOG_DESATURATE_BLEND))
    image = Image.blend(image, gray, blend)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=INPUT_JPEG_QUALITY, optimize=True)
    payload = buffer.getvalue()
    return payload if payload.startswith(b"\xff\xd8\xff") else raw


def load_catalog_reference_bytes(reference_image_url: str | None) -> bytes:
    """Load the Explore catalog portrait for referenceImages[1]. Fails if missing."""
    url = str(reference_image_url or "").strip()
    if not url:
        raise AiStyleError(
            "Tanlangan uslub uchun katalog rasmi topilmadi.",
            400,
            retryable=False,
        )
    loaded = load_public_image(url)
    if not loaded:
        raise AiStyleError(
            "Tanlangan uslub uchun katalog rasmi yuklanmadi.",
            400,
            retryable=False,
        )
    _mime, raw = loaded
    prepared = prepare_selfie_bytes(raw, style_detail="")
    if not prepared.payload:
        raise AiStyleError(
            "Tanlangan uslub uchun katalog rasmi yuklanmadi.",
            400,
            retryable=False,
        )
    if _flag("RUNWARE_TRYON_CATALOG_DESATURATE", True):
        return prepare_catalog_hair_reference(prepared.payload)
    return prepared.payload


def load_public_image(relative_url: str) -> tuple[str, bytes] | None:
    rel = (relative_url or "").lstrip("/")
    if not rel or ".." in rel.split("/"):
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


def _media_url(rel: str) -> str:
    base = (getattr(settings, "MEDIA_URL", None) or "/media/").strip() or "/media/"
    if not base.startswith("/"):
        base = f"/{base}"
    if not base.endswith("/"):
        base = f"{base}/"
    return f"{base}{rel.lstrip('/')}"


TRYON_CARD_MAX_EDGE = 512
TRYON_CARD_WEBP_QUALITY = 82


def _tryon_card_webp(raw_jpeg: bytes) -> bytes:
    image = Image.open(BytesIO(raw_jpeg))
    image = ImageOps.exif_transpose(image)
    if image.mode != "RGB":
        image = image.convert("RGB")
    image.thumbnail((TRYON_CARD_MAX_EDGE, TRYON_CARD_MAX_EDGE), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    image.save(buffer, format="WEBP", quality=TRYON_CARD_WEBP_QUALITY, method=4)
    payload = buffer.getvalue()
    if not payload:
        raise ValueError("empty card webp")
    return payload


def store_tryon_jpeg(raw: bytes) -> str:
    """Save validated JPEG bytes in DatabaseMediaStorage (or the active storage)."""
    if not raw or not raw.startswith(b"\xff\xd8\xff"):
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    if len(raw) > 8 * 1024 * 1024:
        raise AiStyleError("Natija rasmi juda katta.", 502, retryable=False)
    from media_store.utils import save_media_bytes

    folder = f"ai-style/tryon-results/{timezone.now():%Y/%m}"
    stem = uuid.uuid4().hex
    rel = f"{folder}/{stem}.jpg"
    save_media_bytes(rel, raw, content_type="image/jpeg")
    try:
        card = _tryon_card_webp(raw)
        save_media_bytes(f"{folder}/{stem}_card.webp", card, content_type="image/webp")
    except Exception:
        logger.debug("Try-on card preview skipped", exc_info=True)
    return _media_url(rel)


def _prepare_data_uri(raw: bytes, *, max_edge: int) -> str:
    try:
        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        if image.mode != "RGB":
            image = image.convert("RGB")
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=INPUT_JPEG_QUALITY, optimize=True)
    except AiStyleError:
        raise
    except Exception as exc:
        raise AiStyleError("Rasm qabul qilinmadi. Boshqa surat yuklang.", 400, retryable=False) from exc
    payload = buffer.getvalue()
    if not payload:
        raise AiStyleError("Rasm qabul qilinmadi. Boshqa surat yuklang.", 400, retryable=False)
    return to_data_url("image/jpeg", payload)


def _normalize_output(raw: bytes) -> bytes:
    try:
        image = Image.open(BytesIO(raw))
        image.load()
        if image.mode != "RGB":
            image = image.convert("RGB")
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=RESULT_JPEG_QUALITY, optimize=True)
    except Exception as exc:
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True) from exc
    payload = buffer.getvalue()
    if not payload or not payload.startswith(b"\xff\xd8\xff"):
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    return payload


def _cost_from(result: dict[str, Any]) -> tuple[Decimal, bool]:
    raw = result.get("cost")
    if raw is None:
        return Decimal("0"), True
    try:
        return Decimal(str(raw)), False
    except Exception:
        return Decimal("0"), True


def _publish(jpeg: bytes) -> str:
    try:
        return store_tryon_jpeg(jpeg)
    except AiStyleError:
        raise
    except Exception:
        logger.exception("Try-on result storage failed; returning local image data")
        return to_data_url("image/jpeg", jpeg)


def _flag(name: str, default: bool) -> bool:
    raw = getattr(settings, name, default)
    if isinstance(raw, str):
        return raw.strip().lower() in ("1", "true", "yes", "on")
    return bool(raw)


def resolved_cfg_scale() -> float | None:
    """CFGScale is supported (1–20, step 0.01, default 3.5). Invalid values are omitted."""
    raw = getattr(settings, "RUNWARE_TRYON_CFG_SCALE", TRYON_CFG)
    if raw is None or str(raw).strip() == "":
        raw = TRYON_CFG
    try:
        value = float(raw)
    except (TypeError, ValueError):
        logger.warning("RUNWARE_TRYON_CFG_SCALE is not numeric; CFGScale omitted")
        return None
    if value != value or value in (float("inf"), float("-inf")) or value < 1 or value > 20:
        logger.warning("RUNWARE_TRYON_CFG_SCALE=%s outside 1-20; CFGScale omitted", raw)
        return None
    return round(value, 2)


def resolved_negative_prompt(cfg: float | None) -> str | None:
    """negativePrompt is supported, max 3000, and ignored by the model when CFGScale <= 1."""
    if not _flag("RUNWARE_TRYON_NEGATIVE_PROMPT_ENABLED", True):
        logger.info("negativePrompt omitted: RUNWARE_TRYON_NEGATIVE_PROMPT_ENABLED is off")
        return None
    if cfg is not None and cfg <= 1:
        logger.info("negativePrompt omitted: CFGScale <= 1 disables guidance")
        return None
    custom = str(getattr(settings, "RUNWARE_TRYON_NEGATIVE_PROMPT", "") or "").strip()
    text = custom or NEGATIVE_PROMPT.strip()
    if len(text) < 2:
        return None
    if len(text) > NEGATIVE_PROMPT_MAX:
        logger.warning(
            "negativePrompt omitted: length %s exceeds model limit %s",
            len(text),
            NEGATIVE_PROMPT_MAX,
        )
        return None
    return text


def resolved_seed() -> int | None:
    """Omit seed in production. The API then picks an unsigned 32-bit seed."""
    mode = str(getattr(settings, "RUNWARE_TRYON_SEED_MODE", "auto") or "auto").strip().lower()
    if mode in ("", "auto", "random", "default"):
        return None
    if mode not in ("fixed", "test"):
        logger.warning("RUNWARE_TRYON_SEED_MODE=%s is not auto or fixed; seed omitted", mode)
        return None
    raw = getattr(settings, "RUNWARE_TRYON_TEST_SEED", None)
    try:
        seed = int(raw)
    except (TypeError, ValueError):
        logger.warning("RUNWARE_TRYON_TEST_SEED is not an integer; seed omitted")
        return None
    if seed < 0 or seed > SEED_MAX:
        logger.warning("RUNWARE_TRYON_TEST_SEED outside 0-%s; seed omitted", SEED_MAX)
        return None
    return seed


def resolved_scheduler(model: str) -> str | None:
    """Internal 'default' is not sent. Only documented scheduler names are sent."""
    if not bool(_model_spec(model).get("supports_scheduler")):
        return None
    raw = str(getattr(settings, "RUNWARE_TRYON_SCHEDULER", "default") or "default").strip()
    if raw.lower() in ("", "default"):
        return None
    if raw not in DOCUMENTED_SCHEDULERS:
        logger.warning("scheduler %s is not documented for %s; field omitted", raw, model)
        return None
    return raw


def resolved_output_format() -> str:
    primary = resolved_tryon_model()
    if _is_pruna_model(primary):
        default = "JPG"
    elif primary == FLUX3_TRYON_MODEL:
        default = "WEBP"
    else:
        default = "PNG"
    raw = str(getattr(settings, "RUNWARE_TRYON_OUTPUT_FORMAT", default) or default).strip().upper()
    if raw == "JPEG":
        raw = "JPG"
    if raw not in OUTPUT_FORMATS:
        logger.warning("output format %s is unsupported; using PNG", raw)
        return "PNG"
    return raw


def _note_ignored_strength() -> None:
    raw = str(getattr(settings, "RUNWARE_TRYON_STRENGTH", "") or "").strip()
    if raw:
        logger.info("RUNWARE_TRYON_STRENGTH ignored; Try-On edit models do not support strength")


def build_tryon_task(
    *,
    model: str,
    prompt: str,
    width: int,
    height: int,
    references: list[str],
) -> dict[str, Any]:
    """Payload fields verified per model. Unsupported fields are left out."""
    _note_ignored_strength()
    spec = _model_spec(model)
    prompt_max = int(spec.get("positive_prompt_max") or PROMPT_MAX)
    if len(prompt) > prompt_max:
        logger.warning(
            "positivePrompt length %s exceeds %s; request may be rejected",
            len(prompt),
            prompt_max,
        )
    if _is_pruna_model(model):
        width, height = assert_pruna_dimensions(width, height)
    task: dict[str, Any] = {
        "model": model,
        "positivePrompt": prompt,
        "width": int(width),
        "height": int(height),
        "inputs": {"referenceImages": list(references)},
    }
    if _is_pruna_model(model):
        provider = resolved_pruna_provider_settings()
        if provider is not None:
            task["providerSettings"] = provider
    if bool(spec.get("supports_steps", True)):
        task["steps"] = tryon_steps_for_model(model)
    cfg = resolved_cfg_scale() if bool(spec.get("supports_cfg")) else None
    if cfg is not None:
        task["CFGScale"] = cfg
    if bool(spec.get("supports_negative")):
        negative = resolved_negative_prompt(cfg)
        if negative:
            task["negativePrompt"] = negative
    if bool(spec.get("supports_seed", True)):
        seed = resolved_seed()
        if seed is not None:
            task["seed"] = seed
    scheduler = resolved_scheduler(model)
    if scheduler:
        task["scheduler"] = scheduler
    output_format = resolved_output_format()
    task["outputFormat"] = output_format
    if output_format in {"JPG", "WEBP"}:
        task["outputQuality"] = 95
    for key in FORBIDDEN_TASK_KEYS:
        task.pop(key, None)
    allowed = PRUNA_TRYON_TASK_FIELDS if _is_pruna_model(model) else set(DOCUMENTED_TASK_FIELDS)
    unknown = sorted(set(task) - allowed)
    if unknown:
        logger.warning("Dropping undocumented Runware fields: %s", unknown)
        for key in unknown:
            task.pop(key, None)
    return task


def _assert_tryon_cost_budget(
    *,
    model: str,
    width: int,
    height: int,
    reference_count: int,
) -> Decimal:
    estimate = estimate_tryon_request_usd(
        model=model,
        width=width,
        height=height,
        reference_count=reference_count,
        steps=tryon_steps_for_model(model),
    )
    cap = tryon_cost_cap_usd()
    if estimate > cap:
        raise AiStyleError(
            "Try-on konfiguratsiyasi byudjet chegarasidan oshdi. Administratorga murojaat qiling.",
            503,
            retryable=False,
        )
    return estimate


def _build_tryon_prompt(
    *,
    title: str,
    style_detail: str,
    selected_hair_color: str | None = None,
    include_catalog_image: bool = False,
    audience: str | None = None,
    slug: str | None = None,
) -> str:
    return build_tryon_prompt(
        title=title,
        style_detail=style_detail,
        selected_hair_color=selected_hair_color,
        include_catalog_image=include_catalog_image,
        audience=audience,
        slug=slug,
    )


def _side_consistency_hint(*, slug: str, view: str) -> str:
    if "curl" in slug or "wave" in slug:
        if view == "back":
            return (
                "Keep the same curl size and length around the back of the head."
            )
        return "Keep the same curl or wave texture and length on the visible side."
    if "fade" not in slug and slug != "undercut":
        return ""
    if view == "back":
        return "Continue the same fade depth cleanly around the nape."
    return "Match the temple fade depth and line-up from the front photo."


def _build_tryon_rotation_prompt(
    *,
    title: str,
    style_detail: str,
    slug: str,
    view: str,
    selected_hair_color: str | None = None,
) -> str:
    from ai.explore_views import view_pose_line

    pose = view_pose_line(view)
    side = _side_consistency_hint(slug=slug, view=view)
    side_block = f" {side}" if side else ""
    explicit = " ".join(str(selected_hair_color or "").split())[:80]
    if explicit:
        color_line = f' Keep the explicitly requested hair color "{explicit}".'
    else:
        color_line = " Keep the original hair color from reference image 1."
    return (
        "Edit reference image 1. It already shows the client's finished hairstyle "
        f'"{title}" — {style_detail}. Re-render the same person and the same haircut '
        f"from this camera angle only: {pose}.{side_block} "
        "Reference image 1 is the identity lock: keep the same face, face shape, "
        "jawline, eyes, nose, mouth, skin texture, skin tone, age, and expression. "
        "Any later reference images are angle anchors of the same person and the same haircut. "
        f"Do not generate a new face. Keep clothing and background.{color_line} "
        "Photorealistic portrait. No text, watermark, or extra people."
    )


def _infer_edit(
    *,
    prompt: str,
    images: list[bytes],
    model: str,
    width: int,
    height: int,
) -> tuple[bytes, Decimal, bool, int]:
    spec = _model_spec(model)
    if not images or len(images) > spec["max_references"]:
        raise AiStyleError("Rasm qabul qilinmadi. Boshqa surat yuklang.", 400, retryable=False)
    edge = min(INPUT_MAX_EDGE, max(width, height))
    references = [_prepare_data_uri(raw, max_edge=edge) for raw in images]
    _assert_tryon_cost_budget(
        model=model,
        width=width,
        height=height,
        reference_count=len(references),
    )
    started = time.perf_counter()
    task = build_tryon_task(
        model=model,
        prompt=prompt,
        width=width,
        height=height,
        references=references,
    )
    result = run_image_inference(task)
    image_url = str(result.get("imageURL") or result.get("imageUrl") or "").strip()
    if not image_url and not result.get("imageBase64Data") and not result.get("imageDataURI"):
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    if image_url:
        downloaded = download_image(image_url)
    else:
        downloaded = _bytes_from_inline(result)
    jpeg = _normalize_output(downloaded)
    cost, estimated = _cost_from(result)
    latency_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "Runware try-on done model=%s latency_ms=%s cost_usd=%s bytes=%s refs=%s seed=%s",
        model,
        latency_ms,
        cost if not estimated else "unknown",
        len(jpeg),
        len(references),
        result.get("seed") if result.get("seed") is not None else "auto",
    )
    return jpeg, cost, estimated, latency_ms


def _switch_to_next_model(exc: AiStyleError) -> bool:
    """Switch only when the model is down or invalid — not when it is merely busy.

    HTTP 429 must not switch models in the same job. The queue already retries with Retry-After.
    """
    if exc.status in (502, 503, 504):
        return True
    message = (exc.message or "").lower()
    return exc.status == 400 and "model" in message


def _infer_with_fallback(
    *,
    prompt: str,
    images: list[bytes],
    queue_depth: int | None = None,
) -> tuple[bytes, Decimal, bool, int, str]:
    chain = tryon_model_chain_for_pressure(queue_depth)
    if chain and chain[0] != resolved_tryon_model():
        logger.info(
            "Try-on load spill primary=%s model=%s queue_depth=%s",
            resolved_tryon_model(),
            chain[0],
            queue_depth,
        )
    last: AiStyleError | None = None
    source = images[0] if images else b""
    reference_count = len(images)
    width, height = _output_size_for_bytes(source, chain[0] if chain else resolved_tryon_model())
    chain = _chain_within_cost_cap(
        chain,
        width=width,
        height=height,
        reference_count=reference_count,
    )
    for index, model in enumerate(chain):
        width, height = _output_size_for_bytes(source, model)
        attempts = 2 if index == 0 else 1
        for attempt in range(attempts):
            try:
                jpeg, cost, estimated, latency_ms = _infer_edit(
                    prompt=prompt,
                    images=images,
                    model=model,
                    width=width,
                    height=height,
                )
                return jpeg, cost, estimated, latency_ms, model
            except AiStyleError as exc:
                last = exc
                if (
                    attempt + 1 < attempts
                    and exc.retryable
                    and exc.status in (502, 503, 504)
                ):
                    time.sleep(1.25)
                    continue
                break
        if index >= len(chain) - 1 or not last or not _switch_to_next_model(last):
            raise last or AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
        logger.warning(
            "Try-on model busy model=%s status=%s next=%s",
            model,
            last.status if last else 0,
            chain[index + 1],
        )
    raise last or AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)


def _bytes_from_inline(result: dict[str, Any]) -> bytes:
    import base64

    raw = result.get("imageBase64Data") or ""
    data_uri = str(result.get("imageDataURI") or "")
    if not raw and data_uri.startswith("data:") and "," in data_uri:
        raw = data_uri.split(",", 1)[1]
    if not raw:
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    try:
        payload = base64.b64decode(raw, validate=False)
    except Exception as exc:
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True) from exc
    if not payload:
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    return payload


def _result(
    *,
    preview: str,
    prompt: str,
    model: str,
    cost: Decimal,
    estimated: bool,
    latency_ms: int,
) -> TryOnResult:
    return TryOnResult(
        preview_image=preview,
        prompt=prompt,
        model=model,
        provider=tryon_provider_name(),
        prompt_tokens=0,
        candidates_tokens=0,
        thoughts_tokens=0,
        total_tokens=0,
        cost_usd=cost,
        tokens_estimated=estimated,
        latency_ms=latency_ms,
    )


def normalize_input_source(value: str | None) -> str:
    raw = str(value or "").strip().lower().replace("-", "_")
    if raw in {"camera", "camera_scan"}:
        return "camera"
    if raw in {"gallery", "upload"}:
        return "gallery"
    return ""


def diagnostics_enabled() -> bool:
    raw = getattr(settings, "TRYON_DIAGNOSTICS", None)
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return bool(getattr(settings, "DEBUG", False))
    if isinstance(raw, str):
        return raw.strip().lower() in {"1", "true", "yes", "on"}
    return bool(raw)


def tryon_diagnostic_record(**fields: Any) -> dict[str, Any]:
    """Technical metadata only. Image bytes and prompts are not included."""
    allowed = (
        "input_source",
        "original_width",
        "original_height",
        "normalized_width",
        "normalized_height",
        "image_format",
        "exif_orientation",
        "exif_transposed",
        "mirror_correction",
        "jpeg_quality",
        "crop_strategy",
        "model",
        "latency_ms",
        "provider_error",
        "quality_result",
        "quality_reason",
        "quality_iou",
        "quality_shift_px",
        "face_restore_applied",
        "quality_retries",
        "output_width",
        "output_height",
        "prompt_version",
        "qc_overall",
        "qc_hair_band_change",
        "qc_forehead_status",
        "dual_reference",
        "catalog_reference_attached",
    )
    record = {key: fields.get(key) for key in allowed}
    return record


def log_tryon_diagnostics(record: dict[str, Any]) -> None:
    if not diagnostics_enabled():
        return
    logger.info("tryon_diagnostics %s", json.dumps(record, sort_keys=True, default=str))


def generate_tryon_preview(
    *,
    selfie_data_url: str,
    audience: str,
    slug: str,
    title: str,
    reference_image_url: str | None = None,
    selected_hair_color: str | None = None,
    queue_depth: int | None = None,
    input_source: str | None = None,
) -> TryOnResult:
    tryon_provider_name()
    resolved_tryon_model()
    source_name = normalize_input_source(input_source)
    _mime, selfie = load_image_bytes(selfie_data_url)
    style_detail = style_detail_for(audience, slug)
    prepared = prepare_selfie_bytes(selfie, style_detail=style_detail)
    primary_model = resolved_tryon_model()
    include_catalog = False
    images: list[bytes] = [prepared.payload]
    if dual_reference_required(primary_model):
        catalog_bytes = load_catalog_reference_bytes(reference_image_url)
        images = [prepared.payload, catalog_bytes]
        include_catalog = True
    elif dual_reference_enabled():
        catalog_bytes = load_catalog_reference_bytes(reference_image_url)
        images = [prepared.payload, catalog_bytes]
        include_catalog = True
    elif reference_image_url:
        logger.info(
            "Catalog reference omitted: RUNWARE_TRYON_DUAL_REFERENCE is off slug=%s",
            slug,
        )
    prompt = _build_tryon_prompt(
        title=title,
        style_detail=style_detail,
        selected_hair_color=selected_hair_color,
        include_catalog_image=include_catalog,
        audience=audience,
        slug=slug,
    )
    width, height = _output_size_for_bytes(prepared.payload, resolved_tryon_model())
    try:
        jpeg, cost, estimated, latency_ms, model = _infer_with_fallback(
            prompt=prompt,
            images=images,
            queue_depth=queue_depth,
        )
    except AiStyleError as exc:
        log_tryon_diagnostics(
            tryon_diagnostic_record(
                input_source=source_name or "unknown",
                original_width=prepared.original_width,
                original_height=prepared.original_height,
                normalized_width=prepared.normalized_width,
                normalized_height=prepared.normalized_height,
                image_format=prepared.image_format,
                exif_orientation=prepared.exif_orientation,
                exif_transposed=prepared.exif_transposed,
                mirror_correction="client" if source_name == "camera" else "none",
                jpeg_quality=prepared.jpeg_quality if prepared.jpeg_quality is not None else INPUT_JPEG_QUALITY,
                crop_strategy=prepared.crop_strategy,
                model=resolved_tryon_model(),
                latency_ms=0,
                provider_error=exc.status,
                quality_result="not_run",
                quality_retries=0,
                output_width=width,
                output_height=height,
            )
        )
        raise
    jpeg, report, quality_retries, cost, estimated, latency_ms, model = _preserve_and_maybe_retry(
        original=prepared.payload,
        generated=jpeg,
        prompt=prompt,
        model=model,
        cost=cost,
        estimated=estimated,
        latency_ms=latency_ms,
        inference_images=images,
    )
    jpeg, report, quality_retries, cost, estimated, latency_ms, model, qc = _retry_if_hair_unchanged(
        original=prepared.payload,
        jpeg=jpeg,
        report=report,
        quality_retries=quality_retries,
        prompt=prompt,
        model=model,
        cost=cost,
        estimated=estimated,
        latency_ms=latency_ms,
        inference_images=images,
    )
    log_tryon_diagnostics(
        tryon_diagnostic_record(
            input_source=source_name or "unknown",
            original_width=prepared.original_width,
            original_height=prepared.original_height,
            normalized_width=prepared.normalized_width,
            normalized_height=prepared.normalized_height,
            image_format=prepared.image_format,
            exif_orientation=prepared.exif_orientation,
            exif_transposed=prepared.exif_transposed,
            mirror_correction="client" if source_name == "camera" else "none",
            jpeg_quality=prepared.jpeg_quality if prepared.jpeg_quality is not None else INPUT_JPEG_QUALITY,
            crop_strategy=prepared.crop_strategy,
            model=model,
            latency_ms=latency_ms,
            provider_error=None,
            quality_result=report.get("status"),
            quality_reason=report.get("reason"),
            quality_iou=report.get("iou"),
            quality_shift_px=report.get("shift_px"),
            face_restore_applied=bool(report.get("applied")),
            quality_retries=quality_retries,
            output_width=width,
            output_height=height,
            prompt_version=resolve_tryon_prompt_version(),
            qc_overall=qc.get("overall"),
            qc_hair_band_change=qc.get("hair_band_change_ratio"),
            qc_forehead_status=qc.get("forehead_status"),
            dual_reference=dual_reference_enabled(),
            catalog_reference_attached=include_catalog,
        )
    )
    return _result(
        preview=_publish(jpeg),
        prompt=prompt,
        model=model,
        cost=cost,
        estimated=estimated,
        latency_ms=latency_ms,
    )


def _apply_post_generation_preserve(original: bytes, generated: bytes) -> tuple[bytes, dict[str, Any]]:
    """Scene lock (hair-only edits) then inner-face restore when alignment allows."""
    working = generated
    scene_report: dict[str, Any] = {"status": "skipped", "applied": False}
    if _flag("TRYON_SCENE_LOCK", True):
        working, scene_report = preserve_hair_only_edit(original, working, apply=True)
    restore_enabled = _flag("TRYON_FACE_RESTORE", True)
    jpeg, face_report = preserve_face(original, working, apply=restore_enabled)
    if scene_report.get("applied"):
        face_report = {**face_report, "scene_lock": scene_report}
    return jpeg, face_report


def _retry_if_hair_unchanged(
    *,
    original: bytes,
    jpeg: bytes,
    report: dict[str, Any],
    quality_retries: int,
    prompt: str,
    model: str,
    cost: Decimal,
    estimated: bool,
    latency_ms: int,
    inference_images: list[bytes] | None,
) -> tuple[bytes, dict[str, Any], int, Decimal, bool, int, str, dict[str, Any]]:
    """If the first edit still looks like the selfie, run one stronger hair-transfer pass."""
    qc = assess_tryon_quality(original, jpeg, face_report=report)
    if quality_retries or qc.get("overall") != "low_hair_change":
        return jpeg, report, quality_retries, cost, estimated, latency_ms, model, qc
    if not _flag("TRYON_HAIR_CHANGE_RETRY", True):
        return jpeg, report, quality_retries, cost, estimated, latency_ms, model, qc

    retry_prompt = f"{prompt}\n\n{HAIR_CHANGE_RETRY_SUFFIX}"
    if len(retry_prompt) > PROMPT_MAX:
        logger.info("Hair-change retry skipped: prompt exceeds %s characters", PROMPT_MAX)
        return jpeg, report, quality_retries, cost, estimated, latency_ms, model, qc

    ref_images = list(inference_images) if inference_images else [original]
    width, height = _output_size_for_bytes(original, model)
    try:
        second, second_cost, second_estimated, second_latency = _infer_edit(
            prompt=retry_prompt,
            images=ref_images,
            model=model,
            width=width,
            height=height,
        )
    except AiStyleError:
        logger.warning("Hair-change retry failed; keeping the first try-on result")
        return jpeg, report, quality_retries, cost, estimated, latency_ms, model, qc

    second_jpeg, second_report = _apply_post_generation_preserve(original, second)
    second_qc = assess_tryon_quality(original, second_jpeg, face_report=second_report)
    first_ratio = qc.get("hair_band_change_ratio")
    second_ratio = second_qc.get("hair_band_change_ratio")
    first_score = first_ratio if isinstance(first_ratio, (int, float)) else -1
    second_score = second_ratio if isinstance(second_ratio, (int, float)) else -1
    if second_score >= first_score:
        jpeg, report, qc = second_jpeg, second_report, second_qc
    logger.info(
        "Hair-change retry kept=%s first_ratio=%s second_ratio=%s",
        "second" if second_score >= first_score else "first",
        first_ratio,
        second_ratio,
    )
    return (
        jpeg,
        report,
        quality_retries + 1,
        cost + second_cost,
        estimated or second_estimated,
        latency_ms + second_latency,
        model,
        qc,
    )


def _preserve_and_maybe_retry(
    *,
    original: bytes,
    generated: bytes,
    prompt: str,
    model: str,
    cost: Decimal,
    estimated: bool,
    latency_ms: int,
    inference_images: list[bytes] | None = None,
) -> tuple[bytes, dict[str, Any], int, Decimal, bool, int, str]:
    """One optional regeneration. A failed retry keeps the safer of the two results."""
    jpeg, report = _apply_post_generation_preserve(original, generated)
    retries = 0
    if report.get("status") != "failed" or not _flag("RUNWARE_TRYON_QUALITY_RETRY", False):
        return jpeg, report, retries, cost, estimated, latency_ms, model

    safer_prompt = f"{prompt}\n\n{SAFER_RETRY_SUFFIX}"
    if len(safer_prompt) > PROMPT_MAX:
        logger.info("Quality retry skipped: safer prompt exceeds %s characters", PROMPT_MAX)
        return jpeg, report, retries, cost, estimated, latency_ms, model

    ref_images = list(inference_images) if inference_images else [original]
    width, height = _output_size_for_bytes(original, model)
    try:
        second, second_cost, second_estimated, second_latency = _infer_edit(
            prompt=safer_prompt,
            images=ref_images,
            model=model,
            width=width,
            height=height,
        )
    except AiStyleError:
        logger.warning("Quality retry failed; keeping the first try-on result")
        return jpeg, report, retries, cost, estimated, latency_ms, model

    retries = 1
    second_jpeg, second_report = _apply_post_generation_preserve(original, second)
    first_score = report.get("iou") if isinstance(report.get("iou"), (int, float)) else -1
    second_score = second_report.get("iou") if isinstance(second_report.get("iou"), (int, float)) else -1
    if second_report.get("status") != "failed" or second_score >= first_score:
        jpeg, report = second_jpeg, second_report
    return (
        jpeg,
        report,
        retries,
        cost + second_cost,
        estimated or second_estimated,
        latency_ms + second_latency,
        model,
    )


def generate_tryon_rotated_view(
    *,
    front_data_url: str,
    view: str,
    audience: str,
    slug: str,
    title: str,
    side_anchor_data_urls: list[str] | None = None,
    selected_hair_color: str | None = None,
    queue_depth: int | None = None,
) -> TryOnResult:
    from ai.explore_views import normalize_explore_view

    tryon_provider_name()
    model = resolved_tryon_model()
    normalized = normalize_explore_view(view)
    if normalized == "front":
        return _result(
            preview=front_data_url,
            prompt="front_passthrough",
            model=model,
            cost=Decimal("0"),
            estimated=True,
            latency_ms=0,
        )

    style_detail = style_detail_for(audience, slug)
    prompt = _build_tryon_rotation_prompt(
        title=title,
        style_detail=style_detail,
        slug=slug,
        view=normalized,
        selected_hair_color=selected_hair_color,
    )
    images: list[bytes] = []
    for source in [front_data_url, *(side_anchor_data_urls or [])]:
        if not source:
            continue
        _mime, payload = load_image_bytes(source)
        images.append(payload)
    jpeg, cost, estimated, latency_ms, used_model = _infer_with_fallback(
        prompt=prompt,
        images=images,
        queue_depth=queue_depth,
    )
    return _result(
        preview=_publish(jpeg),
        prompt=prompt,
        model=used_model,
        cost=cost,
        estimated=estimated,
        latency_ms=latency_ms,
    )


def generate_tryon_multiview(
    *,
    front_data_url: str,
    audience: str,
    slug: str,
    title: str,
    selected_hair_color: str | None = None,
    queue_depth: int | None = None,
) -> dict[str, Any]:
    views: dict[str, str] = {"front": front_data_url}
    total_cost = Decimal("0")
    total_latency = 0
    model = ""
    provider = tryon_provider_name()
    prompts: list[str] = []
    estimated = False

    left = generate_tryon_rotated_view(
        front_data_url=front_data_url,
        view="left",
        audience=audience,
        slug=slug,
        title=title,
        selected_hair_color=selected_hair_color,
        queue_depth=queue_depth,
    )
    views["left"] = left.preview_image
    total_cost += left.cost_usd
    total_latency += left.latency_ms
    model, provider = left.model, left.provider
    prompts.append(left.prompt)
    estimated = estimated or left.tokens_estimated

    right = generate_tryon_rotated_view(
        front_data_url=front_data_url,
        view="right",
        audience=audience,
        slug=slug,
        title=title,
        side_anchor_data_urls=[left.preview_image],
        selected_hair_color=selected_hair_color,
        queue_depth=queue_depth,
    )
    views["right"] = right.preview_image
    total_cost += right.cost_usd
    total_latency += right.latency_ms
    prompts.append(right.prompt)
    estimated = estimated or right.tokens_estimated

    back = generate_tryon_rotated_view(
        front_data_url=front_data_url,
        view="back",
        audience=audience,
        slug=slug,
        title=title,
        side_anchor_data_urls=[left.preview_image, right.preview_image],
        selected_hair_color=selected_hair_color,
        queue_depth=queue_depth,
    )
    views["back"] = back.preview_image
    total_cost += back.cost_usd
    total_latency += back.latency_ms
    prompts.append(back.prompt)

    return {
        "views": views,
        "prompt": "\n---\n".join(prompts)[:4000],
        "model": model,
        "provider": provider,
        "prompt_tokens": 0,
        "candidates_tokens": 0,
        "thoughts_tokens": 0,
        "total_tokens": 0,
        "cost_usd": total_cost,
        "tokens_estimated": estimated,
        "latency_ms": total_latency,
    }
