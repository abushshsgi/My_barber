"""checked_in_at / portfolio_consent ustunlari migrate kechiksa production 500 bermasligi uchun."""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection

from bookings.db_compat import clear_booking_schema_cache

TABLE = "bookings_booking"
MIGRATION_NAME = "0009_booking_portfolio_consent_checked_in"
ORDER_MIGRATION_NAME = "0010_booking_order_number_checkin_token"

# checked_in_at / portfolio_consent (0009) + order_number / check_in_token (0010)
REQUIRED_COLUMNS = (
    "checked_in_at",
    "portfolio_consent",
    "order_number",
    "check_in_token",
    "check_in_short_code",
    "check_in_token_issued_at",
    "check_in_token_used_at",
)


class Command(BaseCommand):
    help = "Booking check-in / order-number ustunlarini migrate yoki SQL orqali idempotent qo'shadi."

    def _column_names(self) -> set[str]:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, TABLE)
        return {col.name for col in columns}

    def _ready(self) -> bool:
        cols = self._column_names()
        return all(name in cols for name in REQUIRED_COLUMNS)

    def _migration_applied(self, name: str) -> bool:
        from django.db.migrations.recorder import MigrationRecorder

        return MigrationRecorder(connection).migration_qs.filter(
            app="bookings",
            name=name,
        ).exists()

    def _add_columns_sql(self) -> None:
        vendor = connection.vendor
        cols = self._column_names()
        dt_type = "TIMESTAMP WITH TIME ZONE" if vendor == "postgresql" else "datetime"
        if_not_exists = "IF NOT EXISTS " if vendor == "postgresql" else ""
        plan = [
            ("portfolio_consent", "BOOLEAN NULL" if vendor == "postgresql" else "bool NULL"),
            ("checked_in_at", f"{dt_type} NULL"),
            ("order_number", "VARCHAR(32) NULL"),
            ("check_in_token", "VARCHAR(64) NULL"),
            ("check_in_short_code", "VARCHAR(12) NULL"),
            ("check_in_token_issued_at", f"{dt_type} NULL"),
            ("check_in_token_used_at", f"{dt_type} NULL"),
        ]
        with connection.cursor() as cursor:
            for name, ddl in plan:
                if name in cols:
                    continue
                cursor.execute(
                    f"ALTER TABLE {TABLE} ADD COLUMN {if_not_exists}{name} {ddl}"
                )

    def handle(self, *args, **options):
        clear_booking_schema_cache()
        if self._ready():
            for name in (MIGRATION_NAME, ORDER_MIGRATION_NAME):
                if not self._migration_applied(name):
                    call_command("migrate", "bookings", name, fake=True, verbosity=1)
            return

        self.stdout.write("Booking check-in/order schema outdated; running migrate...")
        call_command("migrate", interactive=False, verbosity=1)
        clear_booking_schema_cache()

        if not self._ready():
            self.stdout.write("Columns still missing; applying SQL fallback...")
            self._add_columns_sql()
            clear_booking_schema_cache()

        if not self._ready():
            raise RuntimeError(
                "bookings_booking check-in/order columns still missing after migrate and SQL fallback."
            )

        for name in (MIGRATION_NAME, ORDER_MIGRATION_NAME):
            if not self._migration_applied(name):
                call_command("migrate", "bookings", name, fake=True, verbosity=1)

        self.stdout.write(self.style.SUCCESS("Booking check-in / order schema ready."))
