from rest_framework.permissions import BasePermission

from barbers.barber_auth import BarberPrincipal


class IsBarber(BasePermission):
    """Faqat barber_access JWT."""

    def has_permission(self, request, view):
        return isinstance(getattr(request, "user", None), BarberPrincipal)
