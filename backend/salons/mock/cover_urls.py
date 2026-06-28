"""Mock salon cover/gallery — Pexels CDN (fayl yuklamasdan API orqali)."""

from __future__ import annotations

import re

from salons.mock.pexels import BUNDLED_PHOTO_IDS, pexels_cdn_url
from salons.mock.tashkent_salons import MOCK_MARKER

_MOCK_SLUG_RE = re.compile(r"^mock-tashkent-(\d{3})$")
_KINDS = ("barber", "barber", "barber", "beauty", "nails", "spa")


def is_mock_salon(salon) -> bool:
    desc = getattr(salon, "description", "") or ""
    slug = getattr(salon, "slug", "") or ""
    return desc.startswith(MOCK_MARKER) or slug.startswith("mock-tashkent-")


def mock_kind_from_slug(slug: str) -> str:
    m = _MOCK_SLUG_RE.match(slug or "")
    if not m:
        return "barber"
    idx = int(m.group(1)) - 1
    return _KINDS[idx % len(_KINDS)]


def mock_cover_photo_id(slug: str, offset: int = 0) -> int:
    kind = mock_kind_from_slug(slug)
    pool = BUNDLED_PHOTO_IDS.get(kind, BUNDLED_PHOTO_IDS["barber"])
    m = _MOCK_SLUG_RE.match(slug or "")
    idx = (int(m.group(1)) - 1 if m else 0) + offset
    return pool[idx % len(pool)]


def mock_cover_cdn_url(slug: str, offset: int = 0, width: int = 1200) -> str:
    return pexels_cdn_url(mock_cover_photo_id(slug, offset), width=width)


def mock_gallery_urls(slug: str, count: int = 2) -> list[str]:
    return [mock_cover_cdn_url(slug, offset=i + 1, width=800) for i in range(count)]


def resolve_salon_cover_url(salon, context: dict | None = None) -> str | None:
    """DB dagi cover yoki mock uchun Pexels CDN."""
    context = context or {}
    if salon.cover_image:
        try:
            url = salon.cover_image.url
        except (ValueError, OSError):
            url = None
        if url:
            request = context.get("request")
            if request is not None:
                return request.build_absolute_uri(url)
            return url
    if is_mock_salon(salon) and salon.slug:
        return mock_cover_cdn_url(salon.slug)
    return None
