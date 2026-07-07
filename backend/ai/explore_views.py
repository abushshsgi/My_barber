"""Explore dev generatsiya — har bir uslub uchun 4 ta ko'rinish (old, chap, o'ng, orqa)."""

from __future__ import annotations

EXPLORE_VIEW_IDS: tuple[str, ...] = ("front", "left", "right", "back")

EXPLORE_VIEW_LABELS: dict[str, str] = {
    "front": "Old",
    "left": "Chap",
    "right": "O'ng",
    "back": "Orqa",
}

_VIEW_ALIASES: dict[str, str] = {
    "old": "front",
    "chap": "left",
    "ong": "right",
    "orqa": "back",
}

VIEW_POSE_LINES: dict[str, str] = {
    "front": (
        "Three-quarter portrait, head slightly turned toward camera, natural candid barber moment, "
        "face partially visible, classic Explore catalog pose"
    ),
    "left": (
        "LEFT profile portrait: head turned clearly to the LEFT, camera sees the LEFT side of the face, "
        "left ear visible, face looking toward the left edge of the frame, NOT front-facing"
    ),
    "right": (
        "RIGHT profile portrait: head turned clearly to the RIGHT, camera sees the RIGHT side of the face, "
        "right ear visible, face looking toward the right edge of the frame, NOT front-facing"
    ),
    "back": (
        "BACK view portrait: person turned away from camera, back of head and nape fully visible, "
        "hairstyle shape readable from behind, shoulders and upper back in frame, NO face visible"
    ),
}


def normalize_explore_view(raw: str | None) -> str:
    value = (raw or "front").strip().lower()
    value = _VIEW_ALIASES.get(value, value)
    if value in EXPLORE_VIEW_IDS:
        return value
    return "front"


def views_for_job_slug(slug: str) -> tuple[str, ...]:
    if slug == "reference":
        return ("front",)
    return EXPLORE_VIEW_IDS


def explore_asset_storage_slug(slug: str, view: str | None) -> str:
    normalized = normalize_explore_view(view)
    if normalized == "front":
        return slug
    return f"{slug}__{normalized}"


def parse_storage_slug(storage_slug: str) -> tuple[str, str]:
    for view in ("left", "right", "back"):
        suffix = f"__{view}"
        if storage_slug.endswith(suffix):
            return storage_slug[: -len(suffix)], view
    return storage_slug, "front"


def view_pose_line(view: str | None) -> str:
    return VIEW_POSE_LINES[normalize_explore_view(view)]


def resolve_style_image_path_with_view(*, base_path: str, slug: str, view: str | None) -> str:
    normalized = normalize_explore_view(view)
    if normalized == "front":
        return base_path
    return base_path.replace(f"/{slug}.webp", f"/{slug}__{normalized}.webp")
