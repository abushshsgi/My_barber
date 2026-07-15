from __future__ import annotations

import mimetypes

from django.conf import settings
from django.core.files.base import ContentFile, File
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from django.utils.encoding import filepath_to_uri
from django.utils.functional import cached_property


@deconstructible
class DatabaseMediaStorage(Storage):
    """Django Storage — fayl baytlari StoredMedia (Postgres) da."""

    def __init__(self, base_url: str | None = None):
        self._base_url = base_url

    @cached_property
    def base_url(self) -> str:
        if self._base_url is not None:
            return self._base_url
        url = getattr(settings, "MEDIA_URL", "/media/") or "/media/"
        return url if url.endswith("/") else f"{url}/"

    def _normalize(self, name: str) -> str:
        return (name or "").replace("\\", "/").lstrip("/")

    def _get(self, name: str):
        from media_store.models import StoredMedia

        return StoredMedia.objects.filter(name=self._normalize(name)).first()

    def _open(self, name: str, mode: str = "rb") -> File:
        obj = self._get(name)
        if obj is None:
            raise FileNotFoundError(name)
        return ContentFile(bytes(obj.data), name=self._normalize(name))

    def _save(self, name: str, content) -> str:
        from media_store.models import StoredMedia

        name = self._normalize(name)
        if hasattr(content, "chunks"):
            chunks = []
            for chunk in content.chunks():
                chunks.append(chunk if isinstance(chunk, (bytes, bytearray)) else chunk.encode("utf-8"))
            data = b"".join(chunks)
        else:
            raw = content.read()
            data = raw if isinstance(raw, (bytes, bytearray)) else bytes(raw)

        content_type = (
            getattr(content, "content_type", None)
            or mimetypes.guess_type(name)[0]
            or "application/octet-stream"
        )
        StoredMedia.objects.update_or_create(
            name=name,
            defaults={
                "data": data,
                "content_type": content_type[:128],
                "size": len(data),
            },
        )
        return name

    def delete(self, name: str) -> None:
        from media_store.models import StoredMedia

        StoredMedia.objects.filter(name=self._normalize(name)).delete()

    def exists(self, name: str) -> bool:
        from media_store.models import StoredMedia

        return StoredMedia.objects.filter(name=self._normalize(name)).exists()

    def listdir(self, path: str):
        from media_store.models import StoredMedia

        prefix = self._normalize(path)
        if prefix and not prefix.endswith("/"):
            prefix = f"{prefix}/"
        dirs: set[str] = set()
        files: list[str] = []
        for name in StoredMedia.objects.filter(name__startswith=prefix).values_list("name", flat=True):
            rest = name[len(prefix) :] if prefix else name
            if not rest:
                continue
            if "/" in rest:
                dirs.add(rest.split("/", 1)[0])
            else:
                files.append(rest)
        return sorted(dirs), sorted(files)

    def size(self, name: str) -> int:
        obj = self._get(name)
        if obj is None:
            raise FileNotFoundError(name)
        return int(obj.size)

    def url(self, name: str | None) -> str:
        if not name:
            return self.base_url
        return f"{self.base_url}{filepath_to_uri(self._normalize(name))}"

    def path(self, name: str) -> str:
        # Disk yo‘li yo‘q — ba'zi kod path() chaqiradi
        raise NotImplementedError("Database media has no filesystem path.")

    def get_accessed_time(self, name: str):
        from django.utils import timezone

        obj = self._get(name)
        if obj is None:
            raise FileNotFoundError(name)
        return obj.updated_at or timezone.now()

    def get_created_time(self, name: str):
        from django.utils import timezone

        obj = self._get(name)
        if obj is None:
            raise FileNotFoundError(name)
        return obj.created_at or timezone.now()

    def get_modified_time(self, name: str):
        return self.get_accessed_time(name)
