from rest_framework.permissions import BasePermission

from barbers.barber_auth import BarberPrincipal
from barbers.readiness import compute_barber_readiness


class IsBarber(BasePermission):
    """Faqat barber_access JWT."""

    def has_permission(self, request, view):
        u = getattr(request, "user", None)
        if not isinstance(u, BarberPrincipal):
            return False
        if compute_barber_readiness(u.barber).fully_ready:
            return True
        from barbers.activation_permissions import barber_activation_rel_allowed

        return barber_activation_rel_allowed(request.path)
