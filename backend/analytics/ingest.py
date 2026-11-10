"""Event ingest, sessions, and visitor linking. Failures stay inside this module."""

from __future__ import annotations

import logging
import re
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from analytics.attribution import apply_attribution, clean_utm, device_category
from analytics.constants import CLIENT_EVENTS, EVENT_VERSION, FORBIDDEN_CLIENT_EVENTS
from analytics.models import AnalyticsEvent, AnalyticsSession
from control_panel.models import SiteVisitor

logger = logging.getLogger(__name__)

_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
_EVENT_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]{8,80}$")
_SECRET_PARTS = ("password", "token", "otp", "secret", "card", "cvv", "pan", "authorization", "cookie")
_MAX_EVENTS = 20


def clip(value, limit: int) -> str:
    text = value if isinstance(value, str) else ""
    return " ".join(text.split())[:limit]


def _secret(key: str) -> bool:
    lowered = key.lower()
    return any(part in lowered for part in _SECRET_PARTS)


def clean_properties(raw) -> dict:
    if not isinstance(raw, dict):
        return {}
    cleaned = {}
    for key, value in list(raw.items())[:20]:
        if not isinstance(key, str) or _secret(key):
            continue
        if isinstance(value, bool) or isinstance(value, (int, float)) and not isinstance(value, bool):
            cleaned[key[:40]] = value
        elif isinstance(value, str):
            cleaned[key[:40]] = clip(value, 120)
    return cleaned


def link_user(visitor: SiteVisitor, user) -> bool:
    """Link an anonymous visitor to the authenticated user. Never replace another user."""
    if user is None or not getattr(user, "is_authenticated", True):
        return False
    if visitor.user_id is None:
        visitor.user = user
        visitor.linked_at = timezone.now()
        return True
    return visitor.user_id == user.id


def touch_session(
    visitor: SiteVisitor,
    session_key: str,
    *,
    user=None,
    pageviews: int = 0,
    landing_path: str = "",
    referrer: str = "",
    user_agent: str = "",
) -> AnalyticsSession | None:
    if not session_key:
        return None
    now = timezone.now()
    idle = timedelta(minutes=int(getattr(settings, "ANALYTICS_SESSION_IDLE_MINUTES", 30)))
    session = (
        AnalyticsSession.objects.filter(visitor=visitor, session_key=session_key, ended_at__isnull=True)
        .order_by("-started_at")
        .first()
    )
    if session and session.last_activity_at < now - idle:
        session.ended_at = session.last_activity_at
        session.save(update_fields=["ended_at"])
        session = None
    if session is None:
        session = AnalyticsSession.objects.create(
            visitor=visitor,
            user=visitor.user if visitor.user_id else user,
            session_key=session_key,
            started_at=now,
            last_activity_at=now,
            pageviews=max(0, pageviews),
            landing_path=clip(landing_path, 300),
            device_category=device_category(user_agent),
            referrer=clip(referrer, 500),
            first_source=visitor.first_source,
            last_source=visitor.last_source,
            utm_source=visitor.last_utm_source,
            utm_medium=visitor.last_utm_medium,
            utm_campaign=visitor.last_utm_campaign,
            utm_content=visitor.last_utm_content,
            utm_term=visitor.last_utm_term,
        )
        return session
    session.last_activity_at = now
    session.pageviews += max(0, pageviews)
    if user and session.user_id is None and visitor.user_id == getattr(user, "id", None):
        session.user = user
    session.save(update_fields=["last_activity_at", "pageviews", "user"])
    return session


def _rate_limited(visitor_key: str) -> bool:
    limit = int(getattr(settings, "ANALYTICS_INGEST_PER_MINUTE", 120))
    key = f"analytics-ingest:{visitor_key}"
    try:
        if cache.add(key, 1, timeout=60):
            return False
        hits = cache.incr(key)
    except Exception:
        logger.warning("analytics rate limit cache unavailable")
        return False
    return hits > limit


def _occurred_at(raw):
    now = timezone.now()
    if not raw:
        return now
    if not isinstance(raw, str):
        return None
    parsed = parse_datetime(raw)
    if parsed is None:
        return None
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.utc)
    if parsed > now + timedelta(minutes=5) or parsed < now - timedelta(days=7):
        return None
    return parsed


def ingest_client_events(body: dict, *, user=None, user_agent: str = "") -> tuple[int, dict]:
    visitor_key = clip(body.get("visitor_id"), 64)
    session_key = clip(body.get("session_id"), 64)
    if not _KEY_RE.match(visitor_key) or not _KEY_RE.match(session_key):
        return 400, {"ok": False, "error": "invalid_identity"}
    raw_events = body.get("events")
    if not isinstance(raw_events, list) or not raw_events:
        return 400, {"ok": False, "error": "events_required"}
    if any(isinstance(item, dict) and item.get("name") in FORBIDDEN_CLIENT_EVENTS for item in raw_events):
        return 400, {"ok": False, "error": "forbidden_event"}
    if _rate_limited(visitor_key):
        return 429, {"ok": False, "dropped": True}

    utm = clean_utm(body.get("utm"))
    referrer = clip(body.get("referrer"), 500)
    visitor, created = SiteVisitor.objects.get_or_create(
        visitor_key=visitor_key,
        defaults={
            "session_key": session_key,
            "visit_count": 1,
            "user_agent": clip(user_agent, 255),
            "device_label": device_category(user_agent),
        },
    )
    fields = []
    if not created and visitor.session_key != session_key:
        visitor.session_key = session_key
        visitor.visit_count += 1
        fields.extend(["session_key", "visit_count"])
    if link_user(visitor, user):
        fields.extend(["user", "linked_at"])
    fields.extend(apply_attribution(visitor, utm=utm, referrer=referrer, created=created))
    if user_agent and visitor.user_agent != clip(user_agent, 255):
        visitor.user_agent = clip(user_agent, 255)
        visitor.device_label = device_category(user_agent)
        fields.extend(["user_agent", "device_label"])
    if fields:
        visitor.save(update_fields=list(dict.fromkeys(fields + ["last_seen"])))

    session = touch_session(
        visitor,
        session_key,
        user=user,
        pageviews=0,
        landing_path=clip(raw_events[0].get("page"), 300) if isinstance(raw_events[0], dict) else "",
        referrer=referrer,
        user_agent=user_agent,
    )
    accepted = 0
    duplicates = 0
    for item in raw_events[:_MAX_EVENTS]:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if name not in CLIENT_EVENTS:
            continue
        event_id = clip(item.get("event_id"), 80)
        if not _EVENT_ID_RE.match(event_id):
            continue
        occurred = _occurred_at(item.get("occurred_at"))
        if occurred is None:
            continue
        if AnalyticsEvent.objects.filter(client_event_id=event_id).exists():
            duplicates += 1
            continue
        try:
            with transaction.atomic():
                AnalyticsEvent.objects.create(
                    client_event_id=event_id,
                    name=name,
                    version=int(item.get("version") or EVENT_VERSION),
                    occurred_at=occurred,
                    visitor=visitor,
                    session=session,
                    user=visitor.user,
                    page=clip(item.get("page"), 300),
                    status=clip(item.get("status"), 32),
                    properties=clean_properties(item.get("properties")),
                )
            accepted += 1
            if name == "checkout_redirect_attempted" and user is not None:
                _stamp_redirect(user, clean_properties(item.get("properties")), occurred)
        except IntegrityError:
            duplicates += 1
    return 200, {"ok": True, "accepted": accepted, "duplicates": duplicates}


def _stamp_redirect(user, properties: dict, occurred):
    order_id = properties.get("order_id")
    if not isinstance(order_id, str) or not order_id.startswith("sub-"):
        return
    from subscriptions.models import SubscriptionPayment

    SubscriptionPayment.objects.filter(
        user=user,
        order_id=order_id[:128],
        redirect_attempted_at__isnull=True,
    ).update(redirect_attempted_at=occurred)
