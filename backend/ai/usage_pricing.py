"""Gemini / Morph AI token va xarajat hisobi."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.conf import settings

# Google AI Studio / Vertex — Gemini 3.1 Flash-Lite Image (try-on)
# https://ai.google.dev/gemini-api/docs/pricing
DEFAULT_IMAGE_INPUT_PER_1M = Decimal("0.25")
DEFAULT_IMAGE_TEXT_OUT_PER_1M = Decimal("1.50")
DEFAULT_IMAGE_OUT_PER_1M = Decimal("30.00")

# Gemini 2.5 Flash — style analyze / face-check
DEFAULT_VISION_INPUT_PER_1M = Decimal("0.30")
DEFAULT_VISION_OUTPUT_PER_1M = Decimal("2.50")

# Gemini 2.5 Flash-Lite — Morf AI chat (arzon)
DEFAULT_CHAT_INPUT_PER_1M = Decimal("0.10")
DEFAULT_CHAT_OUTPUT_PER_1M = Decimal("0.40")
DEFAULT_USD_TO_UZS = Decimal("11857")

# usageMetadata yo'q bo'lsa — taxminiy tokenlar (1K image ≈ 1120 token)
FALLBACK_IMAGE_INPUT_TOKENS = 1120
FALLBACK_IMAGE_OUTPUT_TOKENS = 1120
FALLBACK_VISION_PROMPT_TOKENS = 800
FALLBACK_VISION_OUTPUT_TOKENS = 200
FALLBACK_CHAT_PROMPT_TOKENS = 800
FALLBACK_CHAT_OUTPUT_TOKENS = 400

USD_QUANT = Decimal("0.000001")


def _dec(value: Any, default: str) -> Decimal:
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def image_rates() -> tuple[Decimal, Decimal, Decimal]:
    return (
        _dec(getattr(settings, "AI_IMAGE_INPUT_USD_PER_1M", None), str(DEFAULT_IMAGE_INPUT_PER_1M)),
        _dec(getattr(settings, "AI_IMAGE_TEXT_OUT_USD_PER_1M", None), str(DEFAULT_IMAGE_TEXT_OUT_PER_1M)),
        _dec(getattr(settings, "AI_IMAGE_OUT_USD_PER_1M", None), str(DEFAULT_IMAGE_OUT_PER_1M)),
    )


def vision_rates() -> tuple[Decimal, Decimal]:
    return (
        _dec(getattr(settings, "AI_VISION_INPUT_USD_PER_1M", None), str(DEFAULT_VISION_INPUT_PER_1M)),
        _dec(getattr(settings, "AI_VISION_OUTPUT_USD_PER_1M", None), str(DEFAULT_VISION_OUTPUT_PER_1M)),
    )


def chat_rates() -> tuple[Decimal, Decimal]:
    return (
        _dec(getattr(settings, "AI_CHAT_INPUT_USD_PER_1M", None), str(DEFAULT_CHAT_INPUT_PER_1M)),
        _dec(getattr(settings, "AI_CHAT_OUTPUT_USD_PER_1M", None), str(DEFAULT_CHAT_OUTPUT_PER_1M)),
    )


def usd_to_uzs(cost_usd: Decimal | float | str | None) -> int:
    rate = _dec(getattr(settings, "AI_USD_TO_UZS", None), str(DEFAULT_USD_TO_UZS))
    raw = cost_usd if isinstance(cost_usd, Decimal) else _dec(cost_usd, "0")
    return int((raw * rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def extract_usage_tokens(payload: dict[str, Any] | None) -> dict[str, int]:
    """Gemini generateContent usageMetadata dan tokenlarni o'qiydi."""
    meta = (payload or {}).get("usageMetadata") or (payload or {}).get("usage_metadata") or {}
    if not isinstance(meta, dict):
        meta = {}

    def _int(key: str, *alts: str) -> int:
        for k in (key, *alts):
            raw = meta.get(k)
            if raw is None:
                continue
            try:
                return max(0, int(raw))
            except (TypeError, ValueError):
                continue
        return 0

    prompt = _int("promptTokenCount", "prompt_token_count")
    candidates = _int("candidatesTokenCount", "candidates_token_count")
    thoughts = _int("thoughtsTokenCount", "thoughts_token_count")
    total = _int("totalTokenCount", "total_token_count")
    if total <= 0:
        total = prompt + candidates + thoughts
    return {
        "prompt_tokens": prompt,
        "candidates_tokens": candidates,
        "thoughts_tokens": thoughts,
        "total_tokens": total,
    }


def estimate_image_tokens(*, input_images: int = 1) -> dict[str, int]:
    prompt = FALLBACK_IMAGE_INPUT_TOKENS * max(1, input_images) + 200
    candidates = FALLBACK_IMAGE_OUTPUT_TOKENS
    return {
        "prompt_tokens": prompt,
        "candidates_tokens": candidates,
        "thoughts_tokens": 0,
        "total_tokens": prompt + candidates,
        "estimated": True,
    }


def estimate_vision_tokens() -> dict[str, int]:
    prompt = FALLBACK_VISION_PROMPT_TOKENS
    candidates = FALLBACK_VISION_OUTPUT_TOKENS
    return {
        "prompt_tokens": prompt,
        "candidates_tokens": candidates,
        "thoughts_tokens": 0,
        "total_tokens": prompt + candidates,
        "estimated": True,
    }


def estimate_chat_tokens() -> dict[str, int]:
    prompt = FALLBACK_CHAT_PROMPT_TOKENS
    candidates = FALLBACK_CHAT_OUTPUT_TOKENS
    return {
        "prompt_tokens": prompt,
        "candidates_tokens": candidates,
        "thoughts_tokens": 0,
        "total_tokens": prompt + candidates,
        "estimated": True,
    }


def _chars_to_tokens(n: int) -> int:
    """Lotin matn: ~4 belgi = 1 token. Haqiqiy usageMetadata yo'q bo'lganda."""
    return max(1, (max(0, int(n or 0)) + 3) // 4)


def estimate_chat_tokens_from_text(*, prompt_chars: int, reply_chars: int) -> dict[str, int]:
    """Haqiqiy matn uzunligidan taxmin — qat'iy 1200 token o'rniga."""
    prompt = _chars_to_tokens(prompt_chars)
    candidates = _chars_to_tokens(reply_chars)
    return {
        "prompt_tokens": prompt,
        "candidates_tokens": candidates,
        "thoughts_tokens": 0,
        "total_tokens": prompt + candidates,
        "estimated": True,
    }


def merge_usage_tokens(*payloads: dict[str, Any] | None) -> dict[str, int]:
    """SSE chunk'lardagi usageMetadata — har maydon uchun eng katta qiymat."""
    merged = {
        "prompt_tokens": 0,
        "candidates_tokens": 0,
        "thoughts_tokens": 0,
        "total_tokens": 0,
    }
    for payload in payloads:
        if not payload:
            continue
        row = extract_usage_tokens(payload)
        for key in merged:
            if row[key] > merged[key]:
                merged[key] = row[key]
    if merged["total_tokens"] <= 0:
        merged["total_tokens"] = (
            merged["prompt_tokens"] + merged["candidates_tokens"] + merged["thoughts_tokens"]
        )
    return merged


def cost_usd_for_image(
    *,
    prompt_tokens: int,
    candidates_tokens: int,
    thoughts_tokens: int = 0,
) -> Decimal:
    inp, text_out, img_out = image_rates()
    # Image model: chiqishning asosiy qismi rasm tokenlari ($30/1M).
    # Text/thinking chiqishi kam bo'lsa ham text_out stavkasida hisoblanadi —
    # candidates ni image output deb olamiz (try-on faqat IMAGE modality).
    input_cost = (Decimal(prompt_tokens) / Decimal(1_000_000)) * inp
    image_cost = (Decimal(candidates_tokens) / Decimal(1_000_000)) * img_out
    think_cost = (Decimal(thoughts_tokens) / Decimal(1_000_000)) * text_out
    return (input_cost + image_cost + think_cost).quantize(USD_QUANT, rounding=ROUND_HALF_UP)


def cost_usd_for_vision(
    *,
    prompt_tokens: int,
    candidates_tokens: int,
    thoughts_tokens: int = 0,
) -> Decimal:
    inp, out = vision_rates()
    input_cost = (Decimal(prompt_tokens) / Decimal(1_000_000)) * inp
    output_cost = (Decimal(candidates_tokens + thoughts_tokens) / Decimal(1_000_000)) * out
    return (input_cost + output_cost).quantize(USD_QUANT, rounding=ROUND_HALF_UP)


def cost_usd_for_chat(
    *,
    prompt_tokens: int,
    candidates_tokens: int,
    thoughts_tokens: int = 0,
) -> Decimal:
    inp, out = chat_rates()
    input_cost = (Decimal(prompt_tokens) / Decimal(1_000_000)) * inp
    output_cost = (Decimal(candidates_tokens + thoughts_tokens) / Decimal(1_000_000)) * out
    return (input_cost + output_cost).quantize(USD_QUANT, rounding=ROUND_HALF_UP)


def finalize_usage(
    payload: dict[str, Any] | None,
    *,
    kind: str,
    input_images: int = 1,
    extra_payloads: list[dict[str, Any]] | None = None,
    prompt_chars: int = 0,
    reply_chars: int = 0,
) -> dict[str, Any]:
    """Token + cost dict — API payload yoki matnga asoslangan taxmin."""
    if extra_payloads:
        tokens = merge_usage_tokens(payload, *extra_payloads)
    else:
        tokens = extract_usage_tokens(payload)
    estimated = False
    if tokens["total_tokens"] <= 0:
        if kind in ("tryon", "studio"):
            tokens = estimate_image_tokens(input_images=input_images)
        elif kind == "chat":
            if prompt_chars or reply_chars:
                tokens = estimate_chat_tokens_from_text(
                    prompt_chars=prompt_chars,
                    reply_chars=reply_chars,
                )
            else:
                tokens = estimate_chat_tokens()
        else:
            tokens = estimate_vision_tokens()
        estimated = bool(tokens.pop("estimated", True))

    if kind in ("tryon", "studio"):
        cost = cost_usd_for_image(
            prompt_tokens=tokens["prompt_tokens"],
            candidates_tokens=tokens["candidates_tokens"],
            thoughts_tokens=tokens["thoughts_tokens"],
        )
    elif kind == "chat":
        cost = cost_usd_for_chat(
            prompt_tokens=tokens["prompt_tokens"],
            candidates_tokens=tokens["candidates_tokens"],
            thoughts_tokens=tokens["thoughts_tokens"],
        )
    else:
        cost = cost_usd_for_vision(
            prompt_tokens=tokens["prompt_tokens"],
            candidates_tokens=tokens["candidates_tokens"],
            thoughts_tokens=tokens["thoughts_tokens"],
        )

    return {
        "prompt_tokens": tokens["prompt_tokens"],
        "candidates_tokens": tokens["candidates_tokens"],
        "thoughts_tokens": tokens["thoughts_tokens"],
        "total_tokens": tokens["total_tokens"],
        "cost_usd": cost,
        "tokens_estimated": estimated,
    }
