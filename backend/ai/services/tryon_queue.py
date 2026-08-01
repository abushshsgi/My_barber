"""Redis navbat — AI try-on generatsiyasi (10k+ user uchun tartibli Vertex chaqiruv)."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from django.conf import settings

from config.redis_url import get_redis_url, redis_blocking_client_kwargs, redis_client_kwargs

from .gemini_style import AiStyleError
from .gemini_tryon import generate_tryon_multiview, generate_tryon_preview
from ..usage_log import record_ai_generation

logger = logging.getLogger(__name__)

QUEUE_KEY = "mysaloon:tryon:queue"
JOB_PREFIX = "mysaloon:tryon:job:"
PAYLOAD_PREFIX = "mysaloon:tryon:payload:"

STATUS_QUEUED = "queued"
STATUS_PROCESSING = "processing"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


def _job_ttl() -> int:
    return int(getattr(settings, "TRYON_JOB_TTL_SECONDS", 3600))


def _max_queue_depth() -> int:
    return int(getattr(settings, "TRYON_QUEUE_MAX_DEPTH", 200))


def is_queue_enabled() -> bool:
    enabled = getattr(settings, "TRYON_QUEUE_ENABLED", True)
    if isinstance(enabled, str):
        enabled = enabled.lower() in ("1", "true", "yes")
    if not enabled:
        return False
    return bool(get_redis_url())


def _redis_client(*, blocking: bool = False):
    url = get_redis_url()
    if not url:
        return None
    import redis

    kwargs = redis_blocking_client_kwargs() if blocking else redis_client_kwargs()
    return redis.Redis.from_url(url, decode_responses=True, **kwargs)


def _job_key(job_id: str) -> str:
    return f"{JOB_PREFIX}{job_id}"


def _payload_key(job_id: str) -> str:
    return f"{PAYLOAD_PREFIX}{job_id}"


def _load_job(client, job_id: str) -> dict[str, Any] | None:
    raw = client.get(_job_key(job_id))
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _save_job(client, job_id: str, data: dict[str, Any]) -> None:
    client.setex(_job_key(job_id), _job_ttl(), json.dumps(data, ensure_ascii=False))


def enqueue_tryon_job(
    *,
    user_id: int,
    image: str,
    style_id: str,
    style_title: str,
    audience: str,
    slug: str,
    reference_image_url: str | None,
    persona_id: str | None = None,
    job_kind: str = "tryon",
) -> str:
    client = _redis_client()
    if client is None:
        raise AiStyleError("Try-on navbat sozlanmagan (REDIS_URL kerak).", 503)

    depth = int(client.llen(QUEUE_KEY))
    if depth >= _max_queue_depth():
        raise AiStyleError(
            "Morph AI hozir band. Keyinroq urinib ko'ring.",
            503,
        )

    kind = (job_kind or "tryon").strip() or "tryon"
    job_id = uuid.uuid4().hex
    now = datetime.now(UTC).isoformat()
    meta = {
        "job_id": job_id,
        "status": STATUS_QUEUED,
        "user_id": user_id,
        "style_id": style_id,
        "style_title": style_title,
        "persona_id": (persona_id or "").strip(),
        "job_kind": kind,
        "created_at": now,
        "updated_at": now,
        "queue_position": depth + 1,
    }
    payload = {
        "image": image,
        "audience": audience,
        "slug": slug,
        "title": style_title,
        "reference_image_url": reference_image_url,
        "job_kind": kind,
    }

    pipe = client.pipeline()
    pipe.setex(_payload_key(job_id), _job_ttl(), json.dumps(payload))
    pipe.setex(_job_key(job_id), _job_ttl(), json.dumps(meta, ensure_ascii=False))
    pipe.rpush(QUEUE_KEY, job_id)
    pipe.execute()
    logger.info("Try-on job queued: %s kind=%s (depth=%s)", job_id, kind, depth + 1)
    return job_id


def enqueue_tryon_multiview_job(
    *,
    user_id: int,
    front_image: str,
    style_id: str,
    style_title: str,
    audience: str,
    slug: str,
) -> str:
    return enqueue_tryon_job(
        user_id=user_id,
        image=front_image,
        style_id=style_id,
        style_title=style_title,
        audience=audience,
        slug=slug,
        reference_image_url=None,
        job_kind="multiview",
    )


def get_tryon_job(job_id: str, *, user_id: int) -> dict[str, Any] | None:
    client = _redis_client()
    if client is None:
        return None

    meta = _load_job(client, job_id)
    if meta is None:
        return None
    if int(meta.get("user_id") or 0) != user_id:
        return None

    status = str(meta.get("status") or STATUS_QUEUED)
    if status == STATUS_QUEUED:
        try:
            pos = client.lpos(QUEUE_KEY, job_id)
            if pos is not None:
                meta["queue_position"] = int(pos) + 1
        except Exception:
            pass

    return meta


def process_next_tryon_job(*, block_seconds: int = 5) -> bool:
    """Worker: navbatdan 1 ta ishni olib Vertex ga yuboradi."""
    client = _redis_client(blocking=True)
    if client is None:
        return False

    try:
        popped = client.brpop(QUEUE_KEY, timeout=max(1, block_seconds))
    except Exception as exc:
        # Navbat bo'sh bo'lganda socket_timeout noto'g'ri sozlangan bo'lsa ham worker tushmasin.
        from redis.exceptions import TimeoutError as RedisTimeoutError

        if isinstance(exc, (RedisTimeoutError, TimeoutError)):
            logger.debug("Try-on BRPOP timeout (navbat bo'sh yoki Redis sekin): %s", exc)
            return False
        raise
    if not popped:
        return False

    job_id = popped[1]
    meta = _load_job(client, job_id)
    payload_raw = client.get(_payload_key(job_id))
    if meta is None or not payload_raw:
        logger.warning("Try-on job missing payload/meta: %s", job_id)
        return True

    try:
        payload = json.loads(payload_raw)
    except json.JSONDecodeError:
        logger.warning("Try-on job invalid payload: %s", job_id)
        return True

    meta["status"] = STATUS_PROCESSING
    meta["updated_at"] = datetime.now(UTC).isoformat()
    meta.pop("queue_position", None)
    _save_job(client, job_id, meta)

    user_id = int(meta.get("user_id") or 0) or None
    if user_id:
        from ai.morph_ops import check_user_can_generate

        blocked = check_user_can_generate(user_id=user_id, kind="tryon")
        if blocked:
            meta["status"] = STATUS_FAILED
            meta["detail"] = blocked
            meta.pop("preview_image", None)
            record_ai_generation(
                user_id=user_id,
                kind="tryon",
                status="failed",
                style_id=str(meta.get("style_id") or ""),
                style_title=str(meta.get("style_title") or ""),
                job_id=job_id,
                error_detail=blocked[:500],
            )
            meta["updated_at"] = datetime.now(UTC).isoformat()
            _save_job(client, job_id, meta)
            client.delete(_payload_key(job_id))
            return True

    try:
        job_kind = str(payload.get("job_kind") or meta.get("job_kind") or "tryon")
        if job_kind == "multiview":
            multi = generate_tryon_multiview(
                front_data_url=str(payload.get("image") or ""),
                audience=str(payload.get("audience") or "unisex"),
                slug=str(payload.get("slug") or ""),
                title=str(payload.get("title") or ""),
            )
            views = multi.get("views") or {}
            meta["status"] = STATUS_COMPLETED
            meta["preview_image"] = views.get("front") or str(payload.get("image") or "")
            meta["views"] = views
            meta.pop("detail", None)
            record_ai_generation(
                user_id=int(meta.get("user_id") or 0) or None,
                kind="tryon",
                status="success",
                prompt=str(multi.get("prompt") or "tryon_multiview"),
                style_id=str(meta.get("style_id") or ""),
                style_title=str(meta.get("style_title") or ""),
                model=str(multi.get("model") or ""),
                provider=str(multi.get("provider") or ""),
                job_id=job_id,
                prompt_tokens=int(multi.get("prompt_tokens") or 0),
                candidates_tokens=int(multi.get("candidates_tokens") or 0),
                thoughts_tokens=int(multi.get("thoughts_tokens") or 0),
                total_tokens=int(multi.get("total_tokens") or 0),
                cost_usd=multi.get("cost_usd") or 0,
                tokens_estimated=bool(multi.get("tokens_estimated")),
                latency_ms=int(multi.get("latency_ms") or 0),
            )
            meta["updated_at"] = datetime.now(UTC).isoformat()
            _save_job(client, job_id, meta)
            client.delete(_payload_key(job_id))
            return True

        result = generate_tryon_preview(
            selfie_data_url=str(payload.get("image") or ""),
            audience=str(payload.get("audience") or "unisex"),
            slug=str(payload.get("slug") or ""),
            title=str(payload.get("title") or ""),
            reference_image_url=payload.get("reference_image_url"),
        )
        meta["status"] = STATUS_COMPLETED
        meta["preview_image"] = result.preview_image
        meta.pop("detail", None)
        record_ai_generation(
            user_id=int(meta.get("user_id") or 0) or None,
            kind="tryon",
            status="success",
            prompt=result.prompt,
            style_id=str(meta.get("style_id") or ""),
            style_title=str(meta.get("style_title") or ""),
            model=result.model,
            provider=result.provider,
            job_id=job_id,
            prompt_tokens=result.prompt_tokens,
            candidates_tokens=result.candidates_tokens,
            thoughts_tokens=result.thoughts_tokens,
            total_tokens=result.total_tokens,
            cost_usd=result.cost_usd,
            tokens_estimated=result.tokens_estimated,
            latency_ms=result.latency_ms,
        )
        user_id = int(meta.get("user_id") or 0) or None
        if user_id and result.preview_image:
            try:
                from accounts.models import User
                from ai.tryon_persist import persist_tryon_generation

                user = User.objects.filter(pk=user_id).first()
                if user:
                    persist_tryon_generation(
                        user=user,
                        after_image=result.preview_image,
                        before_image=str(payload.get("image") or ""),
                        style_id=str(meta.get("style_id") or ""),
                        title=str(meta.get("style_title") or ""),
                        persona_id=str(meta.get("persona_id") or ""),
                    )
            except Exception:
                logger.exception("Try-on generation persist failed job=%s", job_id)
    except AiStyleError as exc:
        meta["status"] = STATUS_FAILED
        meta["detail"] = exc.message
        meta.pop("preview_image", None)
        record_ai_generation(
            user_id=int(meta.get("user_id") or 0) or None,
            kind="tryon",
            status="failed",
            style_id=str(meta.get("style_id") or ""),
            style_title=str(meta.get("style_title") or ""),
            job_id=job_id,
            error_detail=exc.message,
        )
        logger.warning("Try-on job failed (%s): %s", job_id, exc.message)
    except Exception as exc:
        meta["status"] = STATUS_FAILED
        meta["detail"] = "Rasm yaratishda xatolik."
        meta.pop("preview_image", None)
        record_ai_generation(
            user_id=int(meta.get("user_id") or 0) or None,
            kind="tryon",
            status="failed",
            style_id=str(meta.get("style_id") or ""),
            style_title=str(meta.get("style_title") or ""),
            job_id=job_id,
            error_detail="Rasm yaratishda xatolik.",
        )
        logger.exception("Try-on job error (%s): %s", job_id, exc)
    finally:
        client.delete(_payload_key(job_id))

    meta["updated_at"] = datetime.now(UTC).isoformat()
    _save_job(client, job_id, meta)
    logger.info("Try-on job finished: %s status=%s", job_id, meta.get("status"))
    return True
