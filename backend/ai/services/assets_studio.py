"""Brand / marketing rasmlar — logo, banner, hero shablonlari (Explore Gen secret)."""

from __future__ import annotations

import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from django.conf import settings
from PIL import Image

from ai.services.gemini_style import AiStyleError
from ai.services.image_response import extract_image_bytes
from ai.services.vertex_image import generate_image_content, image_generation_configured
from ai.services.studio_image import image_generation_provider

logger = logging.getLogger(__name__)

WEBP_QUALITY = 92
LIBRARY_FILENAME = "assets_studio_library.json"

# Gemini imageConfig aspectRatio values
ASSET_TEMPLATES: dict[str, dict[str, Any]] = {
    "logo_user": {
        "id": "logo_user",
        "label": "User app logo",
        "category": "logo",
        "audience": "user",
        "description": "mysaloon.uz mijoz ilovasi uchun logo / wordmark",
        "aspect_ratio": "1:1",
        "width": 1024,
        "height": 1024,
        "suggested_use": "PWA icon, favicon, header brand",
        "prompt": """You are a brand identity designer for mysaloon.uz — a modern men's grooming / barber booking app in Uzbekistan.

Create ONE clean app logo mark for the CLIENT (user) app.

Brand name: mysaloon
Mood: trustworthy, fresh, urban grooming — not luxury jewelry, not generic purple AI gradients.
Style: minimal geometric mark OR elegant monogram "S" / "MS" that works at small sizes.
Prefer a solid or soft gradient background suitable as an app icon, OR transparent-feeling solid color field.
No photorealistic people. No clutter. No mockups of phones. No extra text except optional subtle "mysaloon" wordmark if it stays crisp at 64px.

Output a single square logo image, centered, high contrast, production-ready.""",
    },
    "logo_partner": {
        "id": "logo_partner",
        "label": "Partner app logo",
        "category": "logo",
        "audience": "partner",
        "description": "Partner / sartarosh kabineti uchun logo",
        "aspect_ratio": "1:1",
        "width": 1024,
        "height": 1024,
        "suggested_use": "Partner PWA icon, partner header",
        "prompt": """You are a brand identity designer for MySaloon Partner — the barber/salon business app (partner.mysaloon.uz).

Create ONE clean app logo mark for the PARTNER dashboard.

Brand: MySaloon Partner
Mood: professional ops tool — clarity, scissors/salon craft without cliché clipart overload.
Differentiate slightly from the consumer mysaloon logo (more tools/pro feel) while staying in the same family.
Minimal geometric mark. Works as app icon. No people photos. No dashboard UI mockup. Optional short "Partner" subtitle only if still crisp small.

Output a single square logo, centered, production-ready.""",
    },
    "home_banner": {
        "id": "home_banner",
        "label": "Home banner",
        "category": "banner",
        "audience": "user",
        "description": "Desktop home hero / bazaar carousel fon rasmi",
        "aspect_ratio": "16:9",
        "width": 1600,
        "height": 900,
        "suggested_use": "Home hero slides",
        "prompt": """You are a commercial photographer for mysaloon.uz home page banners.

Create ONE cinematic wide banner photo of a modern barbershop / men's grooming atmosphere in Central Asia / Tashkent vibe:
- Shallow depth of field, warm practical lights, clean chairs, mirrors
- NO readable text, NO logos, NO watermarks, NO UI overlays
- Leave visual breathing room on the left/right third for future text overlays
- Photorealistic, premium but approachable — not stock-cliché blue gloves close-up only
- Horizontal 16:9 framing

Output a single hero banner photograph.""",
    },
    "home_banner_offers": {
        "id": "home_banner_offers",
        "label": "Aksiya banner",
        "category": "banner",
        "audience": "user",
        "description": "Takliflar / aksiyalar uchun banner",
        "aspect_ratio": "16:9",
        "width": 1600,
        "height": 900,
        "suggested_use": "Offers / promos carousel",
        "prompt": """Create ONE wide promotional banner background for a barber-booking app offers page.

Mood: energetic grooming deal — neat fade reveal, clean salon spotlight — without looking like spammy flash sale.
NO text, NO percentages, NO logos, NO stickers on the image.
Soft bokeh, 16:9, room for typography overlay later.
Photorealistic, tasteful.""",
    },
    "ai_style_hero_men": {
        "id": "ai_style_hero_men",
        "label": "AI Style hero (men)",
        "category": "hero",
        "audience": "user",
        "description": "Morph AI / AI stil sahifasi — erkaklar hero",
        "aspect_ratio": "3:4",
        "width": 900,
        "height": 1200,
        "suggested_use": "ai-style hero-men",
        "prompt": """Create ONE vertical lifestyle portrait for an AI hairstyle try-on landing page (men).

Young adult man, sharp modern fade, confident look, studio-quality lighting.
Soft neutral background. Shoulders up. Photorealistic.
NO text, NO AR glasses UI chrome, NO watermarks.
3:4 vertical composition.""",
    },
    "ai_style_hero_women": {
        "id": "ai_style_hero_women",
        "label": "AI Style hero (women)",
        "category": "hero",
        "audience": "user",
        "description": "Morph AI / AI stil sahifasi — ayollar hero",
        "aspect_ratio": "3:4",
        "width": 900,
        "height": 1200,
        "suggested_use": "ai-style hero-women",
        "prompt": """Create ONE vertical lifestyle portrait for an AI hairstyle try-on landing page (women).

Young adult woman, modern salon-ready hair, natural confidence, soft studio light.
Neutral background. Shoulders up. Photorealistic.
NO text, NO UI overlays, NO watermarks.
3:4 vertical composition.""",
    },
    "og_share": {
        "id": "og_share",
        "label": "Open Graph / share",
        "category": "social",
        "audience": "both",
        "description": "Ijtimoiy tarmoq / link preview rasmi",
        "aspect_ratio": "16:9",
        "width": 1200,
        "height": 675,
        "suggested_use": "og:image",
        "prompt": """Create ONE social share preview image for mysaloon.uz (Open Graph).

Show a polished barbershop booking brand vibe: modern salon interior abstract + subtle grooming cue.
NO long paragraphs of text. At most a very short tasteful "mysaloon" wordmark if legible.
16:9, high contrast, works small in chat previews.""",
    },
    "app_icon": {
        "id": "app_icon",
        "label": "App icon (512)",
        "category": "logo",
        "audience": "user",
        "description": "PWA / mobil ikonka — qirralari yaxshi o'qiladi",
        "aspect_ratio": "1:1",
        "width": 512,
        "height": 512,
        "suggested_use": "icon-512.png",
        "prompt": """Design a mobile app icon for mysaloon (barber booking).

Simple bold symbol centered on a solid or soft gradient tile.
Must remain readable at 48px. Avoid thin lines. No photos of people. No tiny text.
Square full-bleed icon composition (safe margins from edges).""",
    },
    "custom": {
        "id": "custom",
        "label": "Erkin (custom)",
        "category": "custom",
        "audience": "both",
        "description": "O'zingiz prompt yozing — istalgan marketing rasm",
        "aspect_ratio": "16:9",
        "width": 1600,
        "height": 900,
        "suggested_use": "misc marketing",
        "prompt": """Create a high-quality marketing image for the mysaloon.uz grooming/booking platform.
Follow the user's extra instructions carefully.
NO watermarks. Production-ready.""",
    },
}


def list_templates() -> list[dict[str, Any]]:
    return [
        {
            "id": t["id"],
            "label": t["label"],
            "category": t["category"],
            "audience": t["audience"],
            "description": t["description"],
            "aspect_ratio": t["aspect_ratio"],
            "width": t["width"],
            "height": t["height"],
            "suggested_use": t["suggested_use"],
            "default_prompt": t["prompt"],
        }
        for t in ASSET_TEMPLATES.values()
    ]


def _media_root() -> Path:
    return Path(settings.MEDIA_ROOT)


def _library_path() -> Path:
    return _media_root() / LIBRARY_FILENAME


def _assets_dir() -> Path:
    return _media_root() / "assets_studio"


def _load_library() -> dict[str, Any]:
    path = _library_path()
    if not path.is_file():
        return {"items": [], "updated_at": None}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"items": [], "updated_at": None}
    if not isinstance(data, dict):
        return {"items": [], "updated_at": None}
    items = data.get("items")
    if not isinstance(items, list):
        items = []
    return {"items": items, "updated_at": data.get("updated_at")}


def _save_library(items: list[dict[str, Any]]) -> None:
    path = _library_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "items": items,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip().lower()).strip("-")
    return cleaned[:48] or "asset"


def _item_file_path(item: dict[str, Any]) -> Path:
    rel = str(item.get("relative_path") or "")
    return _media_root() / rel


def _public_media_url(relative_path: str) -> str:
    base = (getattr(settings, "MEDIA_URL", "/media/") or "/media/").rstrip("/")
    return f"{base}/{relative_path.lstrip('/')}"


def _download_path(asset_id: str) -> str:
    return f"/api/v1/ai/dev/explore-gen/assets/download/?id={asset_id}"


def _enrich_item(item: dict[str, Any]) -> dict[str, Any]:
    path = _item_file_path(item)
    exists = path.is_file()
    return {
        **item,
        "exists": exists,
        "public_url": _public_media_url(item["relative_path"]) if exists else None,
        "download_path": _download_path(str(item["id"])),
    }


def list_assets(*, template_id: str | None = None, selected_only: bool = False) -> list[dict[str, Any]]:
    items = _load_library()["items"]
    out: list[dict[str, Any]] = []
    for raw in items:
        if not isinstance(raw, dict) or not raw.get("id"):
            continue
        if template_id and raw.get("template_id") != template_id:
            continue
        if selected_only and not raw.get("selected"):
            continue
        out.append(_enrich_item(raw))
    out.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return out


def get_asset(asset_id: str) -> dict[str, Any] | None:
    for item in _load_library()["items"]:
        if isinstance(item, dict) and str(item.get("id")) == str(asset_id):
            return _enrich_item(item)
    return None


def asset_bytes(asset_id: str) -> tuple[Path, bytes]:
    item = get_asset(asset_id)
    if not item:
        raise FileNotFoundError(asset_id)
    path = _item_file_path(item)
    if not path.is_file():
        raise FileNotFoundError(asset_id)
    return path, path.read_bytes()


def set_asset_selected(*, asset_id: str, selected: bool) -> dict[str, Any]:
    lib = _load_library()
    items = lib["items"]
    found = None
    for item in items:
        if isinstance(item, dict) and str(item.get("id")) == str(asset_id):
            item["selected"] = bool(selected)
            found = item
            break
    if found is None:
        raise FileNotFoundError(asset_id)
    _save_library(items)
    return _enrich_item(found)


def _build_prompt(template: dict[str, Any], extra: str) -> str:
    base = str(template["prompt"]).strip()
    note = (extra or "").strip()
    if note:
        return f"{base}\n\nAdditional direction from operator:\n{note}"
    return base


def _image_body(*, prompt: str, aspect_ratio: str) -> dict[str, Any]:
    return {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect_ratio},
        },
    }


def _save_resized(raw: bytes, dest: Path, *, width: int, height: int) -> None:
    img = Image.open(BytesIO(raw)).convert("RGB")
    img = img.resize((width, height), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=WEBP_QUALITY)


def generate_asset(
    *,
    template_id: str,
    prompt_extra: str = "",
    aspect_ratio: str | None = None,
) -> dict[str, Any]:
    template = ASSET_TEMPLATES.get((template_id or "").strip())
    if not template:
        raise AiStyleError("Noma'lum shablon (template_id).", 400)
    if not image_generation_configured():
        raise AiStyleError(
            "Rasm generatsiya sozlanmagan. Vertex (VERTEX_*) yoki GEMINI_API_KEY qo'ying.",
            503,
        )

    ratio = (aspect_ratio or template["aspect_ratio"]).strip() or template["aspect_ratio"]
    prompt = _build_prompt(template, prompt_extra)
    started = time.monotonic()

    payload = generate_image_content(_image_body(prompt=prompt, aspect_ratio=ratio))
    _mime, raw = extract_image_bytes(payload)

    asset_id = uuid.uuid4().hex[:12]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"{stamp}_{_slugify(template_id)}_{asset_id}.webp"
    relative = f"assets_studio/{template_id}/{filename}"
    dest = _media_root() / relative
    _save_resized(raw, dest, width=int(template["width"]), height=int(template["height"]))

    item = {
        "id": asset_id,
        "template_id": template_id,
        "template_label": template["label"],
        "category": template["category"],
        "audience": template["audience"],
        "aspect_ratio": ratio,
        "width": template["width"],
        "height": template["height"],
        "relative_path": relative.replace("\\", "/"),
        "prompt": prompt,
        "prompt_extra": (prompt_extra or "").strip(),
        "selected": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "method": f"{image_generation_provider() or 'studio'}_generate",
        "elapsed_ms": int((time.monotonic() - started) * 1000),
    }

    lib = _load_library()
    items = [x for x in lib["items"] if isinstance(x, dict)]
    items.insert(0, item)
    # Keep last 200
    _save_library(items[:200])

    logger.info("assets_studio generated template=%s id=%s", template_id, asset_id)
    return _enrich_item(item)


def assets_studio_configured() -> dict[str, bool | str | None]:
    return {
        "gemini_api_key": bool((getattr(settings, "GEMINI_API_KEY", None) or "").strip()),
        "provider": image_generation_provider(),
        "image_generation": image_generation_configured(),
    }
