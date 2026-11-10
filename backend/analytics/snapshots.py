"""Closed-day snapshots. Today is never stored as a final figure."""

from django.utils import timezone

from analytics.hooks import tracking_since
from analytics.metrics import payment_counts, visitor_counts
from analytics.models import AnalyticsDailySnapshot, AnalyticsEvent
from analytics.periods import local_day_bounds
from control_panel.models import SiteVisitEvent
from subscriptions.models import SubscriptionPayment, UserSubscription


def compute_day(day) -> dict:
    start, end = local_day_bounds(day)
    visitors = visitor_counts(start, end)
    payments = payment_counts(start, end)
    cutoff = tracking_since()
    tracked = bool(cutoff and end > cutoff)
    clicks = (
        AnalyticsEvent.objects.filter(name="subscribe_clicked", occurred_at__gte=start, occurred_at__lt=end).count()
        if tracked
        else None
    )
    sessions = visitors["sessions"] if tracked else None
    premium = (
        SiteVisitEvent.objects.filter(
            created_at__gte=start,
            created_at__lt=end,
            kind=SiteVisitEvent.Kind.PAGE,
            path__startswith="/subscriptions",
        )
        .exclude(path__startswith="/subscriptions/payme")
        .values("visitor_id")
        .distinct()
        .count()
    )
    activations = UserSubscription.objects.filter(
        source=UserSubscription.Source.PAYME, starts_at__gte=start, starts_at__lt=end
    ).count()
    from ai.models import AiGenerationUsage

    usage = AiGenerationUsage.objects.filter(created_at__gte=start, created_at__lt=end, kind=AiGenerationUsage.Kind.TRYON)
    provenance = {
        "unique_visitors": "recorded",
        "premium_views": "reconstructed",
        "sessions": "recorded" if tracked else "unavailable",
        "subscribe_clicks": "recorded" if tracked else "unavailable",
        "payments": "recorded",
        "revenue": "recorded",
    }
    return {
        "unique_visitors": visitors["unique_visitors"],
        "new_visitors": visitors["new_visitors"],
        "returning_visitors": visitors["returning_visitors"],
        "sessions": sessions,
        "page_views": visitors["page_views"],
        "registrations": visitors["registered_users"],
        "premium_views": premium,
        "subscribe_clicks": clicks,
        "payment_attempts": payments["attempts"],
        "successful_payments": payments["successful"],
        "failed_payments": payments["failed"],
        "abandoned_attempts": payments["abandoned"],
        "subscription_activations": activations,
        "gross_revenue": payments["confirmed_revenue_uzs"],
        "refunded_revenue": payments["refunded_uzs"],
        "net_revenue": payments["net_revenue_uzs"],
        "ai_generation_requests": usage.count(),
        "ai_generation_successes": usage.filter(status=AiGenerationUsage.Status.SUCCESS).count(),
        "ai_generation_failures": usage.filter(status=AiGenerationUsage.Status.FAILED).count(),
        "provenance": provenance,
    }


def write_snapshot(day, *, allow_today=False) -> AnalyticsDailySnapshot | None:
    today = timezone.localdate()
    if day >= today and not allow_today:
        return None
    payload = compute_day(day)
    provenance = payload.pop("provenance")
    row, _created = AnalyticsDailySnapshot.objects.update_or_create(
        date=day,
        defaults={**payload, "provenance": provenance, "stale": day >= today, "computed_at": timezone.now()},
    )
    return row


def refresh_stale(days) -> None:
    from django.core.cache import cache

    today = timezone.localdate()
    stale = AnalyticsDailySnapshot.objects.filter(date__in=list(days), stale=True, date__lt=today)
    for row in stale[:31]:
        if not cache.add(f"analytics-snap:{row.date.isoformat()}", 1, timeout=60):
            continue
        write_snapshot(row.date)
