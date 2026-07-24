"""
Barber JWT bilan kirgan so‘rovlarda: to‘liq tayyor bo‘lmaguncha faqat setup whitelist.
Mijoz (User) JWT uchun cheklov yo‘q.
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission, IsAuthenticated

from barbers.barber_auth import BarberPrincipal
from barbers.readiness import compute_barber_readiness

# /api/v1/ yoki /api/ dan keyingi qism (boshidagi / yo‘q)
_REL_ALLOWED = (
    "barber/auth/me",
    "barber/onboarding/status",
    "barber/profile",
    "barber/catalog-services",
    "barber/services",
    "barber/amenities",
    "amenities",
    "barber/working-hours",
    "barber/service-recommendations",
    "barber/auth/verify-email",
    "barber/auth/resend-verification-email",
    "barber/subscription",
    "barber/subscriptions",
    "schedules",
    "salons",
    "memberships",
    "bookings/availability",
)


def _strip_api_prefix(path: str) -> str:
    p = path.split("?")[0]
    for prefix in ("/api/v1/", "/api/"):
        if p.startswith(prefix):
            return p[len(prefix) :].lstrip("/")
    return p.lstrip("/")


def barber_activation_rel_allowed(http_path: str) -> bool:
    rel = _strip_api_prefix(http_path).rstrip("/")
    if not rel:
        return False
    for a in _REL_ALLOWED:
        a = a.rstrip("/")
        if rel == a or rel.startswith(a + "/"):
            return True
    return False


def barber_request_rel_path(request) -> str:
    """DRF request.path yoki PATH_INFO — proxy ortida ham ishlashi uchun."""
    for candidate in (
        getattr(request, "path", ""),
        getattr(request, "path_info", ""),
        request.META.get("PATH_INFO", ""),
        request.META.get("RAW_URI", "").split("?")[0],
    ):
        if candidate:
            return _strip_api_prefix(str(candidate))
    return ""


class IsAuthenticatedBarberAware(IsAuthenticated):
    """
    Oddiy User — o‘zgarishsiz.
    BarberPrincipal — fully_ready + obuna, yoki setup/subscription whitelist.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        u = getattr(request, "user", None)
        if not isinstance(u, BarberPrincipal):
            return True
        from barbers.activation_permissions import barber_activation_rel_allowed, barber_request_rel_path
        from barbers.shop_subscription_gates import feature_blocked_reason, subscription_free_rel_allowed
        from barbers.shop_subscription_services import has_active_subscription

        barber = u.barber
        rel = barber_request_rel_path(request)
        path = getattr(request, "path", "") or ""
        ready = compute_barber_readiness(barber).fully_ready
        if not ready:
            if barber_activation_rel_allowed(rel) or barber_activation_rel_allowed(path):
                return True
            return False
        if has_active_subscription(barber):
            reason = feature_blocked_reason(barber, rel or path)
            return reason is None
        if subscription_free_rel_allowed(rel) or subscription_free_rel_allowed(path):
            return True
        if barber_activation_rel_allowed(rel) or barber_activation_rel_allowed(path):
            return True
        return False