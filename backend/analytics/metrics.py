"""Aggregates from real visitor, payment, subscription, and AI rows."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db.models import Count, Exists, Min, OuterRef, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.models import User
from ai.models import AiGenerationUsage, TryOnTask
from analytics.compare import compare_numbers
from analytics.constants import (
    FUNNEL_STAGES,
    STAGE_LABELS,
    UNAVAILABLE_BEFORE_TRACKING,
)
from analytics.funnel_logic import group_hits, strict_funnel
from analytics.hooks import tracking_since
from analytics.models import AnalyticsAdCost, AnalyticsEvent, AnalyticsSession
from analytics.outcomes import payment_outcome
from control_panel.models import SiteVisitEvent, SiteVisitor
from subscriptions.models import SubscriptionPayment, UserSubscription

_STAGE_INDEX = {name: index for index, name in enumerate(FUNNEL_STAGES)}
_EVENT_STAGE = {
    "page_view": "website_visited",
    "session_start": "website_visited",
    "registration_completed": "account_registered",
    "premium_page_viewed": "premium_page_viewed",
    "premium_offer_viewed": "premium_offer_viewed",
    "subscription_plan_selected": "subscription_plan_selected",
    "subscribe_clicked": "subscribe_clicked",
    "payment_initiated": "payment_initiated",
    "payment_transaction_created": "payment_transaction_created",
    "checkout_redirect_attempted": "checkout_redirect_attempted",
    "payment_pending": "payment_pending",
    "payment_confirmed": "payment_confirmed",
    "subscription_activated": "subscription_activated",
}


def _day(value):
    if hasattr(value, "date") and not hasattr(value, "year"):
        return value
    if hasattr(value, "date"):
        return value.date()
    return value


def _uzs(value):
    if value is None:
        return 0
    return int(Decimal(value).quantize(Decimal("1")))


def _usd(value):
    if value is None:
        return None
    return str(Decimal(value).quantize(Decimal("0.000001")))


def _tracks(end) -> bool:
    cutoff = tracking_since()
    return cutoff is not None and end > cutoff


def _before_tracking(start) -> bool:
    cutoff = tracking_since()
    return cutoff is None or start < cutoff


def visitor_counts(start, end) -> dict:
    pages = SiteVisitEvent.objects.filter(created_at__gte=start, created_at__lt=end, kind=SiteVisitEvent.Kind.PAGE)
    any_events = SiteVisitEvent.objects.filter(created_at__gte=start, created_at__lt=end)
    unique = pages.values("visitor_id").distinct().count()
    new = SiteVisitor.objects.filter(first_seen__gte=start, first_seen__lt=end).count()
    returning = pages.filter(visitor__first_seen__lt=start).values("visitor_id").distinct().count()
    anonymous = pages.filter(visitor__user__isnull=True).values("visitor_id").distinct().count()
    linked = pages.filter(visitor__user__isnull=False).values("visitor_id").distinct().count()
    active = pages.values("visitor_id").annotate(n=Count("id")).filter(n__gte=2).count()
    registrations = User.objects.filter(date_joined__gte=start, date_joined__lt=end).count()
    pageviews = pages.count()
    tracked = _tracks(end)
    session_qs = AnalyticsSession.objects.filter(started_at__gte=start, started_at__lt=end)
    sessions = session_qs.count() if tracked else None
    avg_duration = None
    avg_pages = None
    bounce_rate = None
    engagement_rate = None
    if tracked:
        idle_before = timezone.now() - timedelta(minutes=int(getattr(settings, "ANALYTICS_SESSION_IDLE_MINUTES", 30)))
        closed = session_qs.filter(Q(ended_at__isnull=False) | Q(last_activity_at__lt=idle_before))
        closed_count = closed.count()
        if closed_count:
            durations = []
            pages_per = []
            for started, ended, last, views, session_id in closed.values_list(
                "started_at", "ended_at", "last_activity_at", "pageviews", "id"
            ):
                finish = ended or last
                durations.append(max(0, (finish - started).total_seconds()))
                pages_per.append(views)
            avg_duration = round(sum(durations) / len(durations), 1)
            avg_pages = round(sum(pages_per) / len(pages_per), 2)
            engaged_ids = set(
                AnalyticsEvent.objects.filter(session_id__in=closed.values("id"), name__in=_engagement_names()).values_list(
                    "session_id", flat=True
                )
            )
            bounces = 0
            for views, session_id in closed.values_list("pageviews", "id"):
                if views <= 1 and session_id not in engaged_ids:
                    bounces += 1
            bounce_rate = round(bounces / closed_count * 100, 1)
            engagement_rate = round(100 - bounce_rate, 1)
    reg_rate = round(registrations / unique * 100, 1) if unique else None
    return {
        "total_visitors": sessions if sessions is not None else unique,
        "total_visitors_basis": "sessions" if sessions is not None else "unique_people",
        "unique_visitors": unique,
        "new_visitors": new,
        "returning_visitors": returning,
        "active_visitors": active,
        "registered_users": registrations,
        "anonymous_visitors": anonymous,
        "linked_visitors": linked,
        "sessions": sessions,
        "page_views": pageviews,
        "events": any_events.count(),
        "avg_session_seconds": avg_duration,
        "avg_pages_per_session": avg_pages,
        "bounce_rate": bounce_rate,
        "engagement_rate": engagement_rate,
        "registration_conversion": reg_rate,
        "sessions_available": tracked,
    }


def _engagement_names():
    from analytics.constants import ENGAGEMENT_EVENTS

    return ENGAGEMENT_EVENTS


def _ns(**kwargs):
    return type("Row", (), kwargs)()


def payment_counts(start, end, now=None) -> dict:
    now = now or timezone.now()
    created = list(
        SubscriptionPayment.objects.filter(created_at__gte=start, created_at__lt=end).values(
            "id",
            "user_id",
            "status",
            "created_at",
            "last_verified_at",
            "payme_state",
            "abandoned_at",
            "amount_uzs",
            "paid_at",
            "plan_code",
            "subscription_id",
            "redirect_attempted_at",
            "provider",
        )
    )
    buckets = {key: 0 for key in ("pending", "paid", "failed", "cancelled", "expired", "refunded", "abandoned")}
    users = set()
    redirected = 0
    for row in created:
        users.add(row["user_id"])
        outcome = payment_outcome(_ns(**row), now)
        buckets[outcome] = buckets.get(outcome, 0) + 1
        if row["redirect_attempted_at"]:
            redirected += 1
    paid_qs = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID, paid_at__gte=start, paid_at__lt=end)
    paid_agg = paid_qs.aggregate(total=Sum("amount_uzs"), n=Count("id"), users=Count("user_id", distinct=True), avg=Sum("amount_uzs"))
    refunded_total = SubscriptionPayment.objects.filter(
        status=SubscriptionPayment.Status.REFUNDED, updated_at__gte=start, updated_at__lt=end
    ).aggregate(total=Sum("amount_uzs"))["total"]
    confirmed = _uzs(paid_agg["total"])
    refunded = _uzs(refunded_total)
    attempts = len(created)
    confirmed_count = paid_qs.count()
    success_rate = round(confirmed_count / attempts * 100, 1) if attempts else None
    checkout_rate = round(confirmed_count / redirected * 100, 1) if redirected else None
    avg_amount = round(confirmed / confirmed_count, 2) if confirmed_count else None
    activation_gaps = SubscriptionPayment.objects.filter(
        status=SubscriptionPayment.Status.PAID,
        paid_at__gte=start,
        paid_at__lt=end,
        subscription__isnull=True,
    ).exclude(plan_code="flash").count()
    activation_failures = AnalyticsEvent.objects.filter(
        name="subscription_activation_failed", occurred_at__gte=start, occurred_at__lt=end
    ).count()
    return {
        "attempts": attempts,
        "unique_users": len(users),
        "successful": confirmed_count,
        "failed": buckets["failed"],
        "cancelled": buckets["cancelled"],
        "expired": buckets["expired"],
        "pending": buckets["pending"],
        "abandoned": buckets["abandoned"],
        "refunded_count": buckets["refunded"],
        "redirect_attempted": redirected,
        "success_rate": success_rate,
        "checkout_to_payment_rate": checkout_rate,
        "average_amount_uzs": avg_amount,
        "confirmed_revenue_uzs": confirmed,
        "refunded_uzs": refunded,
        "net_revenue_uzs": confirmed - refunded,
        "activation_gaps": activation_gaps,
        "activation_failures": activation_failures,
        "paid_users": paid_agg["users"] or 0,
    }


def revenue_report(start, end, now=None) -> dict:
    now = now or timezone.now()
    payments = payment_counts(start, end, now)
    paid = SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID, paid_at__gte=start, paid_at__lt=end)
    premium = paid.exclude(plan_code="flash").aggregate(total=Sum("amount_uzs"))["total"]
    first_paid = (
        SubscriptionPayment.objects.filter(status__in=[SubscriptionPayment.Status.PAID, SubscriptionPayment.Status.REFUNDED])
        .exclude(paid_at=None)
        .values("user_id")
        .annotate(first_paid=Min("paid_at"))
    )
    new_paying = first_paid.filter(first_paid__gte=start, first_paid__lt=end).count()
    paying_ids = set(paid.values_list("user_id", flat=True))
    earlier = set(
        SubscriptionPayment.objects.filter(user_id__in=paying_ids, paid_at__lt=start)
        .exclude(paid_at=None)
        .values_list("user_id", flat=True)
    )
    returning = len(paying_ids & earlier)
    active = UserSubscription.objects.filter(
        price_uzs__gt=0,
        starts_at__lte=now,
        ends_at__gt=now,
    ).filter(Q(status=UserSubscription.Status.ACTIVE) | Q(status=UserSubscription.Status.CANCELLED, cancelled_at__isnull=False))
    entitlement = _uzs(active.aggregate(total=Sum("price_uzs"))["total"])
    expired = UserSubscription.objects.filter(status=UserSubscription.Status.EXPIRED, ends_at__gte=start, ends_at__lt=end).count()
    cancelled = UserSubscription.objects.filter(status=UserSubscription.Status.CANCELLED, cancelled_at__gte=start, cancelled_at__lt=end).count()
    visitors = visitor_counts(start, end)["unique_visitors"]
    paying = payments["paid_users"]
    net = payments["net_revenue_uzs"]
    return {
        "confirmed_revenue_uzs": payments["confirmed_revenue_uzs"],
        "premium_revenue_uzs": _uzs(premium),
        "new_paying_customers": new_paying,
        "returning_paying_customers": returning,
        "active_paid_subscriptions": active.count(),
        "expired_subscriptions": expired,
        "cancelled_subscriptions": cancelled,
        "refunded_uzs": payments["refunded_uzs"],
        "net_revenue_uzs": net,
        "arppu_uzs": round(net / paying, 2) if paying else None,
        "arpu_uzs": round(net / visitors, 2) if visitors else None,
        "mrr": None,
        "mrr_available": False,
        "mrr_reason": "no_recurring_billing",
        "active_entitlement_value_uzs": entitlement,
        "revenue_conversion": round(paying / visitors * 100, 1) if visitors else None,
        "pending_excluded": True,
    }


def ai_report(start, end) -> dict:
    usage = AiGenerationUsage.objects.filter(created_at__gte=start, created_at__lt=end, kind=AiGenerationUsage.Kind.TRYON)
    requests = usage.count()
    successes = usage.filter(status=AiGenerationUsage.Status.SUCCESS).count()
    failures = usage.filter(status=AiGenerationUsage.Status.FAILED).count()
    finished = successes + failures
    tasks = TryOnTask.objects.filter(created_at__gte=start, created_at__lt=end)
    recorded_rows = usage.filter(tokens_estimated=False)
    estimated_rows = usage.filter(tokens_estimated=True)
    recorded = recorded_rows.aggregate(total=Sum("cost_usd"))["total"] if recorded_rows.exists() else None
    estimated = estimated_rows.aggregate(total=Sum("cost_usd"))["total"] if estimated_rows.exists() else None
    latency = usage.exclude(latency_ms=0).aggregate(total=Sum("latency_ms"), n=Count("id"))
    avg_latency = round(latency["total"] / latency["n"], 1) if latency["n"] else None
    premium_sub = UserSubscription.objects.filter(
        user_id=OuterRef("user_id"),
        starts_at__lte=OuterRef("created_at"),
        ends_at__gt=OuterRef("created_at"),
        price_uzs__gt=0,
    )
    premium_count = usage.annotate(is_premium=Exists(premium_sub)).filter(is_premium=True).count()
    users = usage.exclude(user_id=None).values("user_id").distinct().count()
    visitors = visitor_counts(start, end)
    paying = SubscriptionPayment.objects.filter(
        status=SubscriptionPayment.Status.PAID, paid_at__gte=start, paid_at__lt=end
    ).values("user_id").distinct().count()
    ai_then_paid = 0
    if users:
        ai_users = set(usage.exclude(user_id=None).values_list("user_id", flat=True))
        paid_after = SubscriptionPayment.objects.filter(
            user_id__in=ai_users,
            status=SubscriptionPayment.Status.PAID,
            paid_at__gte=start,
        ).values_list("user_id", flat=True)
        ai_then_paid = len(set(paid_after))
    errors = list(
        usage.exclude(error_detail="")
        .values("error_detail")
        .annotate(n=Count("id"))
        .order_by("-n")[:8]
    )
    opened = AnalyticsEvent.objects.filter(name="ai_tryon_opened", occurred_at__gte=start, occurred_at__lt=end).count()
    selected = AnalyticsEvent.objects.filter(name="ai_style_selected", occurred_at__gte=start, occurred_at__lt=end).count()
    recorded_num = Decimal(recorded) if recorded is not None else None
    return {
        "tryon_page_views": opened if _tracks(end) else None,
        "tryon_page_views_available": _tracks(end),
        "styles_selected": selected if _tracks(end) else None,
        "generation_requests": requests,
        "queued": tasks.filter(status__in=["pending", "retrying"]).count(),
        "processing": tasks.filter(status="processing").count(),
        "completed": successes,
        "failed": failures,
        "cancelled": tasks.filter(status="cancelled").count(),
        "success_rate": round(successes / finished * 100, 1) if finished else None,
        "avg_latency_ms": avg_latency,
        "provider_latency_ms": avg_latency,
        "recorded_cost_usd": _usd(recorded) if recorded is not None else None,
        "estimated_cost_usd": _usd(estimated) if estimated is not None else None,
        "cost_is_billed": recorded is not None,
        "free_generations": requests - premium_count,
        "premium_generations": premium_count,
        "engagement_rate": round(users / visitors["unique_visitors"] * 100, 1) if visitors["unique_visitors"] else None,
        "ai_to_premium_rate": round(ai_then_paid / users * 100, 1) if users else None,
        "cost_per_active_user_usd": _usd(recorded_num / users) if recorded_num is not None and users else None,
        "cost_per_paying_user_usd": _usd(recorded_num / paying) if recorded_num is not None and paying else None,
        "error_categories": [{"category": row["error_detail"][:180], "count": row["n"]} for row in errors],
        "models": list(usage.exclude(model="").values("model", "provider").annotate(n=Count("id")).order_by("-n")[:6]),
    }


def source_report(start, end) -> dict:
    visitors = (
        SiteVisitor.objects.filter(first_seen__gte=start, first_seen__lt=end)
        .values("first_source")
        .annotate(n=Count("id"))
    )
    visitor_rows = [{"source": row["first_source"] or "unknown", "n": row["n"]} for row in visitors]
    source_sq = SiteVisitor.objects.filter(user_id=OuterRef("pk")).order_by("first_seen").values("first_source")[:1]
    registrations = (
        User.objects.filter(date_joined__gte=start, date_joined__lt=end)
        .annotate(source=source_sq)
        .values("source")
        .annotate(n=Count("id"))
    )
    reg_rows = [{"source": row["source"] or "unknown", "n": row["n"]} for row in registrations]
    pay_source = SiteVisitor.objects.filter(user_id=OuterRef("user_id")).order_by("first_seen").values("first_source")[:1]
    attempts = (
        SubscriptionPayment.objects.filter(created_at__gte=start, created_at__lt=end)
        .annotate(source=pay_source)
        .values("source")
        .annotate(n=Count("id"))
    )
    purchases = (
        SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID, paid_at__gte=start, paid_at__lt=end)
        .annotate(source=pay_source)
        .values("source")
        .annotate(n=Count("id"), revenue=Sum("amount_uzs"))
    )
    premium_views = (
        SiteVisitEvent.objects.filter(created_at__gte=start, created_at__lt=end, kind=SiteVisitEvent.Kind.PAGE, path__startswith="/subscriptions")
        .exclude(path__startswith="/subscriptions/payme")
        .values("visitor__first_source")
        .annotate(n=Count("visitor_id", distinct=True))
    )
    first_day = timezone.localtime(start).date()
    last_day = timezone.localtime(end - timedelta(microseconds=1)).date()
    costs = AnalyticsAdCost.objects.filter(date__gte=first_day, date__lte=last_day)
    purchase_map = {row["source"] or "unknown": row for row in purchases}
    visitor_map = {row["source"]: row["n"] for row in visitor_rows}
    rows = []
    keys = set(visitor_map) | set(purchase_map) | {row["source"] for row in reg_rows}
    for key in sorted(keys, key=lambda item: item or ""):
        visits = visitor_map.get(key, 0)
        bought = purchase_map.get(key, {})
        rows.append(
            {
                "source": key or "unknown",
                "visitors": visits,
                "registrations": next((row["n"] for row in reg_rows if (row["source"] or "unknown") == (key or "unknown")), 0),
                "premium_views": next((row["n"] for row in premium_views if (row["visitor__first_source"] or "unknown") == (key or "unknown")), 0),
                "payment_attempts": next((row["n"] for row in attempts if (row["source"] or "unknown") == (key or "unknown")), 0),
                "purchases": bought.get("n", 0),
                "conversion": round(bought.get("n", 0) / visits * 100, 1) if visits else None,
                "revenue_uzs": _uzs(bought.get("revenue")),
            }
        )
    return {
        "rows": rows,
        "historical_unknown": _before_tracking(start),
        "ad_cost_available": costs.exists(),
        "ad_cost_uzs": _uzs(costs.aggregate(total=Sum("amount_uzs"))["total"]) if costs.exists() else None,
        "roas": None,
        "cpa": None,
        "cac": None,
        "cost_reason": None if costs.exists() else "advertising_cost_unavailable",
    }


def _calendar_visitors(day) -> int:
    from analytics.periods import local_day_bounds

    start, end = local_day_bounds(day)
    return SiteVisitEvent.objects.filter(
        created_at__gte=start, created_at__lt=end, kind=SiteVisitEvent.Kind.PAGE
    ).values("visitor_id").distinct().count()


def traffic_days(now=None) -> dict:
    now = timezone.localtime(now or timezone.now())
    today = now.date()
    from analytics.periods import local_day_bounds

    today_start, _today_end = local_day_bounds(today)
    elapsed_end = now
    y_start = today_start - timedelta(days=1)
    counts = {
        "today": visitor_counts(today_start, elapsed_end)["unique_visitors"],
        "yesterday": _calendar_visitors(today - timedelta(days=1)),
        "yesterday_elapsed": visitor_counts(y_start, y_start + (elapsed_end - today_start))["unique_visitors"],
        "days_ago_3": _calendar_visitors(today - timedelta(days=3)),
        "days_ago_7": _calendar_visitors(today - timedelta(days=7)),
        "days_ago_30": _calendar_visitors(today - timedelta(days=30)),
    }
    counts["change"] = compare_numbers(counts["today"], counts["yesterday_elapsed"])
    return counts


def _identity(user_id, visitor_key):
    if user_id:
        return f"u:{user_id}"
    return f"v:{visitor_key}"


def _plus(moment, millis: int):
    return moment + timedelta(milliseconds=millis)


def collect_hits(start, end, window: timedelta, *, mode: str) -> list[tuple]:
    load_end = min(timezone.now() + timedelta(seconds=1), end + window)
    hits = []
    if mode == "session":
        for key, started in AnalyticsSession.objects.filter(started_at__gte=start, started_at__lt=load_end).values_list(
            "session_key", "started_at"
        ):
            hits.append((key, _STAGE_INDEX["website_visited"], started, key))
        event_rows = AnalyticsEvent.objects.filter(occurred_at__gte=start, occurred_at__lt=load_end).values_list(
            "session__session_key", "name", "occurred_at"
        )
        for session_key, name, moment in event_rows:
            stage_name = _EVENT_STAGE.get(name)
            if session_key and stage_name:
                hits.append((session_key, _STAGE_INDEX[stage_name], moment, session_key))
        pay_rows = SubscriptionPayment.objects.filter(created_at__gte=start, created_at__lt=load_end).exclude(session_key="")
        for row in pay_rows.values(
            "session_key", "created_at", "redirect_attempted_at", "paid_at", "status", "plan_code", "subscription_id"
        ):
            _append_payment_hits(hits, row["session_key"], row["session_key"], row)
        return hits

    for user_id, key, path, moment in SiteVisitEvent.objects.filter(
        created_at__gte=start, created_at__lt=load_end, kind=SiteVisitEvent.Kind.PAGE
    ).values_list("visitor__user_id", "visitor__visitor_key", "path", "created_at"):
        ident = _identity(user_id, key)
        hits.append((ident, _STAGE_INDEX["website_visited"], moment, ""))
        if (path or "").startswith("/subscriptions") and not (path or "").startswith("/subscriptions/payme"):
            hits.append((ident, _STAGE_INDEX["premium_page_viewed"], moment, ""))
    for user_id, joined in User.objects.filter(date_joined__gte=start, date_joined__lt=load_end).values_list("id", "date_joined"):
        hits.append((f"u:{user_id}", _STAGE_INDEX["account_registered"], joined, ""))
    for user_id, visitor_user, key, session_key, name, moment in AnalyticsEvent.objects.filter(
        occurred_at__gte=start, occurred_at__lt=load_end
    ).values_list("user_id", "visitor__user_id", "visitor__visitor_key", "session__session_key", "name", "occurred_at"):
        stage_name = _EVENT_STAGE.get(name)
        if not stage_name:
            continue
        ident = _identity(user_id or visitor_user, key)
        hits.append((ident, _STAGE_INDEX[stage_name], moment, session_key or ""))
    for row in SubscriptionPayment.objects.filter(created_at__gte=start, created_at__lt=load_end).values(
        "user_id", "session_key", "created_at", "redirect_attempted_at", "paid_at", "status", "plan_code", "subscription_id"
    ):
        _append_payment_hits(hits, f"u:{row['user_id']}", row["session_key"] or "", row)
    for user_id, moment in UserSubscription.objects.filter(
        source=UserSubscription.Source.PAYME, starts_at__gte=start, starts_at__lt=load_end
    ).values_list("user_id", "starts_at"):
        hits.append((f"u:{user_id}", _STAGE_INDEX["subscription_activated"], moment, ""))
    return hits


def _append_payment_hits(hits, identity, session_key, row):
    created = row["created_at"]
    hits.append((identity, _STAGE_INDEX["payment_initiated"], created, session_key))
    hits.append((identity, _STAGE_INDEX["payment_transaction_created"], _plus(created, 1), session_key))
    redirect_at = row["redirect_attempted_at"]
    if redirect_at:
        hits.append((identity, _STAGE_INDEX["checkout_redirect_attempted"], redirect_at, session_key))
    pending_at = _plus(redirect_at, 1) if redirect_at else _plus(created, 2)
    if row["paid_at"] and pending_at > row["paid_at"]:
        pending_at = row["paid_at"]
    hits.append((identity, _STAGE_INDEX["payment_pending"], pending_at, session_key))
    if row["status"] in (SubscriptionPayment.Status.PAID, SubscriptionPayment.Status.REFUNDED) and row["paid_at"]:
        hits.append((identity, _STAGE_INDEX["payment_confirmed"], row["paid_at"], session_key))
    if row["plan_code"] != "flash" and row["subscription_id"] and row["paid_at"]:
        hits.append((identity, _STAGE_INDEX["subscription_activated"], _plus(row["paid_at"], 1), session_key))


def funnel_report(start, end, *, mode: str = "user", window_days: int | None = None) -> dict:
    days = window_days or int(getattr(settings, "ANALYTICS_FUNNEL_WINDOW_DAYS", 7))
    days = max(1, min(90, int(days)))
    window = timedelta(days=days)
    hits = collect_hits(start, end, window, mode=mode)
    rows = strict_funnel(group_hits(hits), window, start, end)
    standalone = _standalone(start, end, mode)
    cutoff = tracking_since()
    stages = []
    for row in rows:
        key = row["key"]
        tracking = "recorded"
        if key in UNAVAILABLE_BEFORE_TRACKING and cutoff and start < cutoff:
            tracking = "unavailable" if end <= cutoff else "partial"
        elif key in {"premium_page_viewed", "payment_initiated", "payment_transaction_created", "payment_confirmed", "subscription_activated", "website_visited", "account_registered"}:
            tracking = "reconstructed" if cutoff and start < cutoff else "recorded"
        public = {k: v for k, v in row.items() if k != "identities"}
        public["events"] = standalone[key]["events"]
        public["standalone_users"] = standalone[key]["users"]
        public["standalone_sessions"] = standalone[key]["sessions"]
        public["tracking"] = tracking
        public["reached_identities"] = sorted(row["identities"])
        stages.append(public)
    return {
        "mode": mode,
        "window_days": days,
        "stages": stages,
        "tracking_since": cutoff.isoformat() if cutoff else None,
    }


def _standalone(start, end, mode: str) -> dict:
    result = {name: {"events": 0, "users": 0, "sessions": 0} for name in FUNNEL_STAGES}
    pages = SiteVisitEvent.objects.filter(created_at__gte=start, created_at__lt=end, kind=SiteVisitEvent.Kind.PAGE)
    result["website_visited"] = {
        "events": pages.count(),
        "users": pages.values("visitor_id").distinct().count(),
        "sessions": AnalyticsSession.objects.filter(started_at__gte=start, started_at__lt=end).count() if mode == "session" else 0,
    }
    premium = pages.filter(path__startswith="/subscriptions").exclude(path__startswith="/subscriptions/payme")
    result["premium_page_viewed"] = {
        "events": premium.count(),
        "users": premium.values("visitor_id").distinct().count(),
        "sessions": 0,
    }
    result["account_registered"] = {
        "events": User.objects.filter(date_joined__gte=start, date_joined__lt=end).count(),
        "users": User.objects.filter(date_joined__gte=start, date_joined__lt=end).count(),
        "sessions": 0,
    }
    for name in (
        "premium_offer_viewed",
        "subscription_plan_selected",
        "subscribe_clicked",
        "payment_initiated",
        "checkout_redirect_attempted",
    ):
        qs = AnalyticsEvent.objects.filter(name=name, occurred_at__gte=start, occurred_at__lt=end)
        result[name] = {
            "events": qs.count(),
            "users": qs.exclude(user_id=None).values("user_id").distinct().count() + qs.filter(user_id=None).values("visitor_id").distinct().count(),
            "sessions": qs.exclude(session_id=None).values("session_id").distinct().count(),
        }
    payments = SubscriptionPayment.objects.filter(created_at__gte=start, created_at__lt=end)
    result["payment_transaction_created"] = {
        "events": payments.count(),
        "users": payments.values("user_id").distinct().count(),
        "sessions": payments.exclude(session_key="").values("session_key").distinct().count(),
    }
    result["payment_pending"]["events"] = payments.count()
    result["payment_pending"]["users"] = result["payment_transaction_created"]["users"]
    confirmed = SubscriptionPayment.objects.filter(
        status__in=[SubscriptionPayment.Status.PAID, SubscriptionPayment.Status.REFUNDED],
        paid_at__gte=start,
        paid_at__lt=end,
    )
    result["payment_confirmed"] = {
        "events": confirmed.count(),
        "users": confirmed.values("user_id").distinct().count(),
        "sessions": confirmed.exclude(session_key="").values("session_key").distinct().count(),
    }
    activated = UserSubscription.objects.filter(source=UserSubscription.Source.PAYME, starts_at__gte=start, starts_at__lt=end)
    result["subscription_activated"] = {
        "events": activated.count(),
        "users": activated.values("user_id").distinct().count(),
        "sessions": 0,
    }
    named = AnalyticsEvent.objects.filter(name="premium_page_viewed", occurred_at__gte=start, occurred_at__lt=end)
    result["premium_page_viewed"]["events"] += named.count()
    return result


def kpi(key, label, current, previous, series, *, available=True, provenance="recorded", unit="count"):
    compared = compare_numbers(current if available else None, previous if available else None)
    compared.update(
        {
            "key": key,
            "label": label,
            "series": series,
            "available": available,
            "provenance": provenance,
            "unit": unit,
            "unavailable_reason": None if available else "historical_tracking_unavailable",
        }
    )
    return compared


def diagnostics(visitors: dict, funnel: dict, payments: dict) -> list[dict]:
    minimum = int(getattr(settings, "ANALYTICS_MIN_SAMPLE", 30))
    by_key = {row["key"]: row for row in funnel["stages"]}
    notes = []

    def add(rule, message, sample, measured, threshold):
        notes.append(
            {
                "id": rule,
                "message": message,
                "sample_size": sample,
                "measured": measured,
                "threshold": threshold,
            }
        )

    unique = visitors["unique_visitors"]
    if unique >= minimum and visitors["registration_conversion"] is not None and visitors["registration_conversion"] < 10:
        add(
            "low_registration",
            f"Saytga {unique} noyob tashrif bo'lgan, ro'yxatdan o'tganlar: {visitors['registered_users']}. Konversiya: {visitors['registration_conversion']}%.",
            unique,
            visitors["registration_conversion"],
            10,
        )
    premium_users = by_key["premium_page_viewed"]["standalone_users"]
    clicks = by_key["subscribe_clicked"]["standalone_users"]
    click_events = by_key["subscribe_clicked"]["events"]
    if premium_users >= minimum:
        rate = round(clicks / premium_users * 100, 1) if premium_users else 0
        if rate < 15:
            add(
                "low_subscribe_click",
                f"Premium sahifasini {premium_users} foydalanuvchi ko'rgan, ulardan {clicks} tasi obuna tugmasini bosgan ({click_events} ta bosish). Konversiya: {rate}%.",
                premium_users,
                rate,
                15,
            )
    if clicks >= minimum:
        initiated = by_key["payment_transaction_created"]["standalone_users"]
        rate = round(initiated / clicks * 100, 1) if clicks else 0
        if rate < 50:
            add(
                "low_checkout",
                f"Obuna tugmasini {clicks} foydalanuvchi bosgan, tranzaksiya yaratilgan: {initiated}. Konversiya: {rate}%.",
                clicks,
                rate,
                50,
            )
    initiated_users = by_key["payment_transaction_created"]["standalone_users"]
    if initiated_users >= minimum and payments["success_rate"] is not None and payments["success_rate"] < 40:
        add(
            "low_payment_confirmation",
            f"To'lov urinishi {payments['attempts']} ta, tasdiqlangan to'lov {payments['successful']} ta. Tasdiq ulushi: {payments['success_rate']}%.",
            initiated_users,
            payments["success_rate"],
            40,
        )
    gaps = payments["activation_gaps"] + payments["activation_failures"]
    if gaps:
        add(
            "activation_gap",
            f"Tasdiqlangan to'lovdan keyin obuna yoqilmagan holat: {gaps} ta. Bu hisoblangan tafovut, sabab alohida tekshiriladi.",
            gaps,
            gaps,
            0,
        )
    return notes


def largest_drop(funnel: dict) -> dict | None:
    best = None
    for row in funnel["stages"]:
        if row["drop_off"] is None:
            continue
        if best is None or (row["drop_off"] or 0) > (best["drop_off"] or 0):
            best = row
    if best is None:
        return None
    return {
        "stage": best["key"],
        "label": best["label"],
        "drop_off": best["drop_off"],
        "drop_off_percent": best["drop_off_percent"],
        "from_label": STAGE_LABELS[FUNNEL_STAGES[FUNNEL_STAGES.index(best["key"]) - 1]] if best["key"] != FUNNEL_STAGES[0] else None,
    }


def feature_usage(start, end) -> list[dict]:
    named = list(
        AnalyticsEvent.objects.filter(occurred_at__gte=start, occurred_at__lt=end)
        .values("name")
        .annotate(n=Count("id"), users=Count("user_id", distinct=True))
        .order_by("-n")[:12]
    )
    paths = (
        ("AI try-on", "/ai-style"),
        ("Premium", "/subscriptions"),
        ("Katalog", "/explore"),
        ("Parvarish", "/ai-style/care"),
    )
    rows = [
        {"name": row["name"], "events": row["n"], "users": row["users"], "provenance": "recorded"}
        for row in named
    ]
    for label, prefix in paths:
        qs = SiteVisitEvent.objects.filter(
            created_at__gte=start, created_at__lt=end, kind=SiteVisitEvent.Kind.PAGE, path__startswith=prefix
        )
        rows.append(
            {
                "name": label,
                "events": qs.count(),
                "users": qs.values("visitor_id").distinct().count(),
                "provenance": "reconstructed",
            }
        )
    return rows


def daily_unique(start, end) -> list[dict]:
    grouped = (
        SiteVisitEvent.objects.filter(created_at__gte=start, created_at__lt=end, kind=SiteVisitEvent.Kind.PAGE)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(value=Count("visitor_id", distinct=True))
    )
    found = {_day(row["day"]): row["value"] for row in grouped}
    return [{"date": day.isoformat(), "value": found.get(day, 0)} for day in _iter_days(start, end)]


def daily_revenue(start, end) -> list[dict]:
    grouped = (
        SubscriptionPayment.objects.filter(status=SubscriptionPayment.Status.PAID, paid_at__gte=start, paid_at__lt=end)
        .annotate(day=TruncDate("paid_at"))
        .values("day")
        .annotate(value=Sum("amount_uzs"))
    )
    found = {_day(row["day"]): _uzs(row["value"]) for row in grouped}
    return [{"date": day.isoformat(), "value": found.get(day, 0)} for day in _iter_days(start, end)]


def _iter_days(start, end):
    day = timezone.localtime(start).date()
    last = timezone.localtime(end - timedelta(microseconds=1)).date()
    while day <= last:
        yield day
        day += timedelta(days=1)


def limitations(start) -> list[str]:
    cutoff = tracking_since()
    notes = [
        "Haqiqiy MRR hisoblanmaydi: faol obuna 30 kunlik bir martalik to'lov, avtomatik yangilanish yo'q.",
        "Reklama xarajati kiritilmaguncha ROAS, CPA va CAC ko'rsatilmaydi.",
        "Checkoutga yo'naltirish Payme sahifasi ochilganini anglatmaydi.",
        "To'lov muvaffaqiyati faqat serverdagi Payme tekshiruvidan olinadi.",
    ]
    if cutoff and start < cutoff:
        notes.insert(
            0,
            f"Yangi voqealar {timezone.localtime(cutoff).strftime('%d.%m.%Y')} dan kuzatiladi. Undan oldingi taklif, obuna tugmasi, UTM va sessiya davomiyligi yo'q.",
        )
    return notes


def build_overview(period) -> dict:
    current = visitor_counts(period.start, period.end)
    previous = visitor_counts(period.previous_start, period.previous_end)
    payments = payment_counts(period.start, period.end)
    prev_payments = payment_counts(period.previous_start, period.previous_end)
    funnel = funnel_report(period.start, period.end, mode="user")
    for stage in funnel["stages"]:
        stage.pop("reached_identities", None)
    series = daily_unique(period.start, period.end)
    revenue_series = daily_revenue(period.start, period.end)
    tracked = current["sessions_available"]
    kpis = [
        kpi("unique_visitors", "Noyob tashriflar", current["unique_visitors"], previous["unique_visitors"], series),
        kpi("new_visitors", "Yangi tashriflar", current["new_visitors"], previous["new_visitors"], series),
        kpi("returning_visitors", "Qaytgan tashriflar", current["returning_visitors"], previous["returning_visitors"], series),
        kpi("registrations", "Ro'yxatdan o'tganlar", current["registered_users"], previous["registered_users"], series),
        kpi(
            "sessions",
            "Sessiyalar",
            current["sessions"] if tracked else None,
            previous["sessions"] if previous["sessions_available"] else None,
            series,
            available=tracked,
            provenance="recorded" if tracked else "unavailable",
        ),
        kpi(
            "confirmed_revenue",
            "Tasdiqlangan daromad",
            payments["confirmed_revenue_uzs"],
            prev_payments["confirmed_revenue_uzs"],
            revenue_series,
            unit="uzs",
        ),
        kpi("successful_payments", "Tasdiqlangan to'lovlar", payments["successful"], prev_payments["successful"], revenue_series),
    ]
    days = traffic_days()
    questions = [
        {"id": "visitors_today", "label": "Bugun nechta tashrif?", "value": days["today"]},
        {"id": "visitors_yesterday", "label": "Kecha nechta tashrif?", "value": days["yesterday"]},
        {"id": "visitors_3_days", "label": "3 kun oldin nechta tashrif?", "value": days["days_ago_3"]},
        {"id": "visitors_7_days", "label": "7 kun oldin nechta tashrif?", "value": days["days_ago_7"]},
        {"id": "visitors_30_days", "label": "30 kun oldin nechta tashrif?", "value": days["days_ago_30"]},
        {"id": "traffic_change", "label": "Trafik o'zgarishi (bugun va kecha, bir xil soat)", "value": days["change"]},
        {"id": "registrations", "label": "Ro'yxatdan o'tganlar", "value": current["registered_users"]},
        {"id": "premium_views", "label": "Premium sahifa", "value": _standalone(period.start, period.end, "user")["premium_page_viewed"]},
        {"id": "subscribe_clicks", "label": "Obuna tugmasi", "value": _standalone(period.start, period.end, "user")["subscribe_clicked"], "available": tracked},
        {"id": "payment_initiated", "label": "To'lov urinishlari", "value": payments["attempts"]},
        {"id": "redirect_attempted", "label": "Checkoutga yo'naltirish urinishi", "value": payments["redirect_attempted"], "available": tracked},
        {"id": "returned", "label": "To'lov holati sahifasiga qaytish", "value": AnalyticsEvent.objects.filter(name="payme_return_viewed", occurred_at__gte=period.start, occurred_at__lt=period.end).count(), "available": tracked, "note": "Bu Payme sahifasi ochilganini bildirmaydi."},
        {"id": "completed", "label": "Tasdiqlangan to'lov", "value": payments["successful"]},
        {"id": "abandoned", "label": "Tashlab ketilgan urinish", "value": payments["abandoned"]},
        {"id": "failed", "label": "Muvaffaqiyatsiz to'lov", "value": payments["failed"]},
        {"id": "activated", "label": "Yoqilgan Premium obuna", "value": UserSubscription.objects.filter(source=UserSubscription.Source.PAYME, starts_at__gte=period.start, starts_at__lt=period.end).count()},
        {"id": "revenue", "label": "Tasdiqlangan daromad, so'm", "value": payments["confirmed_revenue_uzs"]},
        {"id": "sources", "label": "To'lovchi manbalar", "value": [row for row in source_report(period.start, period.end)["rows"] if row["purchases"]]},
        {"id": "features", "label": "Ko'p ishlatilgan joylar", "value": feature_usage(period.start, period.end)[:8]},
        {"id": "dropoff", "label": "Voronkada eng katta yo'qotish", "value": largest_drop(funnel)},
    ]
    return {
        "timezone": settings.TIME_ZONE,
        "period": period.as_dict(),
        "traffic_days": days,
        "questions": questions,
        "kpis": kpis,
        "visitors": current,
        "payments": payments,
        "diagnostics": diagnostics(current, funnel, payments),
        "limitations": limitations(period.start),
        "tracking_since": tracking_since().isoformat() if tracking_since() else None,
    }
