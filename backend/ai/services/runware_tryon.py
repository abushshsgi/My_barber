"""Morf AI Try-On via Runware image editing.

Primary: FLUX.2 [klein] 9B, AIR ``runware:400@2``.
If it is full or down, the same request tries ``runware:400@6`` (9B KV),
then ``runware:400@4`` (4B). All three list Edit and ``inputs.referenceImages``
(1–4 images). Width and height are 128–2048, step 16. 1024×1024 is valid.

Try-On never falls back to Gemini image APIs.
"""

from __future__ import annotations

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

logger = logging.getLogger(__name__)

PUBLIC_ROOT = Path(settings.BASE_DIR).parent / "apps" / "user" / "public"

# Verified against Runware docs on 2026-11-07. Do not add a model here
# unless its page lists Edit (or image-to-image) and reference image input.
VERIFIED_EDIT_MODELS: dict[str, dict[str, int]] = {
    # FLUX.2 [klein] 9B
    "runware:400@2": {
        "min_edge": 128,
        "max_edge": 2048,
        "step": 16,
        "max_references": 4,
    },
    # FLUX.2 [klein] 9B KV — multi-reference edit, faster when the first model is full
    "runware:400@6": {
        "min_edge": 128,
        "max_edge": 2048,
        "step": 16,
        "max_references": 4,
    },
    # FLUX.2 [klein] 4B — low-latency edit
    "runware:400@4": {
        "min_edge": 128,
        "max_edge": 2048,
        "step": 16,
        "max_references": 4,
    },
}

INPUT_MAX_EDGE = 1536
INPUT_JPEG_QUALITY = 88
RESULT_JPEG_QUALITY = 92
PORTRAIT_RATIO = 4 / 3  # height / width — soch toji qirqilmasin
# seedImage strength: past = yuz saqlanadi, yuqori = soch erkin o'zgaradi.
TRYON_STRENGTH = 0.34
TRYON_STEPS = 8
TRYON_CFG = 2.2


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


def snap_dimension(value: int, *, step: int = 16, lo: int = 128, hi: int = 2048) -> int:
    snapped = (max(lo, min(hi, int(value))) // step) * step
    if snapped < lo:
        snapped = lo
    return min(snapped, hi)


_DEFAULT_MODEL_SPEC = {"min_edge": 128, "max_edge": 2048, "step": 16, "max_references": 4}


def resolved_tryon_model() -> str:
    model = (getattr(settings, "RUNWARE_TRYON_MODEL", None) or "runware:400@2").strip()
    if model not in VERIFIED_EDIT_MODELS:
        raise AiStyleError(
            "RUNWARE_TRYON_MODEL Try-On uchun tasdiqlanmagan. "
            "Image editing modeli kerak (runware:400@2 — FLUX.2 klein 9B).",
            503,
            retryable=False,
        )
    return model


def tryon_model_chain() -> list[str]:
    """Asosiy model, keyin zaxira modellar. Ko'pi bilan 4 ta."""
    primary = resolved_tryon_model()
    raw = getattr(settings, "RUNWARE_TRYON_FALLBACK_MODELS", "") or ""
    extras = [part.strip() for part in str(raw).split(",") if part.strip() and part.strip() != primary]
    return [primary, *extras][:4]


def _model_spec(model: str) -> dict[str, int]:
    return VERIFIED_EDIT_MODELS.get(model) or _DEFAULT_MODEL_SPEC


def resolved_tryon_size(model: str | None = None) -> tuple[int, int]:
    spec = _model_spec(model or resolved_tryon_model())
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


def _pad_selfie_for_hair(raw: bytes) -> bytes:
    """Add top headroom so hair is not cropped. Do not stretch face pixels."""
    try:
        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        if image.mode != "RGB":
            image = image.convert("RGB")
    except Exception:
        return raw
    src_w, src_h = image.size
    if src_w < 1 or src_h < 1:
        return raw
    min_h = int(src_w * PORTRAIT_RATIO)
    extra_top = max(int(src_h * 0.1), max(0, min_h - src_h))
    if extra_top <= 0:
        return raw
    fill = image.getpixel((src_w // 2, 0))
    canvas = Image.new("RGB", (src_w, src_h + extra_top), fill)
    canvas.paste(image, (0, extra_top))
    buffer = BytesIO()
    canvas.save(buffer, format="JPEG", quality=INPUT_JPEG_QUALITY, optimize=True)
    return buffer.getvalue() or raw


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


_RECOLOR_MARKERS = (
    "balayage",
    "highlight",
    "blonde",
    "platinum",
    "bleach",
    "dye",
    "color",
    "rang",
    "sariq",
    "qora soch",
)


def _style_requests_recolor(title: str, style_detail: str) -> bool:
    blob = f"{title} {style_detail}".lower()
    return any(marker in blob for marker in _RECOLOR_MARKERS)


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


def store_tryon_jpeg(raw: bytes) -> str:
    """Save validated JPEG bytes in DatabaseMediaStorage (or the active storage)."""
    if not raw or not raw.startswith(b"\xff\xd8\xff"):
        raise AiStyleError("Try-on rasm qaytarmadi. Qayta urinib ko'ring.", 502, retryable=True)
    if len(raw) > 8 * 1024 * 1024:
        raise AiStyleError("Natija rasmi juda katta.", 502, retryable=False)
    from media_store.utils import save_media_bytes

    rel = f"ai-style/tryon-results/{timezone.now():%Y/%m}/{uuid.uuid4().hex}.jpg"
    save_media_bytes(rel, raw, content_type="image/jpeg")
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


def _build_tryon_prompt(*, title: str, style_detail: str) -> str:
    color_lock = (
        ""
        if _style_requests_recolor(title, style_detail)
        else (
            "Keep this person's original hair color, undertone, and natural variation. "
            "Do not dye, bleach, or add highlights. "
        )
    )
    return (
        "Photorealistic img2img edit of the seed photograph. "
        "The seed image and reference image 1 are the same unaltered selfie of the real client. "
        "Copy the face from the seed pixels: same person, same face, same face shape, "
        "jawline, cheekbones, bone structure, eyes, eyebrows, nose, mouth, ears, "
        "skin texture, skin tone, age, expression, pose, head position, camera angle, "
        "framing, clothing, and background. "
        "Do not generate a new face, do not beautify, slim, reshape, warp, or replace "
        "the identity. The result must look like this exact person after a barber visit. "
        "Edit only the hair on the scalp and around the ears. "
        f'Change only the haircut on this same head to "{title}" — {style_detail}. '
        f"{color_lock}"
        "Keep the requested hairstyle silhouette, length, volume, parting, and strand "
        "direction intact. Do not melt, stretch, collapse, crop, or warp the hair. "
        "Leave space above the crown so the full hair shape is visible. "
        "The new hair must sit on this person's real scalp and follow their real hairline. "
        "No different person, no sample-model face, no text, watermark, or extra people."
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


def _build_tryon_rotation_prompt(*, title: str, style_detail: str, slug: str, view: str) -> str:
    from ai.explore_views import view_pose_line

    pose = view_pose_line(view)
    side = _side_consistency_hint(slug=slug, view=view)
    side_block = f" {side}" if side else ""
    return (
        "Edit reference image 1. It already shows the client's finished hairstyle "
        f'"{title}" — {style_detail}. Re-render the same person and the same haircut '
        f"from this camera angle only: {pose}.{side_block} "
        "Any later reference images are angle anchors of the same person and the same haircut. "
        "Keep identity, skin tone, age, facial features, haircut, hair color, clothing, and background. "
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
    started = time.perf_counter()
    result = run_image_inference(
        {
            "model": model,
            "positivePrompt": prompt[:10000],
            "negativePrompt": (
                "different person, identity change, new face, swapped face, sample model face, "
                "changed face shape, changed jawline, warped face, beautified face, "
                "regenerated face, slimmed face, morphed identity, changed skin tone, "
                "changed expression, changed clothes, changed background, extra people, "
                "warped hair, melted hair, distorted hair, collapsed hairstyle, stretched hair, "
                "misshapen haircut, text, watermark, logo, cartoon, plastic skin, blurry"
            ),
            "width": width,
            "height": height,
            "steps": TRYON_STEPS,
            "CFGScale": TRYON_CFG,
            "seedImage": references[0],
            "strength": TRYON_STRENGTH,
            "inputs": {"referenceImages": references},
        }
    )
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
        "Runware try-on done model=%s latency_ms=%s cost_usd=%s bytes=%s refs=%s",
        model,
        latency_ms,
        cost if not estimated else "unknown",
        len(jpeg),
        len(references),
    )
    return jpeg, cost, estimated, latency_ms


def _switch_to_next_model(exc: AiStyleError) -> bool:
    """To'lgan yoki tushgan modelni tashlab, keyingi modelga o'tish."""
    if exc.status in (429, 502, 503, 504):
        return True
    message = (exc.message or "").lower()
    return exc.status == 400 and "model" in message


def _infer_with_fallback(
    *,
    prompt: str,
    images: list[bytes],
) -> tuple[bytes, Decimal, bool, int, str]:
    chain = tryon_model_chain()
    last: AiStyleError | None = None
    source = images[0] if images else b""
    for index, model in enumerate(chain):
        width, height = _output_size_for_bytes(source, model)
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
            if index >= len(chain) - 1 or not _switch_to_next_model(exc):
                raise
            logger.warning(
                "Try-on model busy model=%s status=%s next=%s",
                model,
                exc.status,
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


def generate_tryon_preview(
    *,
    selfie_data_url: str,
    audience: str,
    slug: str,
    title: str,
    reference_image_url: str | None = None,
) -> TryOnResult:
    tryon_provider_name()
    resolved_tryon_model()
    _mime, selfie = load_image_bytes(selfie_data_url)
    selfie = _pad_selfie_for_hair(selfie)
    style_detail = style_detail_for(audience, slug)
    images = [selfie]
    # Catalog hairstyle photos are other people. FLUX.2 treats extra references as
    # identity sources, so a second face leaks into the result. Hair is text-only.
    prompt = _build_tryon_prompt(title=title, style_detail=style_detail)
    jpeg, cost, estimated, latency_ms, model = _infer_with_fallback(prompt=prompt, images=images)
    return _result(
        preview=_publish(jpeg),
        prompt=prompt,
        model=model,
        cost=cost,
        estimated=estimated,
        latency_ms=latency_ms,
    )


def generate_tryon_rotated_view(
    *,
    front_data_url: str,
    view: str,
    audience: str,
    slug: str,
    title: str,
    side_anchor_data_urls: list[str] | None = None,
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
    )
    images: list[bytes] = []
    for source in [front_data_url, *(side_anchor_data_urls or [])]:
        if not source:
            continue
        _mime, payload = load_image_bytes(source)
        images.append(payload)
    jpeg, cost, estimated, latency_ms, used_model = _infer_with_fallback(prompt=prompt, images=images)
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
