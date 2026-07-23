"""Media fayl borligini tekshirish — disk + Postgres StoredMedia + default storage."""

from __future__ import annotations

from pathlib import Path

from django.conf import settings


def normalize_media_name(name: str | None) -> str:
    return (name or "").replace("\\", "/").lstrip("/")


def media_name_exists(name: str | None) -> bool:
    """
    ImageField.name bo‘yicha fayl hali mavjudmi.
    Storage (DB/S3/FS) + legacy disk (MEDIA_ROOT) tekshiriladi.
    """
    rel = normalize_media_name(name)
    if not rel or ".." in rel.split("/"):
        return False

    try:
        from django.core.files.storage import default_storage

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

    import mimetypes

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
