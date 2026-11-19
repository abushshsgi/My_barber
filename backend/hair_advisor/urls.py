from django.urls import path

from hair_advisor.submission_views import ProductSubmissionDetailView, ProductSubmissionListCreateView
from hair_advisor.views import (
    AnalyzeView,
    CompareView,
    ConfirmIngredientsView,
    FeedbackView,
    HairAdvisorChatView,
    HairProductDetailView,
    HairScanDetailView,
    HairScanListCreateView,
    HistoryView,
    RoutineCreateView,
    RoutineCurrentView,
    RoutinePatchView,
)

urlpatterns = [
    path("submissions/", ProductSubmissionListCreateView.as_view()),
    path("submissions/<uuid:submission_id>/", ProductSubmissionDetailView.as_view()),
    path("scans/", HairScanListCreateView.as_view()),
    path("scans/<uuid:scan_id>/", HairScanDetailView.as_view()),
    path("scans/<uuid:scan_id>/confirm-ingredients/", ConfirmIngredientsView.as_view()),
    path("products/<int:product_id>/", HairProductDetailView.as_view()),
    path("analyze/", AnalyzeView.as_view()),
    path("compare/", CompareView.as_view()),
    path("history/", HistoryView.as_view()),
    path("routines/", RoutineCreateView.as_view()),
    path("routines/current/", RoutineCurrentView.as_view()),
    path("routines/<int:routine_id>/", RoutinePatchView.as_view()),
    path("feedback/", FeedbackView.as_view()),
    path("chat/", HairAdvisorChatView.as_view()),
]