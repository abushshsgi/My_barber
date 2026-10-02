"""Karta to'ldirish claim — qayta-qayta yomon fayl va flood ga qarshi qisqa qulf."""

from __future__ import annotations

import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

FAIL_LIMIT = 12
WINDOW_SECONDS = 10 * 60


def _key(user_id: int) -> str:
    return f"wallet:claim-fail:{user_id}"


def claim_locked(user_id: int) -> bool:
    try:
        return int(cache.get(_key(user_id), 0) or 0) >= FAIL_LIMIT
    except Exception:
        logger.warning("claim lock cache unavailable", exc_info=True)
        return False


def register_claim_failure(user_id: int) -> None:
    key = _key(user_id)
    try:
        current = int(cache.get(key, 0) or 0) + 1
        cache.set(key, current, WINDOW_SECONDS)
    except Exception:
        logger.warning("claim failure counter unavailable", exc_info=True)


def clear_claim_failures(user_id: int) -> None:
    try:
        cache.delete(_key(user_id))
    except Exception:
        logger.warning("claim failure clear unavailable", exc_info=True)
