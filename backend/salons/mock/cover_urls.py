"""Mock salon cover/gallery — Pexels CDN (fayl yuklamasdan API orqali)."""

from __future__ import annotations

import re

from salons.mock.pexels import BUNDLED_PHOTO_IDS, pexels_cdn_url
from salons.mock.demo_seed import DEMO_MARKER
from salons.mock.tashkent_salons import MOCK_MARKER

_DEMO_SLUG_RE = re.compile(r"^demo-salon-\d{2}$")
_MOCK_SLUG_RE = re.compile(r"^mock-tashkent-(\d{3})$")
_KINDS = ("barber", "barber", "barber", "beauty", "nails", "spa")


def is_mock_salon(salon) -> bool:
    desc = getattr(salon, "description", "") or ""
    slug = getattr(salon, "slug", "") or ""
    return (
        desc.startswith(MOCK_MARKER)
        or desc.startswith(DEMO_MARKER)
        or slug.startswith("mock-tashkent-")
        or bool(_DEMO_SLUG_RE.match(slug))
    )


def mock_kind_from_slug(slug: str) -> str:
    if _DEMO_SLUG_RE.match(slug or ""):
        return "barber"
    m = _MOCK_SLUG_RE.match(slug or "")
    if not m:
        return "barber"
    idx = int(m.group(1)) - 1
    return _KINDS[idx % len(_KINDS)]


def mock_cover_photo_id(slug: str, offset: int = 0) -> int:
    kind = mock_kind_from_slug(slug)
    pool = BUNDLED_PHOTO_IDS.get(kind, BUNDLED_PHOTO_IDS["barber"])
    m = _MOCK_SLUG_RE.match(slug or "")
    if m:
        idx = int(m.group(1)) - 1 + offset
        return pool[idx % len(pool)]
    dm = _DEMO_SLUG_RE.match(slug or "")
    if dm:
        idx = int(slug.rsplit("-", 1)[-1]) - 1 + offset
        return pool[idx % len(pool)]
    idx = offset
    return pool[idx % len(pool)]


def mock_cover_cdn_url(slug: str, offset: int = 0, width: int = 1200) -> str:
    return pexels_cdn_url(mock_cover_photo_id(slug, offset), width=width)


def mock_gallery_urls(slug: str, count: int = 2) -> list[str]:
    return [mock_cover_cdn_url(slug, offset=i + 1, width=800) for i in range(count)]


def _media_file_exists(file_field) -> bool:
    from media_store.utils import media_field_exists

    return media_field_exists(file_field)


def resolve_salon_cover_url(salon, context: dict | None = None) -> str | None:
    """Faqat DB dagi haqiqiy cover — stock/demo Pexels qaytarmaydi; yo‘qolgan faylni bermaydi."""
    context = context or {}
    if not salon.cover_image or not getattr(salon.cover_image, "name", None):
        return None
    if not _media_file_exists(salon.cover_image):
        return None
    try:
        url = salon.cover_image.url
    except (ValueError, OSError):
        return None
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    request = context.get("request")
    if request is not None:
        return request.build_absolute_uri(url)
    return url
