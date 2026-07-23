from __future__ import annotations

import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET

from media_store.utils import ingest_disk_file_to_db, normalize_media_name


@require_GET
@cache_control(public=True, max_age=60 * 60 * 24 * 7)
def serve_media(request, path: str):
    """
    /media/... — avval disk (volume), keyin Postgres StoredMedia.
    Diskdan topilsa va USE_DB_MEDIA bo‘lsa — Postgresga ham yozib qo‘yamiz (lazy migrate).
    """
    rel = normalize_media_name(path)
    if not rel or ".." in rel.split("/"):
        raise Http404()

    root = Path(settings.MEDIA_ROOT)
    disk = (root / rel).resolve()
    try:
        disk.relative_to(root.resolve())
    except ValueError:
        raise Http404() from None

    if disk.is_file():
        # Redeploydan oldin diskda qolgan fayllarni DB ga ko‘chirish
        try:
            ingest_disk_file_to_db(rel)
        except Exception:
            pass
        content_type = mimetypes.guess_type(str(disk))[0] or "application/octet-stream"
        return FileResponse(disk.open("rb"), content_type=content_type)

    try:
        from media_store.models import StoredMedia
    except Exception:
        raise Http404() from None

    obj = StoredMedia.objects.filter(name=rel).first()
    if obj is None:
        raise Http404()

    content_type = obj.content_type or mimetypes.guess_type(rel)[0] or "application/octet-stream"
    response = HttpResponse(bytes(obj.data), content_type=content_type)
    response["Content-Length"] = str(obj.size or len(obj.data))
    return response
