from __future__ import annotations

import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET


@require_GET
@cache_control(public=True, max_age=60 * 60 * 24 * 7)
def serve_media(request, path: str):
    """
    /media/... — avval disk (volume), keyin Postgres StoredMedia.
    """
    rel = (path or "").replace("\\", "/").lstrip("/")
    if not rel or ".." in rel.split("/"):
        raise Http404()

    root = Path(settings.MEDIA_ROOT)
    disk = (root / rel).resolve()
    try:
        disk.relative_to(root.resolve())
    except ValueError:
        raise Http404() from None

    if disk.is_file():
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
