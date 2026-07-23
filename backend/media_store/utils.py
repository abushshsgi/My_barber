"""Media fayl I/O — disk + Postgres StoredMedia + default_storage."""

from __future__ import annotations

import json
import mimetypes
from io import BytesIO
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


def normalize_media_name(name: str | None) -> str:
    return (name or "").replace("\\", "/").lstrip("/")


def media_name_exists(name: str | None) -> bool:
    """
    ImageField.name / media rel bo‘yicha fayl hali mavjudmi.
    Storage (DB/S3/FS) + StoredMedia + legacy disk (MEDIA_ROOT).
    """
    rel = normalize_media_name(name)
    if not rel or ".." in rel.split("/"):
        return False

    try:
        if default_storage.exists(rel):
            return True
    except Exception:
        pass

    try:
        from media_store.models import StoredMedia

        if StoredMedia.objects.filter(name=rel).exists():
            return True
    except Exception:
        pass

    try:
        root = Path(settings.MEDIA_ROOT)
        disk = (root / rel).resolve()
        disk.relative_to(root.resolve())
        if disk.is_file():
            return True
    except Exception:
        pass

    return False


def media_field_exists(file_field) -> bool:
    name = getattr(file_field, "name", None)
    return media_name_exists(name)


def ingest_disk_file_to_db(rel: str) -> bool:
    """Diskdagi faylni StoredMedia ga ko‘chiradi (agar DB media yoqilgan bo‘lsa)."""
    rel = normalize_media_name(rel)
    if not rel:
        return False
    if not getattr(settings, "USE_DB_MEDIA", False):
        return False

    try:
        from media_store.models import StoredMedia
    except Exception:
        return False

    if StoredMedia.objects.filter(name=rel).exists():
        return True

    try:
        root = Path(settings.MEDIA_ROOT)
        disk = (root / rel).resolve()
        disk.relative_to(root.resolve())
        if not disk.is_file():
            return False
        data = disk.read_bytes()
    except Exception:
        return False

    content_type = mimetypes.guess_type(rel)[0] or "application/octet-stream"
    StoredMedia.objects.update_or_create(
        name=rel,
        defaults={
            "data": data,
            "content_type": content_type[:128],
            "size": len(data),
        },
    )
    return True


def save_media_bytes(
    rel: str,
    data: bytes,
    *,
    content_type: str | None = None,
) -> str:
    """
    Baytlarni default_storage orqali saqlaydi (prod: Postgres StoredMedia).
    Redeployda yo‘qolmasin.
    """
    rel = normalize_media_name(rel)
    if not rel or ".." in rel.split("/"):
        raise ValueError("Noto'g'ri media yo'li.")
    if not isinstance(data, (bytes, bytearray)):
        data = bytes(data)

    ctype = (content_type or mimetypes.guess_type(rel)[0] or "application/octet-stream")[:128]

    # DB storage yoqilgan bo‘lsa — to‘g‘ridan StoredMedia (idempotent)
    if getattr(settings, "USE_DB_MEDIA", False):
        from media_store.models import StoredMedia

        StoredMedia.objects.update_or_create(
            name=rel,
            defaults={
                "data": bytes(data),
                "content_type": ctype,
                "size": len(data),
            },
        )
    else:
        # Lokal / S3 — Django storage
        try:
            if default_storage.exists(rel):
                default_storage.delete(rel)
        except Exception:
            pass
        # ContentFile name = basename; storage._save gets full path from save(name=)
        default_storage.save(rel, ContentFile(bytes(data), name=Path(rel).name))

    # Legacy disk mirror (volume bo‘lsa) — serve_media lazy ingest uchun
    try:
        root = Path(settings.MEDIA_ROOT)
        disk = root / rel
        disk.parent.mkdir(parents=True, exist_ok=True)
        disk.write_bytes(bytes(data))
    except Exception:
        pass

    return rel


def read_media_bytes(rel: str) -> bytes | None:
    """Storage / DB / diskdan o‘qiydi. Topilmasa None."""
    rel = normalize_media_name(rel)
    if not rel or ".." in rel.split("/"):
        return None

    # Avval diskdan DB ga (lazy)
    try:
        ingest_disk_file_to_db(rel)
    except Exception:
        pass

    try:
        if default_storage.exists(rel):
            with default_storage.open(rel, "rb") as fh:
                return fh.read()
    except Exception:
        pass

    try:
        from media_store.models import StoredMedia

        obj = StoredMedia.objects.filter(name=rel).first()
        if obj is not None:
            return bytes(obj.data)
    except Exception:
        pass

    try:
        root = Path(settings.MEDIA_ROOT)
        disk = (root / rel).resolve()
        disk.relative_to(root.resolve())
        if disk.is_file():
            return disk.read_bytes()
    except Exception:
        pass

    return None


def delete_media(rel: str) -> None:
    rel = normalize_media_name(rel)
    if not rel:
        return
    try:
        if default_storage.exists(rel):
            default_storage.delete(rel)
    except Exception:
        pass
    try:
        from media_store.models import StoredMedia

        StoredMedia.objects.filter(name=rel).delete()
    except Exception:
        pass
    try:
        root = Path(settings.MEDIA_ROOT)
        disk = root / rel
        if disk.is_file():
            disk.unlink()
    except Exception:
        pass


def read_json_media(rel: str, default: Any = None) -> Any:
    raw = read_media_bytes(rel)
    if not raw:
        return {} if default is None else default
    try:
        return json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {} if default is None else default


def write_json_media(rel: str, data: Any) -> str:
    payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
    return save_media_bytes(rel, payload, content_type="application/json")


def media_url(rel: str) -> str:
    rel = normalize_media_name(rel)
    if not rel:
        return getattr(settings, "MEDIA_URL", "/media/") or "/media/"
    try:
        return default_storage.url(rel)
    except Exception:
        base = getattr(settings, "MEDIA_URL", "/media/") or "/media/"
        if not base.endswith("/"):
            base = f"{base}/"
        return f"{base}{rel}"


def open_media_stream(rel: str) -> tuple[BytesIO, str] | None:
    """Download / FileResponse uchun (stream, content_type)."""
    data = read_media_bytes(rel)
    if data is None:
        return None
    ctype = mimetypes.guess_type(rel)[0] or "application/octet-stream"
    try:
        from media_store.models import StoredMedia

        obj = StoredMedia.objects.filter(name=normalize_media_name(rel)).first()
        if obj and obj.content_type:
            ctype = obj.content_type
    except Exception:
        pass
    return BytesIO(data), ctype
