"""Gemini / Vertex generateContent — rasm javobini ajratish."""

from __future__ import annotations

import base64
from typing import Any

from .gemini_style import AiStyleError


def extract_image_bytes(payload: dict[str, Any]) -> tuple[str, bytes]:
    candidates = payload.get("candidates") or []
    if not candidates:
        raise AiStyleError("AI rasm qaytarmadi.", 502)
    parts = (candidates[0].get("content") or {}).get("parts") or []
    for part in parts:
        if not isinstance(part, dict):
            continue
        inline = part.get("inlineData") or part.get("inline_data")
        if not inline:
            continue
        data = inline.get("data")
        if not data:
            continue
        mime = (inline.get("mimeType") or inline.get("mime_type") or "image/png").lower()
        try:
            raw = base64.b64decode(data, validate=True)
        except Exception as exc:
            raise AiStyleError("AI rasm dekod qilinmadi.", 502) from exc
        if raw:
            return mime, raw
    raise AiStyleError("AI rasm qaytarmadi.", 502)


def to_data_url(mime: str, raw: bytes) -> str:
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"
