from rest_framework.permissions import BasePermission

from rest_framework.exceptions import NotAuthenticated, PermissionDenied

from barbers.barber_auth import BarberPrincipal
from barbers.readiness import compute_barber_readiness


class IsBarber(BasePermission):
    """Faqat barber_access JWT + activation + obuna qatlami."""

    def has_permission(self, request, view):
        u = getattr(request, "user", None)
        if not isinstance(u, BarberPrincipal):
            auth_header = (request.META.get("HTTP_AUTHORIZATION") or "").strip()
            if auth_header.lower().startswith("bearer "):
                raise NotAuthenticated("Barber token talab qilinadi.")
            return False

        barber = u.barber
        ready = compute_barber_readiness(barber).fully_ready
        from barbers.activation_permissions import barber_activation_rel_allowed, barber_request_rel_path

        rel = barber_request_rel_path(request)
        path = getattr(request, "path", "") or ""

        if not ready:
            if barber_activation_rel_allowed(rel) or barber_activation_rel_allowed(path):
                return True
            return False

        # fully_ready — obuna majburiy (subscription API lar bundan mustasno)
        from barbers.shop_subscription_gates import feature_blocked_reason, subscription_free_rel_allowed
        from barbers.shop_subscription_services import has_active_subscription

        if has_active_subscription(barber):
            reason = feature_blocked_reason(barber, rel or path)
            if reason:
                raise PermissionDenied(detail=reason)
            return True

        if subscription_free_rel_allowed(rel) or subscription_free_rel_allowed(path):
            return True
        # Activation setup API lar ham qolishi mumkin (services/hours tahrirlash)
        if barber_activation_rel_allowed(rel) or barber_activation_rel_allowed(path):
            return True
        raise PermissionDenied(detail="Panel to'liq ishlashi uchun obuna kerak.")
