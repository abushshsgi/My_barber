"""Qiz-model studiyasi — Runware matndan portret, yoqqanini Explore ayollarga joylash."""

from __future__ import annotations

import logging
import secrets
import time
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from django.conf import settings
from PIL import Image

from ai.explore_persona_labels import persona_display_label, set_persona_display_label
from ai.explore_personas import WOMEN_EXPLORE_PERSONAS, normalize_persona_id, persona_audience
from ai.explore_published import (
    draft_asset_rel,
    explore_asset_available,
    publish_explore_asset,
    resolve_explore_asset_url,
)
from ai.services.errors import AiStyleError
from ai.services.runware_client import download_image, run_image_inference
from media_store.utils import media_name_exists, read_json_media, read_media_bytes, save_media_bytes, write_json_media

logger = logging.getLogger(__name__)

LIBRARY_FILENAME = "girl_models_library.json"
OUTPUT_W = 768
OUTPUT_H = 1024
WEBP_QUALITY = 92
LIBRARY_LIMIT = 80
DEFAULT_MODEL = "runware:400@6"

FRAME = """
three-quarter view, head turned slightly toward camera, subtle natural smile,
relaxed candid salon moment, adult woman, NOT a front-facing passport pose,

plain white crew-neck t-shirt,
solid flat #E8E8E8 background, soft studio lighting,
ultra sharp photorealistic, 85mm portrait, natural skin texture,
3:4 vertical portrait, full hair and shoulders in frame
""".strip()

NEGATIVE = (
    "child, teenager, underage, text, watermark, logo, extra person, duplicate face, "
    "deformed hands, extra fingers, plastic skin, passport photo, ID photo, "
    "cropped hair, blurry, cartoon, illustration"
)

LOOKS: dict[str, dict[str, str]] = {
    "central-asian": {
        "id": "central-asian",
        "label": "Leyla",
        "code": "CA-1",
        "summary": "Markaziy Osiyo, iliq teri, to'q jigarrang soch",
        "subject": (
            "young Central Asian woman age 24, warm beige skin, dark brown almond eyes, "
            "thick dark brown hair, neutral medium-length straight hair with a soft center part, natural brows"
        ),
    },
    "southern-european": {
        "id": "southern-european",
        "label": "Sofia",
        "code": "EU-11",
        "summary": "Janubiy Yevropa, zaytun teri, to'lqinli soch",
        "subject": (
            "young Southern European woman age 25, olive skin, dark brown eyes, "
            "dark wavy hair, neutral medium-length natural waves, defined brows, light natural makeup"
        ),
    },
    "slavic": {
        "id": "slavic",
        "label": "Mila",
        "code": "EU-12",
        "summary": "Sharqiy Yevropa, och teri, kulrang-sariq soch",
        "subject": (
            "young Eastern European woman age 26, pale Slavic skin, gray-green eyes, "
            "ash-blonde straight hair, neutral medium-length sleek cut, natural makeup"
        ),
    },
    "east-asian": {
        "id": "east-asian",
        "label": "Hana",
        "code": "EA-1",
        "summary": "Sharqiy Osiyo, silliq qora soch",
        "subject": (
            "young East Asian woman age 24, light warm skin, dark brown eyes, "
            "straight jet-black hair to the shoulders, soft center part, natural brows"
        ),
    },
    "south-asian": {
        "id": "south-asian",
        "label": "Amina",
        "code": "SA-1",
        "summary": "Janubiy Osiyo, quyuq soch, yumshoq to'lqin",
        "subject": (
            "young South Asian woman age 25, warm medium-brown skin, dark brown eyes, "
            "thick dark brown hair with a soft wave, natural brows, light makeup"
        ),
    },
    "latina": {
        "id": "latina",
        "label": "Lucia",
        "code": "LA-1",
        "summary": "Lotin Amerikasi, iliq teri, to'q to'lqin",
        "subject": (
            "young Latina woman age 25, warm golden-olive skin, dark brown eyes, "
            "dark brown loose waves past the shoulders, natural makeup"
        ),
    },
    "west-african": {
        "id": "west-african",
        "label": "Ayo",
        "code": "AF-1",
        "summary": "G'arbiy Afrika, qisqa tabiiy soch",
        "subject": (
            "young West African woman age 24, deep brown skin, dark brown eyes, "
            "short natural coily hair, natural brows, no heavy makeup"
        ),
    },
    "scandinavian": {
        "id": "scandinavian",
        "label": "Freya",
        "code": "EU-14",
        "summary": "Skandinaviya, och teri, malla soch",
        "subject": (
            "young Scandinavian woman age 25, fair skin, light blue-gray eyes, "
            "straight honey-blonde hair to the shoulders, natural brows"
        ),
    },
    "middle-eastern": {
        "id": "middle-eastern",
        "label": "Noor",
        "code": "ME-1",
        "summary": "Yaqin Sharq, quyuq soch, aniq qosh",
        "subject": (
            "young Middle Eastern woman age 25, warm olive skin, dark brown eyes, "
            "long dark brown hair with a soft side part, defined natural brows, light makeup"
        ),
    },
    "custom": {
        "id": "custom",
        "label": "Erkin",
        "code": "CUSTOM",
        "summary": "O'zingiz yozgan qiyofa",
        "subject": "",
    },
}

WOMEN_SLOT_IDS = ("leyla", "sofia", "mila")


def girl_model_configured() -> bool:
    return bool((getattr(settings, "RUNWARE_API_KEY", None) or "").strip())


def girl_model_name() -> str:
    model = (getattr(settings, "RUNWARE_TRYON_MODEL", None) or DEFAULT_MODEL).strip()
    return model or DEFAULT_MODEL


def list_looks() -> list[dict[str, str]]:
    return [
        {
            "id": look["id"],
            "label": look["label"],
            "code": look["code"],
            "summary": look["summary"],
        }
        for look in LOOKS.values()
    ]


def list_slots() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for pid in WOMEN_SLOT_IDS:
        persona = WOMEN_EXPLORE_PERSONAS[pid]
        ready = explore_asset_available(pid, "reference")
        rows.append(
            {
                "id": pid,
                "label": persona_display_label(pid),
                "code": persona["code"],
                "published": ready,
                "live_url": (
                    resolve_explore_asset_url(
                        audience="women",
                        persona_id=pid,
                        slug="reference",
                        view="front",
                    )
                    if ready
                    else None
                ),
            }
        )
    return rows


def _load_library() -> dict[str, Any]:
    data = read_json_media(LIBRARY_FILENAME, default={"items": []})
    if not isinstance(data, dict):
        return {"items": []}
    items = data.get("items")
    if not isinstance(items, list):
        items = []
    return {"items": items}


def _save_library(items: list[dict[str, Any]]) -> None:
    write_json_media(
        LIBRARY_FILENAME,
        {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()},
    )


def _download_path(model_id: str) -> str:
    return f"/api/v1/ai/dev/explore-gen/girls/download/?id={model_id}"


def _enrich(item: dict[str, Any]) -> dict[str, Any]:
    rel = str(item.get("relative_path") or "")
    return {
        **item,
        "exists": media_name_exists(rel) if rel else False,
        "download_path": _download_path(str(item.get("id") or "")),
    }


def list_models(*, look_id: str | None = None, liked_only: bool = False) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for raw in _load_library()["items"]:
        if not isinstance(raw, dict) or not raw.get("id"):
            continue
        if look_id and raw.get("look_id") != look_id:
            continue
        if liked_only and not raw.get("liked"):
            continue
        out.append(_enrich(raw))
    out.sort(key=lambda row: str(row.get("created_at") or ""), reverse=True)
    return out


def get_model(model_id: str) -> dict[str, Any] | None:
    for raw in _load_library()["items"]:
        if isinstance(raw, dict) and str(raw.get("id")) == str(model_id):
            return _enrich(raw)
    return None


def model_bytes(model_id: str) -> bytes:
    item = get_model(model_id)
    if not item:
        raise FileNotFoundError(model_id)
    raw = read_media_bytes(str(item.get("relative_path") or ""))
    if not raw:
        raise FileNotFoundError(model_id)
    return raw


def _build_prompt(look: dict[str, str], extra: str) -> str:
    note = " ".join((extra or "").split())
    if look["id"] == "custom":
        if len(note) < 12:
            raise AiStyleError("Erkin qiyofa uchun kamida bir gap yozing.", 400)
        subject = note[:800]
        note = ""
    else:
        subject = look["subject"]
    prompt = f"Professional salon studio portrait, {subject},\n\n{FRAME}"
    if note:
        prompt = f"{prompt}\n\nExtra direction: {note[:500]}"
    return prompt


def _to_webp(raw: bytes) -> bytes:
    img = Image.open(BytesIO(raw)).convert("RGB")
    img = img.resize((OUTPUT_W, OUTPUT_H), Image.Resampling.LANCZOS)
    buf = BytesIO()
    img.save(buf, "WEBP", quality=WEBP_QUALITY)
    return buf.getvalue()


def _inference_task(*, model: str, prompt: str) -> dict[str, Any]:
    return {
        "model": model,
        "positivePrompt": prompt[:10000],
        "negativePrompt": NEGATIVE,
        "width": OUTPUT_W,
        "height": OUTPUT_H,
        "steps": 4,
        "CFGScale": 3.5,
        "seed": secrets.randbelow(2_147_483_647),
        "outputFormat": "PNG",
    }


def generate_girl_model(*, look_id: str, prompt_extra: str = "") -> dict[str, Any]:
    look = LOOKS.get((look_id or "").strip())
    if not look:
        raise AiStyleError("Noma'lum qiyofa.", 400)
    if not girl_model_configured():
        raise AiStyleError("Runware sozlanmagan. RUNWARE_API_KEY kerak.", 503, retryable=False)

    prompt = _build_prompt(look, prompt_extra)
    model = girl_model_name()
    started = time.monotonic()
    task = _inference_task(model=model, prompt=prompt)
    result = run_image_inference(task)
    image_url = str(result.get("imageURL") or result.get("imageUrl") or "").strip()
    raw = download_image(image_url)
    webp = _to_webp(raw)

    model_id = uuid.uuid4().hex[:12]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    relative = f"girl_models/{look['id']}/{stamp}_{model_id}.webp"
    save_media_bytes(relative, webp, content_type="image/webp")

    item = {
        "id": model_id,
        "look_id": look["id"],
        "look_label": look["label"],
        "code": look["code"],
        "width": OUTPUT_W,
        "height": OUTPUT_H,
        "relative_path": relative,
        "prompt": prompt,
        "prompt_extra": " ".join((prompt_extra or "").split())[:800],
        "liked": False,
        "published_persona_id": None,
        "model": model,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "elapsed_ms": int((time.monotonic() - started) * 1000),
    }
    lib = _load_library()
    items = [row for row in lib["items"] if isinstance(row, dict)]
    items.insert(0, item)
    _save_library(items[:LIBRARY_LIMIT])
    logger.info("girl model generated look=%s id=%s model=%s", look["id"], model_id, model)
    return _enrich(item)


def set_model_liked(*, model_id: str, liked: bool) -> dict[str, Any]:
    lib = _load_library()
    found = None
    for item in lib["items"]:
        if isinstance(item, dict) and str(item.get("id")) == str(model_id):
            item["liked"] = bool(liked)
            found = item
            break
    if found is None:
        raise FileNotFoundError(model_id)
    _save_library([row for row in lib["items"] if isinstance(row, dict)])
    return _enrich(found)


def publish_girl_model(*, model_id: str, persona_id: str, label: str = "") -> dict[str, Any]:
    pid = normalize_persona_id(persona_id)
    if not pid or persona_audience(pid) != "women":
        raise AiStyleError("Explore qizlari uchun Leyla, Sofia yoki Mila slotini tanlang.", 400)

    lib = _load_library()
    found = None
    for item in lib["items"]:
        if isinstance(item, dict) and str(item.get("id")) == str(model_id):
            found = item
            break
    if found is None:
        raise FileNotFoundError(model_id)

    raw = read_media_bytes(str(found.get("relative_path") or ""))
    if not raw:
        raise AiStyleError("Rasm topilmadi. Qayta generatsiya qiling.", 404)

    save_media_bytes(
        draft_asset_rel(persona_id=pid, slug="reference", view="front"),
        raw,
        content_type="image/webp",
        force_db=True,
        disk_mirror=False,
    )
    published = publish_explore_asset(persona_id=pid, slug="reference", view="front")

    cleaned = " ".join((label or "").split())
    display = cleaned or str(found.get("look_label") or "").strip()
    if display:
        set_persona_display_label(persona_id=pid, label=display[:40])

    for item in lib["items"]:
        if not isinstance(item, dict):
            continue
        if item.get("published_persona_id") == pid and str(item.get("id")) != str(model_id):
            item["published_persona_id"] = None
    found["published_persona_id"] = pid
    found["liked"] = True
    _save_library([row for row in lib["items"] if isinstance(row, dict)])

    enriched = _enrich(found)
    enriched["publish"] = published
    enriched["slot_label"] = persona_display_label(pid)
    return enriched
