from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        owner_id = getattr(obj, "user_id", None)
        if owner_id is None:
            owner = getattr(obj, "user", None)
            owner_id = getattr(owner, "pk", None) if owner is not None else None
        if owner_id is None:
            return False
        return request.user.is_authenticated and request.user.pk == owner_id