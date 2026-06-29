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


@lru_cache(maxsize=1)
def _review_column_names() -> frozenset[str]:
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(
                cursor, "bookings_review"
            )
        return frozenset(col.name for col in columns)
    except Exception:
        return frozenset()


@lru_cache(maxsize=1)
def _has_review_dimension_table() -> bool:
    try:
        with connection.cursor() as cursor:
            return "bookings_reviewdimensionscore" in set(
                connection.introspection.table_names(cursor)
            )
    except Exception:
        return False


def reviews_has_salon_rating_column() -> bool:
    """`salon_rating` ustuni mavjudligini tekshiradi (migrate kechiksa 500 oldini olish)."""
    return "salon_rating" in _review_column_names()


def reviews_has_dimension_table() -> bool:
    """`ReviewDimensionScore` jadvali mavjudligini tekshiradi."""
    return _has_review_dimension_table()


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
    _review_column_names.cache_clear()
    _has_review_dimension_table.cache_clear()


def booking_create_compat(**kwargs) -> "Booking":
    """
    INSERT faqat DBda mavjud ustunlar bilan.
    Migrate kechiksa ham bron yaratish 500 bermasligi uchun.
    """
    from django.utils import timezone

    from bookings.models import Booking

    cols = _booking_column_names()
    if not cols:
        return Booking.objects.create(**kwargs)

    missing = [
        f
        for f in Booking._meta.concrete_fields
        if (not f.auto_created or f.concrete)
        and not f.primary_key
        and f.column not in cols
    ]
    if not missing:
        return Booking.objects.create(**kwargs)

    now = timezone.now()
    col_names: list[str] = []
    params: list = []
    for field in Booking._meta.concrete_fields:
        if field.primary_key or (field.auto_created and not field.concrete):
            continue
        if field.column not in cols:
            continue
        name = field.name
        if name in kwargs:
            val = kwargs[name]
            if field.is_relation and val is not None and hasattr(val, "pk"):
                val = val.pk
            col_names.append(field.column)
            params.append(val)
        elif getattr(field, "auto_now_add", False) or getattr(field, "auto_now", False):
            col_names.append(field.column)
            params.append(now)
        elif field.null:
            col_names.append(field.column)
            params.append(None)
        elif field.has_default():
            col_names.append(field.column)
            params.append(field.get_default())

    if not col_names:
        return Booking.objects.create(**kwargs)

    placeholders = ", ".join(["%s"] * len(col_names))
    sql = (
        f"INSERT INTO bookings_booking ({', '.join(col_names)}) "
        f"VALUES ({placeholders}) RETURNING id"
    )
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = cursor.fetchone()
    pk = row[0] if row else None
    if pk is None:
        return Booking.objects.create(**kwargs)
    return booking_queryset_compat(Booking.objects.filter(pk=pk)).get()
