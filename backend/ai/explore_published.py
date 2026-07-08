"""Explore persona rasmlari — draft, publish manifest, live URL."""

from __future__ import annotations

import json
import logging
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from django.conf import settings

from ai.explore_personas import (
    MEN_CATALOG_STYLE_SLUGS,
    PERSONA_READY_ASSETS,
    normalize_persona_id,
    static_persona_ref_image_path,
    static_persona_style_image_path,
)
from ai.explore_views import (
    EXPLORE_VIEW_IDS,
    EXPLORE_VIEW_LABELS,
    explore_asset_storage_slug,
    normalize_explore_view,
    parse_storage_slug,
    resolve_style_image_path_with_view,
    views_for_job_slug,
)
from ai.services.gemini_style import AiStyleError

logger = logging.getLogger(__name__)

PUBLIC_ROOT = Path(settings.BASE_DIR).parent / "apps" / "user" / "public"
MANIFEST_NAME = "explore_published_assets.json"


def _manifest_path() -> Path:
    return Path(settings.MEDIA_ROOT) / MANIFEST_NAME


def _load_manifest() -> dict[str, list[str]]:
    path = _manifest_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        logger.warning("Invalid explore publish manifest — resetting")
        return {}
    if not isinstance(data, dict):
        return {}
    out: dict[str, list[str]] = {}
    for key, value in data.items():
        pid = normalize_persona_id(str(key))
        if not pid or not isinstance(value, list):
            continue
        slugs = sorted({str(slug).strip() for slug in value if str(slug).strip()})
        if slugs:
            out[pid] = slugs
    return out


def _save_manifest(data: dict[str, list[str]]) -> None:
    path = _manifest_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def draft_asset_path(*, persona_id: str, slug: str, view: str = "front") -> Path:
    pid = normalize_persona_id(persona_id) or persona_id
    storage = explore_asset_storage_slug(slug, view)
    return Path(settings.MEDIA_ROOT) / "explore_gen" / pid / f"{storage}.webp"


def live_asset_path(*, persona_id: str, slug: str, view: str = "front") -> Path:
    pid = normalize_persona_id(persona_id) or persona_id
    normalized_view = normalize_explore_view(view)
    if slug == "reference":
        rel = static_persona_ref_image_path(audience="men", persona_id=pid)
    else:
        base = static_persona_style_image_path(audience="men", persona_id=pid, slug=slug)
        rel = resolve_style_image_path_with_view(
            base_path=base,
            slug=slug,
            view=normalized_view,
        )
    rel_path = rel.lstrip("/")
    if PUBLIC_ROOT.is_dir():
        return PUBLIC_ROOT / rel_path
    return Path(settings.MEDIA_ROOT) / rel_path


def is_explore_asset_published(persona_id: str | None, slug: str, view: str = "front") -> bool:
    pid = normalize_persona_id(persona_id)
    if not pid:
        return False
    storage = explore_asset_storage_slug(slug, view)
    return storage in _load_manifest().get(pid, [])


def published_slugs_for_persona(persona_id: str | None) -> frozenset[str]:
    pid = normalize_persona_id(persona_id)
    if not pid:
        return frozenset()
    return frozenset(_load_manifest().get(pid, []))


def _public_static_exists(*, persona_id: str, slug: str) -> bool:
    if not PUBLIC_ROOT.is_dir():
        return False
    return live_asset_path(persona_id=persona_id, slug=slug).is_file()


def _static_rel_path(*, audience: str, persona_id: str, slug: str, view: str = "front") -> str:
    pid = normalize_persona_id(persona_id) or persona_id
    normalized_view = normalize_explore_view(view)
    if slug == "reference":
        return static_persona_ref_image_path(audience=audience, persona_id=pid).lstrip("/")
    base = static_persona_style_image_path(audience=audience, persona_id=pid, slug=slug)
    return resolve_style_image_path_with_view(
        base_path=base,
        slug=slug,
        view=normalized_view,
    ).lstrip("/")


def _static_file_exists(*, audience: str, persona_id: str, slug: str, view: str = "front") -> bool:
    if not PUBLIC_ROOT.is_dir():
        return False
    rel = _static_rel_path(audience=audience, persona_id=persona_id, slug=slug, view=view)
    return (PUBLIC_ROOT / rel).is_file()


def view_asset_file_exists(*, persona_id: str, slug: str, view: str = "front") -> bool:
    pid = normalize_persona_id(persona_id)
    if not pid:
        return False
    normalized_view = normalize_explore_view(view)
    if is_explore_asset_published(pid, slug, view=normalized_view):
        live = live_asset_path(persona_id=pid, slug=slug, view=normalized_view)
        if live.is_file():
            return True
    if _static_file_exists(audience="men", persona_id=pid, slug=slug, view=normalized_view):
        return True
    ready = PERSONA_READY_ASSETS.get(pid, frozenset())
    if normalized_view == "front" and slug in ready:
        return True
    return False


def published_views_for_style(persona_id: str | None, slug: str) -> tuple[str, ...]:
    pid = normalize_persona_id(persona_id)
    if not pid or slug == "reference":
        return ("front",) if view_asset_file_exists(persona_id=pid, slug=slug, view="front") else ()
    views: list[str] = []
    for view in EXPLORE_VIEW_IDS:
        if view_asset_file_exists(persona_id=pid, slug=slug, view=view):
            views.append(view)
    return tuple(views)


def explore_asset_available(persona_id: str | None, slug: str) -> bool:
    pid = normalize_persona_id(persona_id)
    if not pid:
        return False
    if slug != "reference" and slug not in MEN_CATALOG_STYLE_SLUGS:
        return False
    if slug in PERSONA_READY_ASSETS.get(pid, frozenset()):
        return True
    if slug == "reference":
        return view_asset_file_exists(persona_id=pid, slug="reference", view="front")
    return bool(published_views_for_style(pid, slug))


def explore_media_base_url() -> str:
    configured = (getattr(settings, "API_PUBLIC_BASE_URL", None) or "").strip().rstrip("/")
    if configured:
        return configured
    return ""


def resolve_explore_asset_url(
    *,
    audience: str,
    persona_id: str,
    slug: str,
    view: str = "front",
) -> str:
    pid = normalize_persona_id(persona_id) or persona_id
    normalized_view = normalize_explore_view(view)
    if slug == "reference":
        return static_persona_ref_image_path(audience=audience, persona_id=pid)

    base = static_persona_style_image_path(audience=audience, persona_id=pid, slug=slug)
    rel = resolve_style_image_path_with_view(
        base_path=base,
        slug=slug,
        view=normalized_view,
    )
    if normalized_view == "front":
        return rel

    published = is_explore_asset_published(pid, slug, view=normalized_view)
    live = live_asset_path(persona_id=pid, slug=slug, view=normalized_view)
    if published and live.is_file() and not (PUBLIC_ROOT.is_dir() and live.is_relative_to(PUBLIC_ROOT)):
        media_rel = rel.lstrip("/")
        api_base = explore_media_base_url()
        if api_base:
            return f"{api_base}/media/{media_rel}"
        return f"/media/{media_rel}"
    return rel


def list_persona_style_gallery(*, audience: str, persona_id: str, slug: str) -> list[dict[str, str]]:
    """Git (Vercel) + publish qilingan barcha ko'rinishlar."""
    pid = normalize_persona_id(persona_id) or persona_id
    rows: list[dict[str, str]] = []
    for view in EXPLORE_VIEW_IDS:
        if not view_asset_file_exists(persona_id=pid, slug=slug, view=view):
            continue
        rows.append(
            {
                "view": view,
                "label": EXPLORE_VIEW_LABELS[view],
                "url": resolve_explore_asset_url(
                    audience=audience,
                    persona_id=pid,
                    slug=slug,
                    view=view,
                ),
            }
        )
    return rows


def publish_explore_asset(*, persona_id: str, slug: str, view: str = "front") -> dict[str, Any]:
    pid = normalize_persona_id(persona_id)
    if not pid:
        raise AiStyleError("Noto'g'ri persona_id.", 400)
    if slug != "reference" and slug not in MEN_CATALOG_STYLE_SLUGS:
        raise AiStyleError("Noto'g'ri slug.", 400)

    normalized_view = normalize_explore_view(view)
    storage = explore_asset_storage_slug(slug, normalized_view)
    draft = draft_asset_path(persona_id=pid, slug=slug, view=normalized_view)
    live = live_asset_path(persona_id=pid, slug=slug, view=normalized_view)
    if draft.is_file():
        live.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(draft, live)
    elif not live.is_file():
        raise AiStyleError("Avval generatsiya qiling.", 400)

    manifest = _load_manifest()
    slugs = set(manifest.get(pid, []))
    slugs.add(storage)
    manifest[pid] = sorted(slugs)
    _save_manifest(manifest)

    if slug == "reference":
        rel = static_persona_ref_image_path(audience="men", persona_id=pid)
    else:
        base = static_persona_style_image_path(audience="men", persona_id=pid, slug=slug)
        rel = resolve_style_image_path_with_view(
            base_path=base,
            slug=slug,
            view=normalized_view,
        )
    return {
        "persona_id": pid,
        "slug": slug,
        "view": normalized_view,
        "published": True,
        "relative_path": rel.lstrip("/"),
        "public_url": rel if PUBLIC_ROOT.is_dir() and live.is_relative_to(PUBLIC_ROOT) else None,
        "live_url": resolve_explore_asset_url(
            audience="men",
            persona_id=pid,
            slug=slug,
            view=normalized_view,
        ),
        "published_at": datetime.now(UTC).isoformat(),
    }


def publish_explore_persona(*, persona_id: str) -> dict[str, Any]:
    pid = normalize_persona_id(persona_id)
    if not pid:
        raise AiStyleError("Noto'g'ri persona_id.", 400)

    published: list[dict[str, Any]] = []
    slugs = ["reference", *sorted(MEN_CATALOG_STYLE_SLUGS)]
    for slug in slugs:
        for view in views_for_job_slug(slug):
            draft = draft_asset_path(persona_id=pid, slug=slug, view=view)
            live = live_asset_path(persona_id=pid, slug=slug, view=view)
            if not draft.is_file() and not live.is_file():
                continue
            published.append(publish_explore_asset(persona_id=pid, slug=slug, view=view))

    if not published:
        raise AiStyleError("Joylashtirish uchun tayyor rasm yo'q.", 400)

    return {
        "persona_id": pid,
        "count": len(published),
        "items": published,
    }
