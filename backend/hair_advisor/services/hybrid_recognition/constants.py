"""Hybrid Scanner V3 recognition statuses."""

from __future__ import annotations

# Primary statuses (stored in recognition_meta.recognition_status)
EXACT_MATCH = "exact_match"
PROBABLE_MATCH = "probable_match"
AMBIGUOUS = "ambiguous"
NOT_FOUND = "not_found"
INSUFFICIENT_IMAGE_QUALITY = "insufficient_image_quality"
SERVICE_UNAVAILABLE = "service_unavailable"

# Legacy aliases (V2 clients)
LEGACY_EXACT = "exact"
LEGACY_NONE = "none"

PICK_STATUSES = frozenset({PROBABLE_MATCH, AMBIGUOUS, "ambiguous"})

AUTO_ATTACH_STATUSES = frozenset({EXACT_MATCH, LEGACY_EXACT})

MAX_CANDIDATES = 12
EXACT_SCORE = 0.92
PROBABLE_SCORE = 0.78
MIN_CANDIDATE_SCORE = 0.45