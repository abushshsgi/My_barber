from rest_framework.permissions import BasePermission

from agents.auth import AgentPrincipal


class IsFieldAgent(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and isinstance(u, AgentPrincipal))
