from __future__ import annotations

import mimetypes
from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.utils.http import http_date
from django.views.decorators.http import require_GET

from media_store.serve_helpers import (
    cache_media_body,
    is_private_media_path,
    media_body_cache_key,
    media_etag,
    read_cached_media_body,
)
from media_store.utils import ingest_disk_file_to_db, normalize_media_name


def _apply_cache_headers(response: HttpResponse, *, private: bool) -> None:
    if private:
        response["Cache-Control"] = "private, max-age=3600"
    else:
        response["Cache-Control"] = "public, max-age=604800, immutable"


def _maybe_not_modified(request, etag: str, last_modified=None) -> HttpResponse | None:
    inm = request.META.get("HTTP_IF_NONE_MATCH")
    if inm and inm == etag:
        response = HttpResponse(status=304)
        response["ETag"] = etag
        if last_modified is not None:
            response["Last-Modified"] = http_date(last_modified.timestamp())
        return response
    return None


def _file_response(
    request,
    data: bytes,
    content_type: str,
    *,
    private: bool,
    etag: str,
    last_modified=None,
) -> HttpResponse | FileResponse:
    not_modified = _maybe_not_modified(request, etag, last_modified)
    if not_modified is not None:
        _apply_cache_headers(not_modified, private=private)
        return not_modified

    response = FileResponse(BytesIO(data), content_type=content_type)
    response["Content-Length"] = str(len(data))
    response["ETag"] = etag
    if last_modified is not None:
        response["Last-Modified"] = http_date(last_modified.timestamp())
    _apply_cache_headers(response, private=private)
    return response


def _load_db_media(rel: str) -> tuple[bytes, str, int, object] | None:
    try:
        from media_store.models import StoredMedia

        obj = (
            StoredMedia.objects.filter(name=rel)
            .only("data", "content_type", "size", "updated_at")
            .first()
        )
        if obj is None:
            return None
        content_type = obj.content_type or mimetypes.guess_type(rel)[0] or "application/octet-stream"
        size = int(obj.size or len(obj.data))
        cache_key = media_body_cache_key(rel, size, obj.updated_at)
        cached = read_cached_media_body(cache_key)
        if cached is not None:
            data = cached
        else:
            data = bytes(obj.data)
            cache_media_body(cache_key, data)
        return data, content_type, size, obj.updated_at
    except Exception:
        return None


@require_GET
def serve_media(request, path: str):
    """
    /media/... — Postgres StoredMedia (asosiy) + disk (legacy / volume).
    Diskdan topilsa va USE_DB_MEDIA bo‘lsa — Postgresga ham yozib qo‘yamiz (lazy migrate).
    """
    rel = normalize_media_name(path)
    if not rel or ".." in rel.split("/"):
        raise Http404()
    if rel.startswith("wallet/card_receipts/"):
        raise Http404()

    private = is_private_media_path(rel)

    loaded = _load_db_media(rel)
    if loaded is not None:
        data, content_type, size, updated_at = loaded
        etag = media_etag(size, updated_at)
        return _file_response(
            request,
            data,
            content_type,
            private=private,
            etag=etag,
            last_modified=updated_at,
        )

    root = Path(settings.MEDIA_ROOT)
    disk = (root / rel).resolve()
    try:
        disk.relative_to(root.resolve())
    except ValueError:
        raise Http404() from None

    if disk.is_file():
        try:
            ingest_disk_file_to_db(rel)
        except Exception:
            pass
        loaded = _load_db_media(rel)
        if loaded is not None:
            data, content_type, size, updated_at = loaded
            etag = media_etag(size, updated_at)
            return _file_response(
                request,
                data,
                content_type,
                private=private,
                etag=etag,
                last_modified=updated_at,
            )

        stat = disk.stat()
        content_type = mimetypes.guess_type(str(disk))[0] or "application/octet-stream"
        etag = media_etag(stat.st_size, None)
        not_modified = _maybe_not_modified(request, etag)
        if not_modified is not None:
            _apply_cache_headers(not_modified, private=private)
            return not_modified
        response = FileResponse(disk.open("rb"), content_type=content_type)
        response["Content-Length"] = str(stat.st_size)
        response["ETag"] = etag
        response["Last-Modified"] = http_date(stat.st_mtime)
        _apply_cache_headers(response, private=private)
        return response

    raise Http404()
