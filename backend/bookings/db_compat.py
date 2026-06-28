"""Bookings DB schema helpers — deploy paytida migrate kechiksa 500 oldini olish."""

from __future__ import annotations

from functools import lru_cache

from django.db import connection
from django.db.models import QuerySet


@lru_cache(maxsize=1)
def _booking_column_names() -> frozenset[str]:
    try:
        table = "bookings_booking"
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, table)
        return frozenset(col.name for col in columns)
    except Exception:
        return frozenset()


def bookings_has_family_member_column() -> bool:
    return "family_member_id" in _booking_column_names()


def bookings_has_checked_in_column() -> bool:
    return "checked_in_at" in _booking_column_names()


def bookings_has_portfolio_consent_column() -> bool:
    return "portfolio_consent" in _booking_column_names()


def booking_queryset_compat(qs: QuerySet) -> QuerySet:
    defer: list[str] = []
    if not bookings_has_checked_in_column():
        defer.append("checked_in_at")
    if not bookings_has_portfolio_consent_column():
        defer.append("portfolio_consent")
    if defer:
        qs = qs.defer(*defer)
    return qs


def clear_booking_schema_cache() -> None:
    _booking_column_names.cache_clear()
