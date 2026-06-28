from rest_framework.permissions import BasePermission

from rest_framework.exceptions import NotAuthenticated

from barbers.barber_auth import BarberPrincipal
from barbers.readiness import compute_barber_readiness


class IsBarber(BasePermission):
    """Faqat barber_access JWT."""

    def has_permission(self, request, view):
        u = getattr(request, "user", None)
        if not isinstance(u, BarberPrincipal):
            auth_header = (request.META.get("HTTP_AUTHORIZATION") or "").strip()
            if auth_header.lower().startswith("bearer "):
                raise NotAuthenticated("Barber token talab qilinadi.")
            return False
        if compute_barber_readiness(u.barber).fully_ready:
            return True
        from barbers.activation_permissions import barber_activation_rel_allowed, barber_request_rel_path

        rel = barber_request_rel_path(request)
        if barber_activation_rel_allowed(rel):
            return True
        return barber_activation_rel_allowed(getattr(request, "path", ""))
