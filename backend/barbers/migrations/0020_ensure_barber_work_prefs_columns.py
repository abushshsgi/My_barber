"""Production: 0019 ba'zan qo'llanmagan bo'lib qolsa work prefs ustunlari yo'q — idempotent qo'shamiz."""

from django.db import connection, migrations


def _column_names(table: str) -> set[str]:
    with connection.cursor() as cursor:
        return {
            col.name for col in connection.introspection.get_table_description(cursor, table)
        }


def add_work_pref_columns(apps, schema_editor):
    table = "barbers_barberprofile"
    cols = _column_names(table)
    if connection.vendor == "postgresql":
        if "payment_methods" not in cols:
            schema_editor.execute(
                "ALTER TABLE barbers_barberprofile "
                "ADD COLUMN IF NOT EXISTS payment_methods jsonb NOT NULL DEFAULT '[]'::jsonb"
            )
        if "work_location_type" not in cols:
            schema_editor.execute(
                "ALTER TABLE barbers_barberprofile "
                "ADD COLUMN IF NOT EXISTS work_location_type varchar(16) NOT NULL DEFAULT ''"
            )
        return
    if "payment_methods" not in cols:
        schema_editor.execute(
            "ALTER TABLE barbers_barberprofile "
            "ADD COLUMN payment_methods text NOT NULL DEFAULT '[]'"
        )
    cols = _column_names(table)
    if "work_location_type" not in cols:
        schema_editor.execute(
            "ALTER TABLE barbers_barberprofile "
            "ADD COLUMN work_location_type varchar(16) NOT NULL DEFAULT ''"
        )


class Migration(migrations.Migration):
    dependencies = [
        ("barbers", "0019_barberprofile_work_prefs"),
    ]

    operations = [
        migrations.RunPython(add_work_pref_columns, migrations.RunPython.noop),
    ]
