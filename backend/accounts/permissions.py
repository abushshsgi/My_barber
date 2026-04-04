from rest_framework.permissions import BasePermission

from accounts.admin_auth import AdminPrincipal
from accounts.models import User
from barbers.barber_auth import BarberPrincipal


class IsAdmin(BasePermission):
    """Faqat AdminAccount JWT (admin_access) bilan kirganlar."""

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and isinstance(u, AdminPrincipal))


class IsSalonOwner(BasePermission):
    """Admin yoki sartarosh JWT (salon/barber endpointlari)."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if isinstance(request.user, AdminPrincipal):
            return True
        return isinstance(request.user, BarberPrincipal)
