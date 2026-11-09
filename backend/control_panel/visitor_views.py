"""Sayt tashriflari: ochiq yig'ish va admin statistikasi."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta

from django.core.cache import cache
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin

from .models import SiteVisitEvent, SiteVisitor

_KEY_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
_MAX_EVENTS = 25


def _client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR") or ""
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return (request.META.get("REMOTE_ADDR") or "")[:64]


def _device_label(user_agent: str) -> str:
    ua = user_agent or ""
    if "iPhone" in ua or "iPad" in ua:
        return "iPhone / iPad"
    if "Android" in ua:
        return "Android"
    if "Macintosh" in ua:
        return "Mac"
    if "Windows" in ua:
        return "Windows"
    if "Linux" in ua:
        return "Linux"
    if "Mobile" in ua:
        return "Mobil brauzer"
    return "Brauzer" if ua else ""


def _clip(value, limit: int) -> str:
    text = value if isinstance(value, str) else ""
    text = " ".join(text.split())
    return text[:limit]


def _linked_user(request):
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False) and isinstance(user, User):
        return user
    return None


class TelemetryCollectView(APIView):
    """POST — har bir tashrifchi sahifa va bosishlarini yuboradi. Auth shart emas."""

    permission_classes = [AllowAny]
    throttle_classes = []

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        visitor_key = _clip(body.get("visitor_id"), 64)
        session_key = _clip(body.get("session_id"), 64)
        if not _KEY_RE.match(visitor_key) or not _KEY_RE.match(session_key):
            return Response({"ok": False}, status=400)

        bucket = f"telemetry:{visitor_key}"
        hits = cache.get(bucket, 0)
        if hits >= 40:
            return Response({"ok": True, "dropped": True})
        cache.set(bucket, hits + 1, 60)

        raw_events = body.get("events")
        if not isinstance(raw_events, list):
            raw_events = []
        events = []
        for item in raw_events[:_MAX_EVENTS]:
            if not isinstance(item, dict):
                continue
            kind = item.get("kind")
            if kind not in (SiteVisitEvent.Kind.PAGE, SiteVisitEvent.Kind.CLICK):
                continue
            events.append(
                {
                    "kind": kind,
                    "path": _clip(item.get("path"), 300),
                    "label": _clip(item.get("label"), 120),
                }
            )

        now = timezone.now()
        ua = _clip(request.META.get("HTTP_USER_AGENT"), 255)
        language = _clip(request.META.get("HTTP_ACCEPT_LANGUAGE"), 32).split(",")[0]
        referrer = _clip(body.get("referrer") or request.META.get("HTTP_REFERER"), 500)
        ip = _client_ip(request)
        user = _linked_user(request)

        visitor, created = SiteVisitor.objects.get_or_create(
            visitor_key=visitor_key,
            defaults={
                "session_key": session_key,
                "visit_count": 1,
                "first_path": events[0]["path"] if events else "",
                "last_path": events[-1]["path"] if events else "",
                "referrer": referrer,
                "language": language,
                "user_agent": ua,
                "device_label": _device_label(ua),
                "ip_address": ip,
                "user": user,
            },
        )

        pageviews = sum(1 for event in events if event["kind"] == SiteVisitEvent.Kind.PAGE)
        clicks = sum(1 for event in events if event["kind"] == SiteVisitEvent.Kind.CLICK)
        if not created:
            visitor.session_key = visitor.session_key or session_key
            if visitor.session_key != session_key:
                visitor.session_key = session_key
                visitor.visit_count += 1
            if events:
                visitor.last_path = events[-1]["path"] or visitor.last_path
            if not visitor.first_path and events:
                visitor.first_path = events[0]["path"]
            if referrer and not visitor.referrer:
                visitor.referrer = referrer
            if language:
                visitor.language = language
            if ua:
                visitor.user_agent = ua
                visitor.device_label = _device_label(ua)
            if ip:
                visitor.ip_address = ip
            if user and visitor.user_id != user.id:
                visitor.user = user
            visitor.pageview_count += pageviews
            visitor.click_count += clicks
            visitor.last_seen = now
            visitor.save(
                update_fields=[
                    "session_key",
                    "visit_count",
                    "last_path",
                    "first_path",
                    "referrer",
                    "language",
                    "user_agent",
                    "device_label",
                    "ip_address",
                    "user",
                    "pageview_count",
                    "click_count",
                    "last_seen",
                ]
            )
        else:
            if pageviews or clicks:
                visitor.pageview_count = pageviews
                visitor.click_count = clicks
                visitor.save(update_fields=["pageview_count", "click_count"])

        if events:
            SiteVisitEvent.objects.bulk_create(
                [
                    SiteVisitEvent(
                        visitor=visitor,
                        kind=event["kind"],
                        path=event["path"],
                        label=event["label"],
                    )
                    for event in events
                ]
            )

        return Response({"ok": True})


def _visitor_row(visitor: SiteVisitor) -> dict:
    user = visitor.user
    name = ""
    phone = ""
    if user is not None:
        name = (user.full_name or user.get_full_name() or "").strip()
        phone = user.phone or ""
    return {
        "id": visitor.id,
        "visitorKey": visitor.visitor_key,
        "name": name or "Mehmon",
        "phone": phone,
        "userId": visitor.user_id,
        "device": visitor.device_label,
        "language": visitor.language,
        "ip": visitor.ip_address,
        "firstPath": visitor.first_path,
        "lastPath": visitor.last_path,
        "referrer": visitor.referrer,
        "visits": visitor.visit_count,
        "pageviews": visitor.pageview_count,
        "clicks": visitor.click_count,
        "firstSeen": visitor.first_seen.isoformat() if visitor.first_seen else None,
        "lastSeen": visitor.last_seen.isoformat() if visitor.last_seen else None,
    }


class AdminSiteVisitorsView(APIView):
    """GET — tashrif buyuruvchilar va ularning harakatlari."""

    permission_classes = [IsAdmin]

    def get(self, request):
        days_raw = request.query_params.get("days", "30")
        try:
            days = max(1, min(90, int(days_raw)))
        except (TypeError, ValueError):
            days = 30

        now = timezone.now()
        start = now - timedelta(days=days)
        today = timezone.localdate()
        online_since = now - timedelta(minutes=5)

        visitors = SiteVisitor.objects.select_related("user")
        in_range = visitors.filter(last_seen__gte=start)
        summary = {
            "total": visitors.count(),
            "rangeVisitors": in_range.count(),
            "today": visitors.filter(last_seen__date=today).count(),
            "online": visitors.filter(last_seen__gte=online_since).count(),
            "pageviews": SiteVisitEvent.objects.filter(
                created_at__gte=start, kind=SiteVisitEvent.Kind.PAGE
            ).count(),
            "clicks": SiteVisitEvent.objects.filter(
                created_at__gte=start, kind=SiteVisitEvent.Kind.CLICK
            ).count(),
            "newVisitors": visitors.filter(first_seen__gte=start).count(),
        }

        daily_rows = (
            SiteVisitEvent.objects.filter(created_at__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                pageviews=Count("id", filter=models_page_filter()),
                clicks=Count("id", filter=models_click_filter()),
            )
            .order_by("day")
        )
        by_day = {}
        for row in daily_rows:
            day_key = row["day"]
            if isinstance(day_key, datetime):
                day_key = day_key.date()
            if isinstance(day_key, date):
                by_day[day_key] = row
        daily = []
        for offset in range(days - 1, -1, -1):
            day = (timezone.localdate() - timedelta(days=offset))
            row = by_day.get(day)
            daily.append(
                {
                    "date": day.isoformat(),
                    "pageviews": int(row["pageviews"]) if row else 0,
                    "clicks": int(row["clicks"]) if row else 0,
                }
            )

        recent = [_visitor_row(item) for item in in_range.order_by("-last_seen")[:80]]

        events = []
        visitor_id = request.query_params.get("visitor")
        if visitor_id:
            try:
                selected_id = int(visitor_id)
            except (TypeError, ValueError):
                selected_id = 0
            if selected_id:
                events = [
                    {
                        "id": event.id,
                        "kind": event.kind,
                        "path": event.path,
                        "label": event.label,
                        "at": event.created_at.isoformat(),
                    }
                    for event in SiteVisitEvent.objects.filter(visitor_id=selected_id).order_by("-created_at")[:120]
                ]

        return Response(
            {
                "days": days,
                "summary": summary,
                "daily": daily,
                "visitors": recent,
                "events": events,
            }
        )


def models_page_filter():
    from django.db.models import Q

    return Q(kind=SiteVisitEvent.Kind.PAGE)


def models_click_filter():
    from django.db.models import Q

    return Q(kind=SiteVisitEvent.Kind.CLICK)
