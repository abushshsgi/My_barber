from rest_framework.permissions import BasePermission

from accounts.models import User


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.ADMIN
        )


class IsSalonOwner(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role
            in (User.Role.BARBER_OWNER, User.Role.BARBER_STAFF, User.Role.ADMIN)
        )
