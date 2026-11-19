"""Hair advisor background work — DB-backed jobs + post-commit thread."""

from __future__ import annotations

import logging
import threading
from typing import Callable

from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)
MAX_ATTEMPTS = 5


def run_after_commit(func: Callable[[], None]) -> None:
    def _wrapper():
        try:
            func()
        except Exception:
            logger.exception("hair_advisor background task failed")

    transaction.on_commit(lambda: threading.Thread(target=_wrapper, daemon=True).start())


def process_aggregation_job(submission_id) -> bool:
    from hair_advisor.models import ProductAggregationJob, ProductSubmission
    from hair_advisor.services.aggregation import aggregate_submission

    job = ProductAggregationJob.objects.filter(submission_id=submission_id).first()
    sub = ProductSubmission.objects.filter(pk=submission_id).first()
    if sub is None:
        if job:
            job.status = ProductAggregationJob.Status.FAILED
            job.last_error = "submission missing"
            job.save(update_fields=["status", "last_error", "updated_at"])
        return False

    if job is None:
        job = ProductAggregationJob.objects.create(submission=sub, status=ProductAggregationJob.Status.PENDING)

    if job.status == ProductAggregationJob.Status.DONE:
        return True

    job.status = ProductAggregationJob.Status.PROCESSING
    job.attempts += 1
    job.save(update_fields=["status", "attempts", "updated_at"])

    try:
        aggregate_submission(sub)
        job.status = ProductAggregationJob.Status.DONE
        job.last_error = ""
        job.save(update_fields=["status", "last_error", "updated_at"])
        return True
    except Exception as exc:
        logger.exception("aggregation failed submission=%s", submission_id)
        job.status = (
            ProductAggregationJob.Status.FAILED
            if job.attempts >= MAX_ATTEMPTS
            else ProductAggregationJob.Status.PENDING
        )
        job.last_error = str(exc)[:400]
        job.updated_at = timezone.now()
        job.save(update_fields=["status", "last_error", "updated_at"])
        return False


def defer_aggregate_submission(submission_id) -> None:
    from hair_advisor.models import ProductAggregationJob, ProductSubmission

    sub = ProductSubmission.objects.filter(pk=submission_id).first()
    if sub is None:
        return
    ProductAggregationJob.objects.get_or_create(
        submission=sub,
        defaults={"status": ProductAggregationJob.Status.PENDING},
    )

    if getattr(settings, "HAIR_ADVISOR_SYNC_AGGREGATION", False):
        process_aggregation_job(submission_id)
        return

    run_after_commit(lambda: process_aggregation_job(submission_id))


def process_pending_aggregation_jobs(*, limit: int = 50) -> int:
    from hair_advisor.models import ProductAggregationJob

    done = 0
    qs = ProductAggregationJob.objects.filter(
        status__in=[ProductAggregationJob.Status.PENDING, ProductAggregationJob.Status.FAILED]
    ).order_by("created_at")[:limit]
    for job in qs:
        if job.attempts >= MAX_ATTEMPTS:
            continue
        if process_aggregation_job(job.submission_id):
            done += 1
    return done