from django.conf import settings
from django.db import models


class AnalyticsTrackingState(models.Model):
    """When named product events started. Older rows are not backfilled."""

    named_events_since = models.DateTimeField()

    class Meta:
        verbose_name = "Analytics tracking state"


class AnalyticsSession(models.Model):
    visitor = models.ForeignKey(
        "control_panel.SiteVisitor",
        on_delete=models.CASCADE,
        related_name="analytics_sessions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="analytics_sessions",
    )
    session_key = models.CharField(max_length=64, db_index=True)
    started_at = models.DateTimeField(db_index=True)
    last_activity_at = models.DateTimeField(db_index=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    pageviews = models.PositiveIntegerField(default=0)
    landing_path = models.CharField(max_length=300, blank=True, default="")
    device_category = models.CharField(max_length=16, blank=True, default="")
    referrer = models.CharField(max_length=500, blank=True, default="")
    first_source = models.CharField(max_length=32, blank=True, default="")
    last_source = models.CharField(max_length=32, blank=True, default="")
    utm_source = models.CharField(max_length=80, blank=True, default="")
    utm_medium = models.CharField(max_length=80, blank=True, default="")
    utm_campaign = models.CharField(max_length=120, blank=True, default="")
    utm_content = models.CharField(max_length=120, blank=True, default="")
    utm_term = models.CharField(max_length=120, blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["visitor", "session_key", "-started_at"], name="an_sess_visitor_key_idx"),
            models.Index(fields=["started_at", "ended_at"], name="an_sess_started_ended_idx"),
        ]


class AnalyticsEvent(models.Model):
    client_event_id = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=64, db_index=True)
    version = models.PositiveSmallIntegerField(default=1)
    occurred_at = models.DateTimeField(db_index=True)
    visitor = models.ForeignKey(
        "control_panel.SiteVisitor",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="analytics_events",
    )
    session = models.ForeignKey(
        AnalyticsSession,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="events",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="analytics_events",
    )
    page = models.CharField(max_length=300, blank=True, default="")
    status = models.CharField(max_length=32, blank=True, default="")
    properties = models.JSONField(default=dict, blank=True)
    payment = models.ForeignKey(
        "subscriptions.SubscriptionPayment",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="analytics_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["occurred_at", "name"], name="an_evt_time_name_idx"),
            models.Index(fields=["user", "occurred_at"], name="an_evt_user_time_idx"),
            models.Index(fields=["visitor", "occurred_at"], name="an_evt_visitor_time_idx"),
            models.Index(fields=["session", "occurred_at"], name="an_evt_session_time_idx"),
        ]


class AnalyticsDailySnapshot(models.Model):
    date = models.DateField(unique=True)
    unique_visitors = models.PositiveIntegerField(null=True, blank=True)
    new_visitors = models.PositiveIntegerField(null=True, blank=True)
    returning_visitors = models.PositiveIntegerField(null=True, blank=True)
    sessions = models.PositiveIntegerField(null=True, blank=True)
    page_views = models.PositiveIntegerField(null=True, blank=True)
    registrations = models.PositiveIntegerField(null=True, blank=True)
    premium_views = models.PositiveIntegerField(null=True, blank=True)
    subscribe_clicks = models.PositiveIntegerField(null=True, blank=True)
    payment_attempts = models.PositiveIntegerField(null=True, blank=True)
    successful_payments = models.PositiveIntegerField(null=True, blank=True)
    failed_payments = models.PositiveIntegerField(null=True, blank=True)
    abandoned_attempts = models.PositiveIntegerField(null=True, blank=True)
    subscription_activations = models.PositiveIntegerField(null=True, blank=True)
    gross_revenue = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    refunded_revenue = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    net_revenue = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    ai_generation_requests = models.PositiveIntegerField(null=True, blank=True)
    ai_generation_successes = models.PositiveIntegerField(null=True, blank=True)
    ai_generation_failures = models.PositiveIntegerField(null=True, blank=True)
    stale = models.BooleanField(default=False)
    computed_at = models.DateTimeField()
    provenance = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-date"]


class AnalyticsAdCost(models.Model):
    """Manual or future API import. Empty until a real cost is entered."""

    date = models.DateField(db_index=True)
    source = models.CharField(max_length=32)
    campaign = models.CharField(max_length=120, blank=True, default="")
    amount_uzs = models.DecimalField(max_digits=14, decimal_places=2)
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["date", "source"], name="an_adcost_date_source_idx"),
        ]
