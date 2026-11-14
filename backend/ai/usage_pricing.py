"""Gemini / Morf AI token va xarajat hisobi."""

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


# Runware FLUX.2 [klein] — published price is per image at 1024×1024, 4 steps.
# https://runware.ai/collections/family-flux
# Larger output is scaled by megapixels. The API `cost` field is the real bill
# when Runware returns it; this table is only the fallback.
RUNWARE_USD_PER_1024 = {
    "prunaai:2@1": Decimal("0.008800"),  # docs: P-Image-Edit reference-to-image from
    "bfl:flux@3-image-klein": Decimal("0.006000"),  # docs: 1024², 16 steps
    "runware:400@2": Decimal("0.000780"),  # FLUX.2 klein 9B
    "runware:400@6": Decimal("0.000780"),  # FLUX.2 klein 9B KV
    "runware:400@4": Decimal("0.000600"),  # FLUX.2 klein 4B
}
# Documented reference-to-image runs cost more than plain 1024² text edits.
RUNWARE_REFERENCE_SURCHARGE_PER_EXTRA_IMAGE = Decimal("0.002500")
_GEMINI_PROVIDERS = frozenset({"vertex", "studio", "gemini", "google"})
_ANALYZE_KINDS = frozenset({"analyze", "face_check", "ingredient"})
_VOICE_KINDS = frozenset({"voice_stt", "voice_tts"})


def runware_list_usd(model: str | None = None) -> Decimal:
    """Configured try-on output size × Runware list price. Not an API invoice."""
    width = int(getattr(settings, "RUNWARE_TRYON_WIDTH", 1024) or 1024)
    height = int(getattr(settings, "RUNWARE_TRYON_HEIGHT", 1024) or 1024)
    return estimate_tryon_request_usd(
        model=model or "",
        width=width,
        height=height,
        reference_count=1,
        steps=16,
    )


def tryon_cost_cap_usd() -> Decimal:
    raw = getattr(settings, "RUNWARE_TRYON_MAX_COST_USD", None)
    if raw is None or str(raw).strip() == "":
        return Decimal("0.009")
    try:
        value = Decimal(str(raw).strip())
    except Exception:
        return Decimal("0.009")
    if value <= 0:
        return Decimal("0.009")
    return value.quantize(USD_QUANT, rounding=ROUND_HALF_UP)


def estimate_tryon_request_usd(
    *,
    model: str,
    width: int,
    height: int,
    reference_count: int = 1,
    steps: int = 16,
) -> Decimal:
    """Conservative pre-flight estimate from Runware docs. API `cost` is authoritative."""
    key = (model or "").strip()
    base = RUNWARE_USD_PER_1024.get(key)
    if base is None:
        if key.startswith("prunaai:"):
            base = RUNWARE_USD_PER_1024["prunaai:2@1"]
        elif "flux@3-image-klein" in key:
            base = RUNWARE_USD_PER_1024["bfl:flux@3-image-klein"]
        elif "400@4" in key:
            base = RUNWARE_USD_PER_1024["runware:400@4"]
        else:
            base = RUNWARE_USD_PER_1024["runware:400@2"]
    w = max(128, int(width or 1024))
    h = max(128, int(height or 1024))
    pixels = Decimal(w * h)
    unit = pixels / Decimal(1024 * 1024)
    refs = max(1, int(reference_count or 1))
    if key.startswith("prunaai:"):
        step_scale = Decimal("1")
        surcharge = Decimal("0")
    else:
        step_scale = Decimal(max(1, int(steps or 16))) / Decimal("16")
        surcharge = RUNWARE_REFERENCE_SURCHARGE_PER_EXTRA_IMAGE * Decimal(max(0, refs - 1))
    total = base * unit * step_scale + surcharge
    return total.quantize(USD_QUANT, rounding=ROUND_HALF_UP)


def _as_cost(value: Any) -> Decimal:
    raw = value if isinstance(value, Decimal) else _dec(value, "0")
    if raw < 0:
        raw = Decimal("0")
    return raw.quantize(USD_QUANT, rounding=ROUND_HALF_UP)


def explain_usage_charge(
    *,
    kind: str,
    status: str,
    provider: str = "",
    model: str = "",
    cost_usd: Any = 0,
    total_tokens: int = 0,
    tokens_estimated: bool = False,
) -> dict[str, Any]:
    """Where this row's money went.

    Try-on images are Runware. A stored Gemini token estimate on an old try-on
    is replaced with the Runware list price. Analysis and chat stay on Gemini
    token rates, because those calls still hit Gemini.
    """
    kind_l = (kind or "").strip().lower()
    status_l = (status or "").strip().lower()
    provider_l = (provider or "").strip().lower()
    model_l = (model or "").strip()
    stored = _as_cost(cost_usd)
    tokens = max(0, int(total_tokens or 0))
    is_runware = (
        provider_l == "runware"
        or model_l.startswith("runware:")
        or model_l.startswith("bfl:flux@")
    )
    success = status_l == "success"

    def pack(
        shown: Decimal,
        *,
        charge_from: str,
        activity: str,
        price_basis: str,
        price_note: str,
    ) -> dict[str, Any]:
        shown_q = _as_cost(shown)
        return {
            "cost_usd": shown_q,
            "legacy_cost_usd": stored,
            "charge_from": charge_from,
            "activity": activity,
            "price_basis": price_basis,
            "price_note": price_note,
            "repriced": shown_q != stored,
        }

    if kind_l in ("tryon", "studio") and is_runware:
        if success and stored > 0 and not tokens_estimated:
            return pack(
                stored,
                charge_from="runware",
                activity="generatsiya" if kind_l == "tryon" else "studio",
                price_basis="runware_api",
                price_note="Runware API · rasm generatsiya",
            )
        if success:
            listed = runware_list_usd(model_l)
            return pack(
                listed,
                charge_from="runware",
                activity="generatsiya" if kind_l == "tryon" else "studio",
                price_basis="runware_list",
                price_note="Runware narxnoma · API cost kelmagan",
            )
        if stored > 0 and not tokens_estimated:
            return pack(
                stored,
                charge_from="runware",
                activity="generatsiya" if kind_l == "tryon" else "studio",
                price_basis="runware_api",
                price_note="Runware API · xato, lekin hisob yozilgan",
            )
        return pack(
            Decimal("0"),
            charge_from="none",
            activity="generatsiya" if kind_l == "tryon" else "studio",
            price_basis="unbilled",
            price_note="Pul olinmadi · Runware xato",
        )

    # Per-image bill with no token metadata is Runware even if provider was empty.
    if kind_l == "tryon" and tokens <= 0 and stored > 0 and not tokens_estimated:
        return pack(
            stored,
            charge_from="runware",
            activity="generatsiya",
            price_basis="runware_api",
            price_note="Runware API · rasm generatsiya",
        )

    if kind_l == "tryon" and success:
        listed = runware_list_usd(None)
        return pack(
            listed,
            charge_from="runware",
            activity="generatsiya",
            price_basis="runware_list",
            price_note="Runware narxnoma · eski Gemini token hisobi almashtirildi",
        )

    if kind_l == "tryon":
        if stored > 0 and (provider_l in _GEMINI_PROVIDERS or model_l.startswith("gemini") or tokens > 0):
            return pack(
                stored,
                charge_from="gemini",
                activity="generatsiya",
                price_basis="gemini_tokens",
                price_note="Gemini · try-on xato, saqlangan token hisobi",
            )
        return pack(
            Decimal("0"),
            charge_from="none",
            activity="generatsiya",
            price_basis="unbilled",
            price_note="Pul olinmadi · try-on xato",
        )

    if kind_l == "studio":
        if stored <= 0 and not success:
            return pack(
                Decimal("0"),
                charge_from="none",
                activity="studio",
                price_basis="unbilled",
                price_note="Pul olinmadi · studio xato",
            )
        return pack(
            stored,
            charge_from="gemini",
            activity="studio",
            price_basis="gemini_tokens",
            price_note="Gemini · studio rasm (token)",
        )

    if kind_l in _ANALYZE_KINDS:
        if stored <= 0 and not success:
            return pack(
                Decimal("0"),
                charge_from="none",
                activity="tahlil",
                price_basis="unbilled",
                price_note="Pul olinmadi · tahlil xato",
            )
        note = "Gemini · tahlil token"
        if not success and stored > 0:
            note = "Gemini · tahlil xato, token hisobi yozilgan"
        return pack(
            stored,
            charge_from="gemini",
            activity="tahlil",
            price_basis="gemini_tokens",
            price_note=note,
        )

    if kind_l == "chat":
        if stored <= 0 and not success:
            return pack(
                Decimal("0"),
                charge_from="none",
                activity="chat",
                price_basis="unbilled",
                price_note="Pul olinmadi · chat xato",
            )
        return pack(
            stored,
            charge_from="gemini",
            activity="chat",
            price_basis="gemini_tokens",
            price_note="Gemini · chat token",
        )

    if kind_l in _VOICE_KINDS:
        if stored <= 0 and not success:
            return pack(
                Decimal("0"),
                charge_from="none",
                activity="ovoz",
                price_basis="unbilled",
                price_note="Pul olinmadi · ovoz xato",
            )
        return pack(
            stored,
            charge_from="gemini",
            activity="ovoz",
            price_basis="gemini_tokens",
            price_note="Gemini · ovoz token",
        )

    if stored <= 0:
        return pack(
            Decimal("0"),
            charge_from="none",
            activity="boshqa",
            price_basis="unbilled",
            price_note="Pul olinmadi",
        )
    return pack(
        stored,
        charge_from="gemini" if provider_l in _GEMINI_PROVIDERS or not is_runware else "runware",
        activity="boshqa",
        price_basis="gemini_tokens",
        price_note="Saqlangan hisob",
    )


def billing_bucket(charge: dict[str, Any]) -> str:
    source = charge.get("charge_from")
    if source == "runware":
        return "runware"
    if source == "none":
        return "unbilled"
    activity = charge.get("activity")
    if activity == "tahlil":
        return "gemini_analyze"
    if activity == "chat":
        return "gemini_chat"
    if activity == "studio":
        return "gemini_studio"
    if activity == "ovoz":
        return "gemini_voice"
    return "gemini_other"


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
