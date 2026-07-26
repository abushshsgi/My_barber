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


def _request_query_get(request: HttpRequest, key: str) -> str:
    qp = getattr(request, "query_params", None)
    if qp is not None:
        return (qp.get(key) or "").strip()
    return (request.GET.get(key) or "").strip()


def customer_catalog_region(request: HttpRequest) -> str | None:
    """
    Mijoz (User) JWT bilan kirganda — profildagi viloyat (default).
    `scope=all|uzbekistan|uz` — butun O‘zbekiston (filtr yo‘q).
    Aniq `?region=` — mijoz tanlagan viloyat (profilni override).
    Barber / admin JWT yoki anonim — None (so‘rovda `region` ishlatiladi).
    """
    from accounts.models import User
    from accounts.uz_regions import UzRegion

    scope = _request_query_get(request, "scope").lower()
    if scope in ("all", "uzbekistan", "uz", "nationwide"):
        return None

    region = _request_query_get(request, "region")
    valid = {c[0] for c in UzRegion.choices}
    if region and region in valid:
        return region

    u = getattr(request, "user", None)
    if isinstance(u, User) and u.is_authenticated:
        r = (u.region or "").strip()
        return r or None
    return None
