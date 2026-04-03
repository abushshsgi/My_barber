from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from control_panel.views import (
    AdminBookingListView,
    AdminSalonDetailView,
    AdminSalonListView,
    AdminStatsView,
    AdminUserDetailView,
    AdminUserListView,
)

from accounts.views import (
    BarberApplicationViewSet,
    BarberRegisterView,
    EmailTokenObtainPairView,
    MeView,
    MyBarberApplicationStatusView,
    RegisterView,
    UserSearchView,
    UzRegionsView,
)
from bookings.views import (
    AnalyticsView,
    BookingAvailabilityView,
    BookingViewSet,
    NotificationListView,
    NotificationMarkReadView,
    ReviewViewSet,
    SalonClientsView,
    SalonPortfolioView,
)
from barbers.views import (
    BarberPublicViewSet,
    IndependentAvailabilityView,
    MyBarberProfileView,
    MyBarberServiceViewSet,
    MyBarberWorkPhotoViewSet,
    MyBarberWorkingHoursViewSet,
)
from salons.views import (
    BarberScheduleViewSet,
    SalonMembershipViewSet,
    SalonViewSet,
    ServiceViewSet,
)

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
router.register(
    r"admin/barber-applications",
    BarberApplicationViewSet,
    basename="barber-application",
)

# Shared API routes (mounted at both /api/v1/ and /api/ for compatibility).
api_routes = [
    path("admin/stats/", AdminStatsView.as_view()),
    path("admin/users/", AdminUserListView.as_view()),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view()),
    path("admin/salons/", AdminSalonListView.as_view()),
    path("admin/salons/<int:pk>/", AdminSalonDetailView.as_view()),
    path("admin/bookings/", AdminBookingListView.as_view()),
    path("regions/", UzRegionsView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/barber-register/", BarberRegisterView.as_view()),
    path("auth/token/", EmailTokenObtainPairView.as_view()),
    path("auth/token/refresh/", TokenRefreshView.as_view()),
    path("users/me/", MeView.as_view()),
    path("users/search/", UserSearchView.as_view()),
    path("users/barber-status/", MyBarberApplicationStatusView.as_view()),
    path("barber/profile/", MyBarberProfileView.as_view()),
    path("notifications/", NotificationListView.as_view()),
    path("notifications/<int:pk>/read/", NotificationMarkReadView.as_view()),
    path("analytics/", AnalyticsView.as_view()),
    path("analytics/clients/", SalonClientsView.as_view()),
    path("bookings/availability/", BookingAvailabilityView.as_view()),
    path("barbers/availability/", IndependentAvailabilityView.as_view()),
    path("salons/<int:salon_id>/portfolio/", SalonPortfolioView.as_view()),
    path("", include(router.urls)),
]

urlpatterns = [
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
