"""checked_in_at / portfolio_consent ustunlari migrate kechiksa production 500 bermasligi uchun."""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection

from bookings.db_compat import clear_booking_schema_cache

TABLE = "bookings_booking"
MIGRATION_NAME = "0009_booking_portfolio_consent_checked_in"


class Command(BaseCommand):
    help = "Booking check-in ustunlarini migrate yoki SQL orqali idempotent qo'shadi."

    def _column_names(self) -> set[str]:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, TABLE)
        return {col.name for col in columns}

    def _ready(self) -> bool:
        cols = self._column_names()
        return "checked_in_at" in cols and "portfolio_consent" in cols

    def _migration_applied(self) -> bool:
        from django.db.migrations.recorder import MigrationRecorder

        return MigrationRecorder(connection).migration_qs.filter(
            app="bookings",
            name=MIGRATION_NAME,
        ).exists()

    def _add_columns_sql(self) -> None:
        vendor = connection.vendor
        cols = self._column_names()
        with connection.cursor() as cursor:
            if "portfolio_consent" not in cols:
                if vendor == "postgresql":
                    cursor.execute(
                        f"ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS portfolio_consent BOOLEAN NULL"
                    )
                else:
                    cursor.execute(
                        f"ALTER TABLE {TABLE} ADD COLUMN portfolio_consent bool NULL"
                    )
            if "checked_in_at" not in cols:
                if vendor == "postgresql":
                    cursor.execute(
                        f"ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS checked_in_at "
                        "TIMESTAMP WITH TIME ZONE NULL"
                    )
                else:
                    cursor.execute(
                        f"ALTER TABLE {TABLE} ADD COLUMN checked_in_at datetime NULL"
                    )

    def handle(self, *args, **options):
        clear_booking_schema_cache()
        if self._ready():
            if not self._migration_applied():
                call_command("migrate", "bookings", MIGRATION_NAME, fake=True, verbosity=1)
            return

        self.stdout.write("Booking check-in schema outdated; running migrate...")
        call_command("migrate", interactive=False, verbosity=1)
        clear_booking_schema_cache()

        if not self._ready():
            self.stdout.write("Columns still missing; applying SQL fallback...")
            self._add_columns_sql()
            clear_booking_schema_cache()

        if not self._ready():
            raise RuntimeError(
                "bookings_booking.checked_in_at still missing after migrate and SQL fallback."
            )

        if not self._migration_applied():
            call_command("migrate", "bookings", MIGRATION_NAME, fake=True, verbosity=1)

        self.stdout.write(self.style.SUCCESS("Booking check-in schema ready."))
