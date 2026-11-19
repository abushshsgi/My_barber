"""Stage D — lightweight packaging image similarity (aHash, Pillow only)."""

from __future__ import annotations

import base64
import io
from typing import TYPE_CHECKING

from django.core.files.uploadedfile import UploadedFile

if TYPE_CHECKING:
    from hair_advisor.models import ProductSubmission

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None  # type: ignore


def _load_image_bytes(source) -> bytes | None:
    if not source:
        return None
    if isinstance(source, (bytes, bytearray)):
        return bytes(source)
    if hasattr(source, "read"):
        try:
            source.seek(0)
        except Exception:
            pass
        return source.read()
    if isinstance(source, str) and source.startswith("data:"):
        try:
            _, _, body = source.partition(",")
            return base64.b64decode(body)
        except Exception:
            return None
    return None


def average_hash(image_source, *, hash_size: int = 8) -> str | None:
    """Return hex aHash string or None if image unreadable."""
    if Image is None:
        return None
    raw = _load_image_bytes(image_source)
    if not raw:
        return None
    try:
        img = Image.open(io.BytesIO(raw)).convert("L")
        img = img.resize((hash_size, hash_size), Image.Resampling.LANCZOS)
        pixels = list(img.getdata())
        avg = sum(pixels) / len(pixels)
        bits = "".join("1" if p >= avg else "0" for p in pixels)
        return f"{int(bits, 2):0{hash_size * hash_size // 4}x}"
    except Exception:
        return None


def hamming_distance_hex(a: str, b: str) -> int:
    if not a or not b or len(a) != len(b):
        return 64
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def image_similarity_score(hash_a: str | None, hash_b: str | None) -> float:
    """0..1 similarity; conservative — identical packaging often > 0.85."""
    if not hash_a or not hash_b:
        return 0.0
    bits = len(hash_a) * 4
    dist = hamming_distance_hex(hash_a, hash_b)
    return max(0.0, 1.0 - dist / bits)


def submission_primary_image_hash(submission: "ProductSubmission") -> str | None:
    conf = submission.recognition_confidence if isinstance(submission.recognition_confidence, dict) else {}
    existing = conf.get("image_phash")
    if isinstance(existing, str) and existing:
        return existing
    for field in ("front_image", "ingredient_label_image", "back_image"):
        f = getattr(submission, field, None)
        if f and getattr(f, "name", ""):
            try:
                f.open("rb")
                data = f.read()
                f.close()
            except Exception:
                data = None
            h = average_hash(data)
            if h:
                conf = {**conf, "image_phash": h}
                submission.recognition_confidence = conf
                submission.save(update_fields=["recognition_confidence", "updated_at"])
                return h
    return None