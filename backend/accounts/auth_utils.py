"""Helpers for request auth (platform admin vs barber vs customer)."""

from __future__ import annotations

from django.http import HttpRequest

from .admin_auth import AdminPrincipal


def is_platform_admin(request: HttpRequest) -> bool:
    u = getattr(request, "user", None)
    return isinstance(u, AdminPrincipal)


def is_barber_principal(request: HttpRequest) -> bool:
    from barbers.barber_auth import BarberPrincipal

    u = getattr(request, "user", None)
    return isinstance(u, BarberPrincipal)


def request_barber(request: HttpRequest):
    """Barber modeli yoki None (mijoz / admin JWT)."""
    from barbers.barber_auth import BarberPrincipal

    u = getattr(request, "user", None)
    if isinstance(u, BarberPrincipal):
        return u.barber
    return None
