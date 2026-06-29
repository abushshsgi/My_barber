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


def bookings_has_order_number_column() -> bool:
    return "order_number" in _booking_column_names()


def bookings_has_check_in_token_column() -> bool:
    return "check_in_token" in _booking_column_names()


def booking_queryset_compat(qs: QuerySet) -> QuerySet:
    cols = _booking_column_names()
    defer: list[str] = []
    if "checked_in_at" not in cols:
        defer.append("checked_in_at")
    if "portfolio_consent" not in cols:
        defer.append("portfolio_consent")
    if "order_number" not in cols:
        defer.append("order_number")
    if "check_in_token" not in cols:
        defer.extend(
            [
                "check_in_token",
                "check_in_short_code",
                "check_in_token_issued_at",
                "check_in_token_used_at",
            ]
        )
    if defer:
        qs = qs.defer(*defer)
    return qs


def clear_booking_schema_cache() -> None:
    _booking_column_names.cache_clear()
