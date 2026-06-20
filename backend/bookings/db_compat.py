"""Bookings DB schema helpers — deploy paytida migrate kechiksa 500 oldini olish."""

from __future__ import annotations

from functools import lru_cache

from django.db import connection


@lru_cache(maxsize=1)
def bookings_has_family_member_column() -> bool:
    try:
        table = "bookings_booking"
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, table)
        return any(col.name == "family_member_id" for col in columns)
    except Exception:
        return False


def clear_booking_schema_cache() -> None:
    bookings_has_family_member_column.cache_clear()
