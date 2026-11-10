from django.urls import path

from analytics.views import (
    AnalyticsAiView,
    AnalyticsFunnelStageView,
    AnalyticsFunnelView,
    AnalyticsIngestView,
    AnalyticsJourneyView,
    AnalyticsOverviewView,
    AnalyticsPaymentsView,
    AnalyticsRealtimeView,
    AnalyticsRevenueView,
    AnalyticsSourcesView,
    AnalyticsUsersView,
    AnalyticsVisitorsView,
)

urlpatterns = [
    path("analytics/events/", AnalyticsIngestView.as_view()),
    path("admin/analytics/overview/", AnalyticsOverviewView.as_view()),
    path("admin/analytics/visitors/", AnalyticsVisitorsView.as_view()),
    path("admin/analytics/funnel/", AnalyticsFunnelView.as_view()),
    path("admin/analytics/funnel/stage/", AnalyticsFunnelStageView.as_view()),
    path("admin/analytics/payments/", AnalyticsPaymentsView.as_view()),
    path("admin/analytics/revenue/", AnalyticsRevenueView.as_view()),
    path("admin/analytics/ai/", AnalyticsAiView.as_view()),
    path("admin/analytics/sources/", AnalyticsSourcesView.as_view()),
    path("admin/analytics/realtime/", AnalyticsRealtimeView.as_view()),
    path("admin/analytics/users/", AnalyticsUsersView.as_view()),
    path("admin/analytics/users/<str:identity>/journey/", AnalyticsJourneyView.as_view()),
]
