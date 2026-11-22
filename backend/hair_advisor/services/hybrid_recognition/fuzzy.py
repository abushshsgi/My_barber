"""String similarity — RapidFuzz when installed, else difflib."""

from __future__ import annotations

from difflib import SequenceMatcher

try:
    from rapidfuzz import fuzz as _rfuzz

    def token_ratio(a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        return _rfuzz.token_sort_ratio(a, b) / 100.0

except ImportError:  # pragma: no cover

    def token_ratio(a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        return SequenceMatcher(None, a, b).ratio()