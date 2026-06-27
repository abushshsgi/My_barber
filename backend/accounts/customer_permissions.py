"""Mijoz (User) ilovasi uchun ruxsatlar."""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from accounts.models import User


class IsAuthenticatedCustomer(BasePermission):
    """Faqat mijoz User JWT — barber token sevimlilar va shaxsiy API uchun emas."""

    message = "Mijoz akkaunti bilan kiring."

    def has_permission(self, request, view) -> bool:
        u = getattr(request, "user", None)
        return isinstance(u, User) and bool(u.is_authenticated)
