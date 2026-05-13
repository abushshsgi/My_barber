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
    "barber/services",
    "barber/working-hours",
    "barber/service-recommendations",
    "barber/auth/verify-email",
    "barber/auth/resend-verification-email",
    "schedules",
    "salons",
    "memberships",
    "services",
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


class IsAuthenticatedBarberAware(IsAuthenticated):
    """
    Oddiy User — o‘zgarishsiz.
    BarberPrincipal — fully_ready yoki faqat setup API.
    """

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        u = getattr(request, "user", None)
        if not isinstance(u, BarberPrincipal):
            return True
        if compute_barber_readiness(u.barber).fully_ready:
            return True
        return barber_activation_rel_allowed(request.path)
