from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from control_panel.views import (
    AdminBarberDetailView,
    AdminBarberListView,
    AdminBookingListView,
    AdminBroadcastListCreateView,
    AdminCategoryDetailView,
    AdminCategoryListCreateView,
    AdminFinanceOverviewView,
    AdminFinanceTransactionsView,
    AdminPayoutMarkPaidView,
    AdminPayoutsView,
    AdminReportExportView,
    AdminAuditLogListView,
    AdminServicesView,
    AdminServiceDetailView,
    AdminSupportTicketDetailView,
    AdminSupportTicketListView,
    AdminSupportTicketRepliesView,
    AdminAdminAccountDetailView,
    AdminAdminAccountListCreateView,
    AdminReviewListView,
    AdminSalonDetailView,
    AdminSalonListView,
    AdminStatsView,
    AdminUserDetailView,
    AdminUserListView,
)

from accounts.views import (
    BarberRegisterJoinSalonView,
    BarberRegisterView,
    EmailTokenObtainPairView,
    MeView,
    RegisterView,
    UserSearchView,
    UzRegionsView,
)
from accounts.views_admin_auth import AdminMeView, AdminTokenRefreshView, AdminTokenView
from bookings.views import (
    AnalyticsView,
    BookingAvailabilityView,
    BookingViewSet,
    IndependentClientsView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    ReviewViewSet,
    SalonClientsView,
    SalonPortfolioView,
)
from barbers.views import (
    BarberPublicViewSet,
    MyBarberExpenseViewSet,
    MyBarberFinanceSummaryView,
    MyBarberGoalViewSet,
    MyBarberInventoryMovementViewSet,
    MyBarberInventoryViewSet,
    BarberSearchView,
    IndependentAvailabilityView,
    MyBarberProfileView,
    MyBarberPromoViewSet,
    MyBarberReviewsView,
    MyBarberSettingsView,
    MyBarberServiceViewSet,
    MyBarberSupportTicketViewSet,
    MyBarberWorkPhotoViewSet,
    MyBarberWorkingHoursViewSet,
)
from barbers.views_barber_auth import (
    BarberMeView,
    BarberOnboardingStatusView,
    BarberTokenRefreshView,
    BarberTokenView,
)
from salons.views import (
    BarberScheduleViewSet,
    SalonMembershipViewSet,
    SalonViewSet,
    ServiceViewSet,
)
from chat.views import ConversationListCreateView, ConversationMessagesView


def health(_request):
    return JsonResponse({"ok": True})


router = DefaultRouter()
router.register(r"salons", SalonViewSet, basename="salon")
router.register(r"services", ServiceViewSet, basename="service")
router.register(r"memberships", SalonMembershipViewSet, basename="membership")
router.register(r"schedules", BarberScheduleViewSet, basename="schedule")
router.register(r"bookings", BookingViewSet, basename="booking")
router.register(r"reviews", ReviewViewSet, basename="review")
router.register(r"barbers", BarberPublicViewSet, basename="barber")
router.register(r"barber/services", MyBarberServiceViewSet, basename="barber-service")
router.register(r"barber/work-photos", MyBarberWorkPhotoViewSet, basename="barber-work-photos")
router.register(r"barber/working-hours", MyBarberWorkingHoursViewSet, basename="barber-working-hours")
router.register(r"barber/inventory", MyBarberInventoryViewSet, basename="barber-inventory")
router.register(
    r"barber/inventory-movements",
    MyBarberInventoryMovementViewSet,
    basename="barber-inventory-movements",
)
router.register(r"barber/expenses", MyBarberExpenseViewSet, basename="barber-expenses")
router.register(r"barber/goals", MyBarberGoalViewSet, basename="barber-goals")
router.register(r"barber/promos", MyBarberPromoViewSet, basename="barber-promos")
router.register(r"barber/support", MyBarberSupportTicketViewSet, basename="barber-support")
# Shared API routes (mounted at both /api/v1/ and /api/ for compatibility).
api_routes = [
    path("admin/stats/", AdminStatsView.as_view()),
    path("admin/users/", AdminUserListView.as_view()),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view()),
    path("admin/salons/", AdminSalonListView.as_view()),
    path("admin/salons/<int:pk>/", AdminSalonDetailView.as_view()),
    path("admin/barbers/", AdminBarberListView.as_view()),
    path("admin/barbers/<int:pk>/", AdminBarberDetailView.as_view()),
    path("admin/bookings/", AdminBookingListView.as_view()),
    path("admin/reviews/", AdminReviewListView.as_view()),
    path("admin/categories/", AdminCategoryListCreateView.as_view()),
    path("admin/categories/<int:pk>/", AdminCategoryDetailView.as_view()),
    path("admin/services/", AdminServicesView.as_view()),
    path("admin/services/<str:pk>/", AdminServiceDetailView.as_view()),
    path("admin/finance/overview/", AdminFinanceOverviewView.as_view()),
    path("admin/finance/transactions/", AdminFinanceTransactionsView.as_view()),
    path("admin/finance/payouts/", AdminPayoutsView.as_view()),
    path("admin/finance/payouts/<int:pk>/paid/", AdminPayoutMarkPaidView.as_view()),
    path("admin/reports/<str:report_type>/", AdminReportExportView.as_view()),
    path("admin/audit/", AdminAuditLogListView.as_view()),
    path("admin/support/tickets/", AdminSupportTicketListView.as_view()),
    path("admin/support/tickets/<int:pk>/", AdminSupportTicketDetailView.as_view()),
    path("admin/support/tickets/<int:pk>/replies/", AdminSupportTicketRepliesView.as_view()),
    path("admin/broadcast/", AdminBroadcastListCreateView.as_view()),
    path("admin/admins/", AdminAdminAccountListCreateView.as_view()),
    path("admin/admins/<int:pk>/", AdminAdminAccountDetailView.as_view()),
    path("regions/", UzRegionsView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/barber-register/", BarberRegisterView.as_view()),
    path("auth/barber-register-join-salon/", BarberRegisterJoinSalonView.as_view()),
    path("auth/token/", EmailTokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("admin/auth/token/", AdminTokenView.as_view()),
    path("admin/auth/token/refresh/", AdminTokenRefreshView.as_view()),
    path("admin/auth/me/", AdminMeView.as_view()),
    path("users/me/", MeView.as_view()),
    path("users/search/", UserSearchView.as_view()),
    path("barbers/search/", BarberSearchView.as_view()),
    path("barber/auth/token/", BarberTokenView.as_view()),
    path("barber/auth/token/refresh/", BarberTokenRefreshView.as_view()),
    path("barber/auth/me/", BarberMeView.as_view()),
    path("barber/onboarding/status/", BarberOnboardingStatusView.as_view()),
    path("barber/profile/", MyBarberProfileView.as_view()),
    path("barber/settings/", MyBarberSettingsView.as_view()),
    path("barber/reviews/", MyBarberReviewsView.as_view()),
    path("barber/finance/summary/", MyBarberFinanceSummaryView.as_view()),
    path("notifications/", NotificationListView.as_view()),
    path("notifications/<int:pk>/read/", NotificationMarkReadView.as_view()),
    path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view()),
    path("analytics/", AnalyticsView.as_view()),
    path("analytics/clients/", SalonClientsView.as_view()),
    path("analytics/clients/independent/", IndependentClientsView.as_view()),
    path("bookings/availability/", BookingAvailabilityView.as_view()),
    path("barbers/availability/", IndependentAvailabilityView.as_view()),
    path("salons/<int:salon_id>/portfolio/", SalonPortfolioView.as_view()),
    # Chat (text-only): barber ↔ user
    path("chat/conversations/", ConversationListCreateView.as_view()),
    path(
        "chat/conversations/<uuid:conversation_id>/messages/",
        ConversationMessagesView.as_view(),
    ),
    path("", include(router.urls)),
]

urlpatterns = [
    path("health/", health),
    path("api/v1/", include(api_routes)),
    path("api/", include(api_routes)),
]

# Django admin faqat maxfiy URL (asosiy boshqaruv Next.js /admin da)
if settings.DEBUG:
    urlpatterns.insert(0, path("django-sys-admin/", admin.site.urls))

# Media: DEBUG da static(); productionda ham fayllar chiqishi kerak (Railway/VPS).
# Keyingi bosqichda S3/Cloudinary tavsiya etiladi (deploy qayta yozilganda disk yo‘qoladi).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
