"""Redis-coordinated Try-On queue with PostgreSQL recovery and global provider slots."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import threading
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from django.conf import settings
from django.utils import timezone

from config.redis_url import get_redis_url, redis_blocking_client_kwargs, redis_client_kwargs

from .gemini_style import AiStyleError
from .runware_tryon import generate_tryon_multiview, generate_tryon_preview
from .image_provider import provider_health, queue_generation_context
from ..usage_log import record_ai_generation

logger = logging.getLogger(__name__)

QUEUE_KEY = "mysaloon:tryon:queue"
DELAYED_KEY = "mysaloon:tryon:delayed"
PROCESSING_KEY = "mysaloon:tryon:processing"
JOB_PREFIX = "mysaloon:tryon:job:"
PAYLOAD_PREFIX = "mysaloon:tryon:payload:"
LOCK_PREFIX = "mysaloon:tryon:lock:"
DEDUPE_PREFIX = "mysaloon:tryon:dedupe:"
SEM_PREFIX = "mysaloon:tryon:sem:"
COOLDOWN_PREFIX = "mysaloon:tryon:cooldown:"
METRICS_KEY = "mysaloon:tryon:metrics"
WORKERS_KEY = "mysaloon:tryon:workers"

STATUS_PENDING = "pending"
STATUS_QUEUED = "queued"  # public alias of pending
STATUS_PROCESSING = "processing"
STATUS_RETRYING = "retrying"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"
STATUS_CANCELLED = "cancelled"

PHASE_WAITING = "waiting"
PHASE_PROCESSING = "processing"
PHASE_GENERATING = "generating"
PHASE_DELAYED = "delayed"
PHASE_COMPLETED = "completed"
PHASE_FAILED = "failed"
PHASE_CANCELLED = "cancelled"

_CLIENT_MESSAGES = {
    PHASE_WAITING: "Navbatda kutyapsiz.",
    PHASE_PROCESSING: "So'rovingiz qayta ishlanmoqda.",
    PHASE_GENERATING: "Rasm yaratilmoqda.",
    PHASE_DELAYED: "Navbat saqlanadi. Birozdan so'ng qayta uriniladi.",
    PHASE_COMPLETED: "Tayyor.",
    PHASE_FAILED: "Rasm yaratilmadi. Qayta urinib ko'ring.",
    PHASE_CANCELLED: "Bekor qilindi.",
}

SLOT_WAIT_SECONDS = 10.0
MAX_QUEUE_WAIT_SECONDS = 900
PROVIDER_CONCURRENCY_CAP = 3

_thread_local = threading.local()
_WORKER_ID = (os.environ.get("TRYON_WORKER_ID") or "").strip() or uuid.uuid4().hex[:12]

_ACQUIRE_LUA = """
local cooldown = redis.call('GET', KEYS[2])
if cooldown then
  local until_ts = tonumber(cooldown)
  if until_ts and until_ts > tonumber(ARGV[3]) then
    return {0, until_ts}
  end
end
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local max_slots = tonumber(ARGV[1])
if current >= max_slots then
  return {0, 0}
end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
return {1, 0}
"""

_RELEASE_LUA = """
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current <= 0 then
  redis.call('DEL', KEYS[1])
  return 0
end
local nextv = redis.call('DECR', KEYS[1])
if tonumber(nextv) <= 0 then
  redis.call('DEL', KEYS[1])
  return 0
end
return nextv
"""

_EXTEND_COOLDOWN_LUA = """
local key = KEYS[1]
local new_until = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current and current >= new_until then
  return current
end
redis.call('SET', key, ARGV[1], 'EX', ttl)
return new_until
"""


def _job_ttl() -> int:
    return int(getattr(settings, "TRYON_JOB_TTL_SECONDS", 3600))


def _max_queue_depth() -> int:
    return int(getattr(settings, "TRYON_QUEUE_MAX_DEPTH", 200))


def _max_retries() -> int:
    return int(getattr(settings, "TRYON_MAX_RETRIES", 6))


def _lease_seconds() -> int:
    return int(getattr(settings, "TRYON_LEASE_SECONDS", 240))


def _provider_concurrency() -> int:
    return max(1, min(int(getattr(settings, "TRYON_PROVIDER_CONCURRENCY", 3)), PROVIDER_CONCURRENCY_CAP))


def _cooldown_seconds() -> int:
    return int(getattr(settings, "TRYON_RATE_LIMIT_COOLDOWN", 15))


def _dedupe_seconds() -> int:
    return int(getattr(settings, "TRYON_DEDUPE_SECONDS", 30))


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
    attr = "_blocking" if blocking else "_fast"
    cached = getattr(_thread_local, attr, None)
    if cached is not None:
        return cached
    import redis

    kwargs = redis_blocking_client_kwargs() if blocking else redis_client_kwargs()
    client = redis.Redis.from_url(url, decode_responses=True, **kwargs)
    setattr(_thread_local, attr, client)
    return client


def _job_key(job_id: str) -> str:
    return f"{JOB_PREFIX}{job_id}"


def _payload_key(job_id: str) -> str:
    return f"{PAYLOAD_PREFIX}{job_id}"


def _lock_key(job_id: str) -> str:
    return f"{LOCK_PREFIX}{job_id}"


def _sem_key(provider: str) -> str:
    return f"{SEM_PREFIX}{provider}"


def _cooldown_key(provider: str) -> str:
    return f"{COOLDOWN_PREFIX}{provider}"


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


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


def _metric_incr(client, field: str, amount: int = 1) -> None:
    try:
        client.hincrby(METRICS_KEY, field, amount)
        client.expire(METRICS_KEY, 7 * 24 * 3600)
    except Exception:
        pass


def _fingerprint_image(image: str) -> str:
    return hashlib.sha256((image or "").encode("utf-8", errors="ignore")).hexdigest()[:20]


def _dedupe_key(user_id: int, style_id: str, image: str, job_kind: str) -> str:
    fp = _fingerprint_image(image)
    return f"{DEDUPE_PREFIX}{user_id}:{job_kind}:{style_id}:{fp}"


def _created_ts(meta: dict[str, Any]) -> float:
    raw = meta.get("created_ts")
    try:
        if raw is not None:
            return float(raw)
    except (TypeError, ValueError):
        pass
    created = str(meta.get("created_at") or "")
    try:
        return datetime.fromisoformat(created.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return time.time()


def _provider_attempts(meta: dict[str, Any]) -> int:
    if meta.get("provider_attempt_count") is not None:
        return int(meta.get("provider_attempt_count") or 0)
    return int(meta.get("attempt_count") or 0)


def _job_too_old(meta: dict[str, Any]) -> bool:
    age = time.time() - _created_ts(meta)
    return age >= min(MAX_QUEUE_WAIT_SECONDS, max(60, _job_ttl() - 60))


def _provider_backoff_seconds(provider_attempts: int, retry_after: float | None) -> float:
    jitter = random.uniform(0.4, 2.5)
    exp = min(60.0, (2 ** max(0, provider_attempts - 1)) + jitter)
    floor = float(_cooldown_seconds())
    if retry_after is not None:
        try:
            retry_after = max(1.0, min(120.0, float(retry_after)))
        except (TypeError, ValueError):
            retry_after = None
    if retry_after is not None:
        return max(floor, retry_after, exp)
    return max(floor, exp)


def _cooldown_until(client, provider: str) -> float:
    try:
        raw = client.get(_cooldown_key(provider))
        return float(raw) if raw else 0.0
    except (TypeError, ValueError):
        return 0.0


def _sleep_while_cooling(client, provider: str, *, max_seconds: float) -> bool:
    """True if cooldown ended (caller may claim work). False = still cooling."""
    until = _cooldown_until(client, provider)
    remaining = until - time.time()
    if remaining <= 0:
        return True
    time.sleep(min(max(0.05, max_seconds), remaining))
    return time.time() >= until


def _phase_for_status(status: str, *, generating: bool = False) -> str:
    if generating and status == STATUS_PROCESSING:
        return PHASE_GENERATING
    if status in (STATUS_PENDING, STATUS_QUEUED):
        return PHASE_WAITING
    if status == STATUS_PROCESSING:
        return PHASE_PROCESSING
    if status == STATUS_RETRYING:
        return PHASE_DELAYED
    if status == STATUS_COMPLETED:
        return PHASE_COMPLETED
    if status == STATUS_CANCELLED:
        return PHASE_CANCELLED
    return PHASE_FAILED


def _public_payload(meta: dict[str, Any], *, generating: bool = False) -> dict[str, Any]:
    status = str(meta.get("status") or STATUS_PENDING)
    if status == STATUS_QUEUED:
        status = STATUS_PENDING
    phase = _phase_for_status(status, generating=generating)
    out = dict(meta)
    out["status"] = status
    out["phase"] = phase
    out["message"] = _CLIENT_MESSAGES.get(phase, "")
    if status == STATUS_RETRYING:
        out["message"] = "Hozircha band. Navbatda qayta uriniladi."
    out["retryable"] = bool(meta.get("retryable")) or status == STATUS_FAILED
    out["attempt_count"] = _provider_attempts(meta)
    if status == STATUS_PENDING:
        out["status_legacy"] = STATUS_QUEUED
    return out


def _notify_user(user_id: int, meta: dict[str, Any]) -> None:
    if not user_id:
        return
    try:
        from notifications.ws_broadcast import push_ws_user

        public = _public_payload(meta)
        push_ws_user(
            user_id,
            {
                "type": "tryon_job",
                "job_id": public.get("job_id"),
                "status": public.get("status"),
                "phase": public.get("phase"),
                "message": public.get("message"),
                "queue_position": public.get("queue_position"),
                "retryable": public.get("retryable"),
                "style_id": public.get("style_id"),
                "style_title": public.get("style_title"),
            },
        )
    except Exception:
        logger.debug("Try-on WS notify skipped", exc_info=True)


def _durable_upsert(job_id: str, fields: dict[str, Any]) -> None:
    try:
        from ai.models import TryOnTask

        user_id = int(fields.get("user_id") or 0)
        if not user_id:
            return
        defaults = {
            "user_id": user_id,
            "status": fields.get("status") or STATUS_PENDING,
            "job_kind": fields.get("job_kind") or "tryon",
            "style_id": str(fields.get("style_id") or "")[:64],
            "style_title": str(fields.get("style_title") or "")[:160],
            "audience": str(fields.get("audience") or "")[:16],
            "slug": str(fields.get("slug") or "")[:64],
            "persona_id": str(fields.get("persona_id") or "")[:64],
            "reference_image_url": str(fields.get("reference_image_url") or "")[:512],
            "idempotency_key": str(fields.get("idempotency_key") or "")[:80],
            "attempt_count": int(fields.get("attempt_count") or 0),
            "max_attempts": int(fields.get("max_attempts") or _max_retries()),
            "lease_owner": str(fields.get("lease_owner") or "")[:64],
            "provider": str(fields.get("provider") or "")[:32],
            "model_name": str(fields.get("model_name") or "")[:120],
            "error_detail": str(fields.get("error_detail") or fields.get("detail") or "")[:500],
            "latency_ms": int(fields.get("latency_ms") or 0),
        }
        if fields.get("lease_until"):
            defaults["lease_until"] = fields["lease_until"]
        if fields.get("status") in (STATUS_COMPLETED, STATUS_FAILED, STATUS_CANCELLED):
            defaults["completed_at"] = timezone.now()
        TryOnTask.objects.update_or_create(id=job_id, defaults=defaults)
    except Exception:
        logger.debug("Try-on durable upsert skipped job=%s", job_id, exc_info=True)


def _save_input_photo(job_id: str, image: str) -> None:
    if not image:
        return
    try:
        from ai.history_storage import image_file_from_source
        from ai.models import TryOnTask

        task = TryOnTask.objects.filter(pk=job_id).first()
        if not task or task.input_photo:
            return
        task.input_photo.save(
            "input.jpg",
            image_file_from_source(image, f"tryon-in-{job_id[:12]}"),
            save=True,
        )
    except Exception:
        logger.debug("Try-on input photo skip job=%s", job_id, exc_info=True)


def _save_result_photo(job_id: str, image: str, views: dict | None = None) -> None:
    try:
        from ai.history_storage import image_file_from_source
        from ai.models import TryOnTask

        task = TryOnTask.objects.filter(pk=job_id).first()
        if not task:
            return
        if image and not task.result_photo:
            task.result_photo.save(
                "result.jpg",
                image_file_from_source(image, f"tryon-out-{job_id[:12]}"),
                save=False,
            )
        if views:
            task.result_meta = {**(task.result_meta or {}), "has_views": True}
        task.save()
    except Exception:
        logger.debug("Try-on result photo skip job=%s", job_id, exc_info=True)


def _task_to_meta(task) -> dict[str, Any]:
    preview = ""
    try:
        if task.result_photo:
            raw = task.result_photo.read()
            if raw:
                import base64

                preview = "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii")
    except Exception:
        preview = ""
    return {
        "job_id": task.id,
        "status": task.status,
        "user_id": task.user_id,
        "style_id": task.style_id,
        "style_title": task.style_title,
        "persona_id": task.persona_id,
        "job_kind": task.job_kind,
        "created_at": task.created_at.isoformat() if task.created_at else _now_iso(),
        "updated_at": task.updated_at.isoformat() if task.updated_at else _now_iso(),
        "detail": task.error_detail or None,
        "preview_image": preview or None,
        "attempt_count": task.attempt_count,
        "retryable": task.status == STATUS_FAILED,
    }


def _payload_from_db(job_id: str) -> dict[str, Any] | None:
    try:
        import base64

        from ai.models import TryOnTask

        task = TryOnTask.objects.filter(pk=job_id).first()
        if not task or not task.input_photo:
            return None
        raw = task.input_photo.read()
        if not raw:
            return None
        return {
            "image": "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii"),
            "audience": task.audience,
            "slug": task.slug,
            "title": task.style_title,
            "reference_image_url": task.reference_image_url or None,
            "job_kind": task.job_kind,
        }
    except Exception:
        logger.debug("Try-on payload from db failed job=%s", job_id, exc_info=True)
        return None


def _active_provider_name() -> str:
    health = provider_health()
    return str(health.get("active") or "vertex")


def acquire_provider_slot(client, provider: str, *, wait_seconds: float = 2.0) -> bool:
    sem_key = _sem_key(provider)
    cd_key = _cooldown_key(provider)
    deadline = time.time() + max(0.2, wait_seconds)
    max_slots = _provider_concurrency()
    ttl = _lease_seconds() + 60
    while time.time() < deadline:
        try:
            result = client.eval(_ACQUIRE_LUA, 2, sem_key, cd_key, max_slots, ttl, time.time())
            if isinstance(result, (list, tuple)) and int(result[0]) == 1:
                return True
            until_ts = float(result[1]) if isinstance(result, (list, tuple)) and len(result) > 1 else 0
            if until_ts > time.time():
                time.sleep(min(0.4, until_ts - time.time()))
                continue
        except Exception:
            current = int(client.get(sem_key) or 0)
            cooldown = client.get(cd_key)
            if cooldown and float(cooldown) > time.time():
                time.sleep(0.25)
                continue
            if current < max_slots:
                client.incr(sem_key)
                client.expire(sem_key, ttl)
                return True
        time.sleep(0.15)
    return False


def release_provider_slot(client, provider: str) -> None:
    try:
        client.eval(_RELEASE_LUA, 1, _sem_key(provider))
    except Exception:
        try:
            val = int(client.get(_sem_key(provider)) or 0)
            if val <= 1:
                client.delete(_sem_key(provider))
            else:
                client.decr(_sem_key(provider))
        except Exception:
            pass


def set_provider_cooldown(client, provider: str, seconds: float) -> None:
    seconds = max(1.0, float(seconds or _cooldown_seconds()))
    until_ts = time.time() + seconds
    ttl = int(seconds) + 2
    key = _cooldown_key(provider)
    try:
        client.eval(_EXTEND_COOLDOWN_LUA, 1, key, str(until_ts), ttl)
    except Exception:
        try:
            current = client.get(key)
            if not current or float(current) < until_ts:
                client.setex(key, ttl, str(until_ts))
        except Exception:
            pass
    _metric_incr(client, "http_429_total")
    _metric_incr(client, "provider_http_429")


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

    kind = (job_kind or "tryon").strip() or "tryon"
    dedupe = _dedupe_key(user_id, style_id, image, kind)
    existing = client.get(dedupe)
    if existing:
        meta = _load_job(client, existing)
        if meta and str(meta.get("status")) not in (STATUS_FAILED, STATUS_CANCELLED):
            logger.info("Try-on duplicate suppressed: %s -> %s", user_id, existing)
            return str(existing)

    delayed = int(client.zcard(DELAYED_KEY) or 0)
    processing = int(client.zcard(PROCESSING_KEY) or 0)
    depth = int(client.llen(QUEUE_KEY)) + delayed + processing
    if depth >= _max_queue_depth():
        raise AiStyleError(
            "Morf AI hozir band. Keyinroq urinib ko'ring.",
            503,
        )

    job_id = uuid.uuid4().hex
    now = _now_iso()
    meta = {
        "job_id": job_id,
        "status": STATUS_PENDING,
        "user_id": user_id,
        "style_id": style_id,
        "style_title": style_title,
        "persona_id": (persona_id or "").strip(),
        "job_kind": kind,
        "created_at": now,
        "created_ts": time.time(),
        "updated_at": now,
        "queue_position": int(client.llen(QUEUE_KEY)) + 1,
        "attempt_count": 0,
        "provider_attempt_count": 0,
        "queue_claim_count": 0,
        "max_attempts": _max_retries(),
        "idempotency_key": dedupe[-80:],
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
    pipe.setex(dedupe, _dedupe_seconds(), job_id)
    pipe.execute()
    _metric_incr(client, "enqueued_total")
    _durable_upsert(
        job_id,
        {
            **meta,
            "audience": audience,
            "slug": slug,
            "reference_image_url": reference_image_url or "",
        },
    )
    _save_input_photo(job_id, image)
    _notify_user(user_id, meta)
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
    meta = _load_job(client, job_id) if client is not None else None
    if meta is None:
        try:
            from ai.models import TryOnTask

            task = TryOnTask.objects.filter(pk=job_id, user_id=user_id).first()
            if not task:
                return None
            meta = _task_to_meta(task)
        except Exception:
            return None
    if int(meta.get("user_id") or 0) != user_id:
        return None

    status = str(meta.get("status") or STATUS_PENDING)
    if status in (STATUS_PENDING, STATUS_QUEUED, STATUS_RETRYING) and client is not None:
        try:
            pos = client.lpos(QUEUE_KEY, job_id)
            if pos is not None:
                meta["queue_position"] = int(pos) + 1
        except Exception:
            pass
    return _public_payload(meta)


def list_user_tryon_jobs(*, user_id: int, limit: int = 10) -> list[dict[str, Any]]:
    try:
        from ai.models import TryOnTask

        rows = TryOnTask.objects.filter(user_id=user_id).order_by("-created_at")[: max(1, min(limit, 30))]
        return [_public_payload(_task_to_meta(row)) for row in rows]
    except Exception:
        return []


def cancel_tryon_job(job_id: str, *, user_id: int) -> dict[str, Any] | None:
    client = _redis_client()
    meta = get_tryon_job(job_id, user_id=user_id)
    if meta is None:
        return None
    if meta["status"] in (STATUS_COMPLETED, STATUS_FAILED, STATUS_CANCELLED):
        return meta
    meta["status"] = STATUS_CANCELLED
    meta["updated_at"] = _now_iso()
    meta["detail"] = "Bekor qilindi."
    if client is not None:
        _save_job(client, job_id, meta)
        try:
            client.lrem(QUEUE_KEY, 0, job_id)
            client.zrem(DELAYED_KEY, job_id)
            client.delete(_lock_key(job_id))
            client.delete(_payload_key(job_id))
        except Exception:
            pass
    _durable_upsert(job_id, {**meta, "error_detail": "Bekor qilindi."})
    _notify_user(user_id, meta)
    return _public_payload(meta)


def retry_tryon_job(job_id: str, *, user_id: int) -> dict[str, Any] | None:
    client = _redis_client()
    if client is None:
        return None
    meta = _load_job(client, job_id)
    if meta is None:
        try:
            from ai.models import TryOnTask

            task = TryOnTask.objects.filter(pk=job_id, user_id=user_id).first()
            if not task:
                return None
            meta = _task_to_meta(task)
        except Exception:
            return None
    if int(meta.get("user_id") or 0) != user_id:
        return None
    if str(meta.get("status")) not in (STATUS_FAILED, STATUS_CANCELLED):
        return _public_payload(meta)
    payload_raw = client.get(_payload_key(job_id))
    if not payload_raw:
        payload = _payload_from_db(job_id)
        if payload:
            client.setex(_payload_key(job_id), _job_ttl(), json.dumps(payload))
        else:
            return _public_payload(meta)
    meta["status"] = STATUS_PENDING
    meta["attempt_count"] = 0
    meta["detail"] = None
    meta["retryable"] = False
    meta["updated_at"] = _now_iso()
    _save_job(client, job_id, meta)
    client.rpush(QUEUE_KEY, job_id)
    _durable_upsert(job_id, meta)
    _notify_user(user_id, meta)
    return _public_payload(meta)


def _claim_lock(client, job_id: str, owner: str) -> bool:
    try:
        ok = client.set(_lock_key(job_id), owner, nx=True, ex=_lease_seconds())
        return bool(ok)
    except TypeError:
        # redis-py older kwargs vs name=
        ok = client.set(_lock_key(job_id), owner, nx=True, ex=_lease_seconds())
        return bool(ok)


def _release_lock(client, job_id: str) -> None:
    try:
        client.delete(_lock_key(job_id))
    except Exception:
        pass


def promote_delayed_jobs(client) -> int:
    now = time.time()
    moved = 0
    due_jobs: list[str] = []
    try:
        due = client.zrangebyscore(DELAYED_KEY, 0, now) or []
    except Exception:
        return 0
    for job_id in due:
        try:
            client.zrem(DELAYED_KEY, job_id)
            due_jobs.append(job_id)
            meta = _load_job(client, job_id)
            if meta:
                meta["status"] = STATUS_PENDING
                meta["updated_at"] = _now_iso()
                _save_job(client, job_id, meta)
            moved += 1
        except Exception:
            logger.debug("delayed promote failed %s", job_id, exc_info=True)
    if due_jobs:
        ranked = []
        for job_id in due_jobs:
            meta = _load_job(client, job_id) or {}
            ranked.append((_created_ts(meta), job_id))
        ranked.sort(key=lambda item: item[0], reverse=True)
        try:
            client.lpush(QUEUE_KEY, *[job_id for _ts, job_id in ranked])
        except Exception:
            for _ts, job_id in reversed(ranked):
                client.rpush(QUEUE_KEY, job_id)
    return moved


def recover_abandoned_jobs(client) -> int:
    now = time.time()
    recovered = 0
    try:
        stale = client.zrangebyscore(PROCESSING_KEY, 0, now) or []
    except Exception:
        stale = []
    for job_id in stale:
        try:
            client.zrem(PROCESSING_KEY, job_id)
            _release_lock(client, job_id)
            meta = _load_job(client, job_id)
            if not meta:
                continue
            if str(meta.get("status")) in (STATUS_COMPLETED, STATUS_FAILED, STATUS_CANCELLED):
                continue
            meta["status"] = STATUS_RETRYING
            meta["updated_at"] = _now_iso()
            _save_job(client, job_id, meta)
            client.rpush(QUEUE_KEY, job_id)
            recovered += 1
            logger.warning("Try-on recovered abandoned job=%s", job_id)
        except Exception:
            logger.debug("abandon recover failed %s", job_id, exc_info=True)
    recovered += recover_from_postgres(client)
    return recovered


def recover_from_postgres(client) -> int:
    moved = 0
    try:
        from ai.models import TryOnTask

        cutoff = timezone.now() - timedelta(seconds=_lease_seconds())
        rows = list(
            TryOnTask.objects.filter(
                status__in=[STATUS_PENDING, STATUS_RETRYING, STATUS_PROCESSING]
            ).order_by("created_at")[:100]
        )
    except Exception:
        return 0
    for task in rows:
        job_id = task.id
        queued = False
        try:
            queued = client.lpos(QUEUE_KEY, job_id) is not None
        except Exception:
            queued = job_id in (client.lrange(QUEUE_KEY, 0, -1) or [])
        if client.exists(_job_key(job_id)) and (
            queued
            or client.zscore(DELAYED_KEY, job_id) is not None
            or client.zscore(PROCESSING_KEY, job_id) is not None
        ):
            continue
        if task.status == STATUS_PROCESSING and task.lease_until and task.lease_until > timezone.now():
            continue
        if task.status == STATUS_PROCESSING and task.updated_at and task.updated_at > cutoff:
            continue
        payload = _payload_from_db(job_id)
        if payload:
            client.setex(_payload_key(job_id), _job_ttl(), json.dumps(payload))
        meta = _task_to_meta(task)
        meta["status"] = STATUS_PENDING
        _save_job(client, job_id, meta)
        client.rpush(QUEUE_KEY, job_id)
        moved += 1
        logger.warning("Try-on recovered from postgres job=%s", job_id)
    return moved


def mark_worker_heartbeat(client) -> None:
    try:
        client.hset(WORKERS_KEY, _WORKER_ID, str(time.time()))
        client.expire(WORKERS_KEY, 120)
    except Exception:
        pass


def queue_metrics(client=None) -> dict[str, Any]:
    client = client or _redis_client()
    health = provider_health()
    if client is None:
        return {
            "enabled": False,
            "queue_length": 0,
            "pending": 0,
            "processing": 0,
            "delayed": 0,
            "provider": health,
        }
    raw = {}
    try:
        raw = client.hgetall(METRICS_KEY) or {}
    except Exception:
        raw = {}
    completed = int(raw.get("completed_total") or 0)
    latency_sum = int(raw.get("latency_sum_ms") or 0)
    latency_n = int(raw.get("latency_count") or 0)
    avg = int(latency_sum / latency_n) if latency_n else 0
    workers = {}
    try:
        workers = client.hgetall(WORKERS_KEY) or {}
    except Exception:
        workers = {}
    now = time.time()
    alive = [wid for wid, ts in workers.items() if now - float(ts or 0) < 45]
    pg_counts: dict[str, int] = {}
    try:
        from django.db.models import Count

        from ai.models import TryOnTask

        for row in TryOnTask.objects.values("status").annotate(n=Count("id")):
            pg_counts[str(row["status"])] = int(row["n"])
    except Exception:
        pg_counts = {}
    return {
        "enabled": True,
        "queue_length": int(client.llen(QUEUE_KEY)),
        "pending": int(client.llen(QUEUE_KEY)),
        "processing": int(client.zcard(PROCESSING_KEY) or 0),
        "delayed": int(client.zcard(DELAYED_KEY) or 0),
        "completed": completed,
        "failed": int(raw.get("failed_total") or 0),
        "retry_counts": int(raw.get("retry_total") or 0),
        "queue_retry_total": int(raw.get("queue_retry_total") or 0),
        "provider_retry_total": int(raw.get("provider_retry_total") or 0),
        "slot_wait_requeue_total": int(raw.get("slot_wait_requeue_total") or 0),
        "http_429_frequency": int(raw.get("http_429_total") or raw.get("provider_http_429") or 0),
        "provider_http_attempts": int(raw.get("provider_http_attempts") or 0),
        "provider_http_429": int(raw.get("provider_http_429") or raw.get("http_429_total") or 0),
        "queue_wait_ms": int(int(raw.get("queue_wait_ms_sum") or 0) / max(1, int(raw.get("queue_wait_count") or 0))) if int(raw.get("queue_wait_count") or 0) else 0,
        "slot_wait_ms": int(int(raw.get("slot_wait_ms_sum") or 0) / max(1, int(raw.get("slot_wait_count") or 0))) if int(raw.get("slot_wait_count") or 0) else 0,
        "provider_latency_ms": avg,
        "average_generation_ms": avg,
        "last_generation_ms": int(raw.get("last_generation_ms") or 0),
        "cooldown_until": _cooldown_until(client, _active_provider_name()),
        "worker_health": {"alive": alive, "count": len(alive)},
        "provider_availability": health,
        "active_slots": int(client.get(_sem_key(_active_provider_name())) or 0),
        "provider_concurrency_limit": _provider_concurrency(),
        "max_depth": _max_queue_depth(),
        "pg_status_counts": pg_counts,
    }


def _requeue_later(
    client,
    job_id: str,
    meta: dict[str, Any],
    delay: float,
    *,
    reason: str = "queue",
) -> None:
    meta["status"] = STATUS_RETRYING
    meta["updated_at"] = _now_iso()
    meta["retry_at"] = datetime.now(UTC).isoformat()
    _save_job(client, job_id, meta)
    client.zadd(DELAYED_KEY, {job_id: time.time() + max(1.0, delay)})
    client.zrem(PROCESSING_KEY, job_id)
    _release_lock(client, job_id)
    _durable_upsert(job_id, meta)
    _metric_incr(client, "retry_total")
    if reason == "slot_wait":
        _metric_incr(client, "slot_wait_requeue_total")
        _metric_incr(client, "queue_retry_total")
    elif reason == "provider":
        _metric_incr(client, "provider_retry_total")
    else:
        _metric_incr(client, "queue_retry_total")
    _notify_user(int(meta.get("user_id") or 0), meta)


def _finish_terminal(client, job_id: str, meta: dict[str, Any]) -> None:
    _save_job(client, job_id, meta)
    client.zrem(PROCESSING_KEY, job_id)
    client.delete(_payload_key(job_id))
    _release_lock(client, job_id)
    _durable_upsert(job_id, meta)
    _notify_user(int(meta.get("user_id") or 0), meta)


def process_next_tryon_job(*, block_seconds: int = 5) -> bool:
    """Worker: navbatdan 1 ta ishni olib Vertex ga yuboradi."""
    from django.db import close_old_connections

    close_old_connections()
    client = _redis_client(blocking=True)
    if client is None:
        return False

    mark_worker_heartbeat(client)
    provider_name = _active_provider_name()
    if _cooldown_until(client, provider_name) > time.time():
        _sleep_while_cooling(client, provider_name, max_seconds=max(1.0, float(block_seconds)))
        return False

    try:
        promote_delayed_jobs(client)
    except Exception:
        logger.debug("promote delayed failed", exc_info=True)

    try:
        popped = client.blpop(QUEUE_KEY, timeout=max(1, block_seconds))
    except Exception as exc:
        from redis.exceptions import TimeoutError as RedisTimeoutError

        if isinstance(exc, (RedisTimeoutError, TimeoutError)):
            logger.debug("Try-on BRPOP timeout (navbat bo'sh yoki Redis sekin): %s", exc)
            return False
        raise
    if not popped:
        return False

    job_id = popped[1]
    owner = f"{_WORKER_ID}:{threading.get_ident()}"
    if not _claim_lock(client, job_id, owner):
        logger.info("Try-on skip already claimed job=%s", job_id)
        return True

    meta = _load_job(client, job_id)
    payload_raw = client.get(_payload_key(job_id))
    if meta is None:
        try:
            from ai.models import TryOnTask

            task = TryOnTask.objects.filter(pk=job_id).first()
            if task:
                meta = _task_to_meta(task)
                meta["status"] = STATUS_PROCESSING
        except Exception:
            meta = None
    if not payload_raw:
        recovered = _payload_from_db(job_id)
        if recovered:
            payload_raw = json.dumps(recovered)
            client.setex(_payload_key(job_id), _job_ttl(), payload_raw)

    if meta is None or not payload_raw:
        logger.warning("Try-on job missing payload/meta: %s", job_id)
        _release_lock(client, job_id)
        return True

    if str(meta.get("status")) == STATUS_CANCELLED:
        _release_lock(client, job_id)
        return True

    try:
        payload = json.loads(payload_raw)
    except json.JSONDecodeError:
        logger.warning("Try-on job invalid payload: %s", job_id)
        _release_lock(client, job_id)
        return True

    lease_until = time.time() + _lease_seconds()
    client.zadd(PROCESSING_KEY, {job_id: lease_until})
    meta["status"] = STATUS_PROCESSING
    meta["updated_at"] = _now_iso()
    meta["lease_owner"] = owner
    meta["queue_claim_count"] = int(meta.get("queue_claim_count") or 0) + 1
    meta.pop("queue_position", None)
    _save_job(client, job_id, meta)
    _durable_upsert(
        job_id,
        {
            **meta,
            "lease_until": timezone.now() + timedelta(seconds=_lease_seconds()),
        },
    )
    _notify_user(int(meta.get("user_id") or 0), {**meta, "status": STATUS_PROCESSING})

    user_id = int(meta.get("user_id") or 0) or None
    if user_id:
        from ai.morph_ops import check_user_can_generate

        blocked = check_user_can_generate(user_id=user_id, kind="tryon")
        if blocked:
            meta["status"] = STATUS_FAILED
            meta["detail"] = blocked
            meta["retryable"] = False
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
            meta["updated_at"] = _now_iso()
            _finish_terminal(client, job_id, meta)
            return True

    provider = _active_provider_name()
    if _job_too_old(meta):
        meta["status"] = STATUS_FAILED
        meta["detail"] = "Navbat vaqti tugadi. Qayta urinib ko'ring."
        meta["retryable"] = True
        meta.pop("preview_image", None)
        _metric_incr(client, "failed_total")
        meta["updated_at"] = _now_iso()
        _finish_terminal(client, job_id, meta)
        return True

    slot_started = time.time()
    slot_ok = acquire_provider_slot(
        client, provider, wait_seconds=max(SLOT_WAIT_SECONDS, float(block_seconds))
    )
    _metric_incr(client, "slot_wait_ms_sum", int((time.time() - slot_started) * 1000))
    _metric_incr(client, "slot_wait_count")
    if not slot_ok:
        delay = min(8.0, 1.5 + random.uniform(0.2, 1.2))
        cool_left = _cooldown_until(client, provider) - time.time()
        if cool_left > 0:
            delay = max(delay, cool_left)
        _requeue_later(client, job_id, meta, delay, reason="slot_wait")
        return True

    provider_attempts = _provider_attempts(meta) + 1
    meta["provider_attempt_count"] = provider_attempts
    meta["attempt_count"] = provider_attempts
    _metric_incr(client, "provider_http_attempts")
    queue_wait_ms = int(max(0.0, time.time() - _created_ts(meta)) * 1000)
    _metric_incr(client, "queue_wait_ms_sum", queue_wait_ms)
    _metric_incr(client, "queue_wait_count")
    _save_job(client, job_id, meta)

    generating_meta = {**meta, "status": STATUS_PROCESSING}
    _notify_user(int(meta.get("user_id") or 0), {**generating_meta, "phase": PHASE_GENERATING})

    try:
        with queue_generation_context():
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
                meta["retryable"] = False
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
                _metric_incr(client, "completed_total")
                _metric_incr(client, "latency_sum_ms", int(multi.get("latency_ms") or 0))
                _metric_incr(client, "latency_count")
                client.hset(METRICS_KEY, "last_generation_ms", int(multi.get("latency_ms") or 0))
                meta["updated_at"] = _now_iso()
                _save_result_photo(job_id, str(meta.get("preview_image") or ""), views)
                _finish_terminal(client, job_id, meta)
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
            meta["retryable"] = False
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
            _metric_incr(client, "completed_total")
            _metric_incr(client, "latency_sum_ms", int(result.latency_ms or 0))
            _metric_incr(client, "latency_count")
            client.hset(METRICS_KEY, "last_generation_ms", int(result.latency_ms or 0))
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
            _save_result_photo(job_id, result.preview_image)
            meta["updated_at"] = _now_iso()
            _finish_terminal(client, job_id, meta)
            logger.info("Try-on job finished: %s status=%s", job_id, meta.get("status"))
            return True
    except AiStyleError as exc:
        attempts = _provider_attempts(meta) or 1
        max_attempts = int(meta.get("max_attempts") or _max_retries())
        retryable = bool(getattr(exc, "retryable", exc.status in (429, 502, 503, 504)))
        if retryable and attempts < max_attempts:
            delay = _provider_backoff_seconds(attempts, getattr(exc, "retry_after", None))
            if exc.status == 429:
                set_provider_cooldown(client, provider, delay)
            else:
                delay = min(30.0, delay)
            _requeue_later(client, job_id, meta, float(delay), reason="provider")
            logger.warning(
                "Try-on job retrying (%s) status=%s provider_attempt=%s/%s delay=%.1fs",
                job_id,
                exc.status,
                attempts,
                max_attempts,
                float(delay),
            )
            return True
        meta["status"] = STATUS_FAILED
        meta["detail"] = exc.message
        meta["retryable"] = retryable
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
        _metric_incr(client, "failed_total")
        logger.warning("Try-on job failed (%s): %s", job_id, exc.message)
        meta["updated_at"] = _now_iso()
        _finish_terminal(client, job_id, meta)
        return True
    except Exception as exc:
        attempts = _provider_attempts(meta) or 1
        max_attempts = int(meta.get("max_attempts") or _max_retries())
        if attempts < max_attempts:
            delay = min(30.0, (2 ** max(0, attempts - 1)) + random.uniform(0.3, 1.5))
            _requeue_later(client, job_id, meta, delay, reason="provider")
            logger.exception("Try-on job error retry (%s): %s", job_id, exc)
            return True
        meta["status"] = STATUS_FAILED
        meta["detail"] = "Rasm yaratishda xatolik."
        meta["retryable"] = True
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
        _metric_incr(client, "failed_total")
        logger.exception("Try-on job error (%s): %s", job_id, exc)
        meta["updated_at"] = _now_iso()
        _finish_terminal(client, job_id, meta)
        return True
    finally:
        release_provider_slot(client, provider)
        close_old_connections()
