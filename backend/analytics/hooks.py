"""Authoritative analytics writes. Never raise into Payme or signup."""

from __future__ import annotations

import logging

from django.db import transaction
from django.utils import timezone

from analytics.constants import EVENT_VERSION
from analytics.ingest import clip, link_user
from analytics.models import AnalyticsEvent, AnalyticsTrackingState

logger = logging.getLogger(__name__)

_PAYMENT_EVENT = {
    "paid": "payment_confirmed",
    "failed": "payment_failed",
    "cancelled": "payment_cancelled",
    "expired": "payment_expired",
    "refunded": "payment_refunded",
    "pending": "payment_pending",
}


def _safe(fn):
    try:
        fn()
    except Exception:
        logger.exception("analytics hook failed")


def _schedule(fn):
    def runner():
        _safe(fn)

    try:
        transaction.on_commit(runner)
    except Exception:
        _safe(fn)


def record_server_event(*, name: str, client_event_id: str, user=None, visitor=None, payment=None, page: str = "", status: str = "", properties=None, occurred_at=None):
    if AnalyticsEvent.objects.filter(client_event_id=client_event_id).exists():
        return None
    return AnalyticsEvent.objects.create(
        client_event_id=client_event_id[:80],
        name=name,
        version=EVENT_VERSION,
        occurred_at=occurred_at or timezone.now(),
        visitor=visitor,
        user=user,
        payment=payment,
        page=page[:300],
        status=status[:32],
        properties=properties or {},
    )


def mark_dates_stale(moments):
    from analytics.models import AnalyticsDailySnapshot

    days = set()
    for moment in moments:
        if moment is None:
            continue
        days.add(timezone.localtime(moment).date())
    if not days:
        return
    AnalyticsDailySnapshot.objects.filter(date__in=days).update(stale=True)


def tracking_since():
    state = AnalyticsTrackingState.objects.order_by("id").first()
    if state is None:
        state = AnalyticsTrackingState.objects.create(named_events_since=timezone.now())
    return state.named_events_since


def visitor_keys_from_request(request) -> tuple[str, str]:
    if request is None:
        return "", ""
    data = request.data if isinstance(getattr(request, "data", None), dict) else {}
    headers = getattr(request, "headers", {})
    visitor = clip(data.get("visitor_id") or headers.get("X-Visitor-Id"), 64)
    session = clip(data.get("session_id") or headers.get("X-Analytics-Session"), 64)
    from analytics.ingest import _KEY_RE

    if not _KEY_RE.match(visitor):
        visitor = ""
    if not _KEY_RE.match(session):
        session = ""
    return visitor, session


def attach_payment_context(payment, request):
    visitor_key, session_key = visitor_keys_from_request(request)
    fields = []
    if visitor_key and not payment.visitor_key:
        payment.visitor_key = visitor_key
        fields.append("visitor_key")
    if session_key and not payment.session_key:
        payment.session_key = session_key
        fields.append("session_key")
    if fields:
        payment.save(update_fields=fields + ["updated_at"])
    payment_id = payment.pk

    def write():
        from subscriptions.models import SubscriptionPayment

        row = SubscriptionPayment.objects.filter(pk=payment_id).select_related("user").first()
        if row is None:
            return
        record_server_event(
            name="payment_transaction_created",
            client_event_id=f"server:payment_transaction_created:{payment_id}",
            user=row.user,
            payment=row,
            status=row.status,
            occurred_at=row.created_at,
            properties={"plan_code": row.plan_code, "provider": row.provider},
        )
        mark_dates_stale([row.created_at])

    _schedule(write)


def note_payment_transition(payment, previous_status: str, new_status: str):
    if previous_status == new_status:
        if previous_status == "paid":
            payment_id = payment.pk

            def duplicate_once():
                from subscriptions.models import SubscriptionPayment

                row = SubscriptionPayment.objects.filter(pk=payment_id).select_related("user").first()
                if row is None:
                    return
                record_server_event(
                    name="duplicate_payment_verification",
                    client_event_id=f"server:duplicate_payment_verification:{payment_id}",
                    user=row.user,
                    payment=row,
                    status="paid",
                )

            _schedule(duplicate_once)
        return
    event_name = _PAYMENT_EVENT.get(new_status)
    if not event_name:
        return
    payment_id = payment.pk

    def write():
        from subscriptions.models import SubscriptionPayment

        row = SubscriptionPayment.objects.filter(pk=payment_id).select_related("user").first()
        if row is None:
            return
        record_server_event(
            name=event_name,
            client_event_id=f"server:{event_name}:{payment_id}",
            user=row.user,
            payment=row,
            status=new_status,
            occurred_at=row.paid_at or row.completed_at or timezone.now(),
            properties={"plan_code": row.plan_code, "provider": row.provider, "payme_state": row.payme_state},
        )
        mark_dates_stale([row.paid_at, row.created_at, row.completed_at])
        if new_status == "paid" and row.plan_code != "flash" and row.subscription_id is None:
            record_server_event(
                name="payment_completed_without_activation",
                client_event_id=f"server:payment_completed_without_activation:{payment_id}",
                user=row.user,
                payment=row,
                status="paid",
            )

    _schedule(write)


def note_subscription_activated(subscription_id):
    def write():
        from subscriptions.models import UserSubscription

        sub = UserSubscription.objects.filter(pk=subscription_id).select_related("user").first()
        if sub is None:
            return
        record_server_event(
            name="subscription_activated",
            client_event_id=f"server:subscription_activated:{subscription_id}",
            user=sub.user,
            status=sub.status,
            occurred_at=sub.starts_at or sub.created_at,
            properties={"plan_code": sub.plan_code, "source": sub.source, "price_uzs": str(sub.price_uzs)},
        )
        mark_dates_stale([sub.starts_at, sub.created_at])

    _schedule(write)


def note_activation_failed(payment, reason: str):
    payment_id = payment.pk

    def write():
        from subscriptions.models import SubscriptionPayment

        row = SubscriptionPayment.objects.filter(pk=payment_id).select_related("user").first()
        if row is None:
            return
        record_server_event(
            name="subscription_activation_failed",
            client_event_id=f"server:subscription_activation_failed:{payment_id}",
            user=row.user,
            payment=row,
            status="failed",
            properties={"reason": clip(reason, 120)},
        )

    _schedule(write)


def link_request_visitor(request, user):
    def write():
        from control_panel.models import SiteVisitor

        visitor_key, _session = visitor_keys_from_request(request)
        if not visitor_key or user is None:
            return
        visitor = SiteVisitor.objects.filter(visitor_key=visitor_key).first()
        if visitor is None:
            return
        if link_user(visitor, user):
            visitor.save(update_fields=["user", "linked_at"])

    _safe(write)
