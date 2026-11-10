from datetime import timedelta

from django.conf import settings
from django.utils import timezone


def payment_outcome(payment, now=None) -> str:
    """Display outcome. Does not invent a provider failure reason.

    Expired wins over abandoned when a successful poll still shows Payme state 0
    after the documented receipt TTL. Abandoned is only the lack of a terminal
    provider result after the observation window.
    """
    now = now or timezone.now()
    status = payment.status or "pending"
    if status != "pending":
        return status
    age = now - payment.created_at
    ttl = timedelta(minutes=int(getattr(settings, "PAYME_RECEIPT_TTL_MINUTES", 60)))
    abandon = timedelta(minutes=int(getattr(settings, "ANALYTICS_ABANDON_AFTER_MINUTES", 24 * 60)))
    verified_pending = payment.last_verified_at is not None and payment.payme_state == 0
    if verified_pending and age >= ttl:
        return "expired"
    if payment.abandoned_at is not None or (payment.last_verified_at is None and age >= abandon):
        return "abandoned"
    return "pending"


def classify_abandoned(payment, now=None) -> bool:
    """Persist abandonment only. Pending status is left unchanged."""
    now = now or timezone.now()
    if payment.status != "pending" or payment.abandoned_at is not None:
        return False
    if payment_outcome(payment, now) != "abandoned":
        return False
    payment.abandoned_at = now
    payment.outcome_source = "inferred"
    payment.save(update_fields=["abandoned_at", "outcome_source", "updated_at"])
    return True
