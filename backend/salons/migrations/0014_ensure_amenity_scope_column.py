"""Production: 0013 ba'zan qo'llanmagan bo'lib qolsa scope ustuni yo'q — idempotent qo'shamiz."""

from django.db import connection, migrations


def _column_names(table: str) -> set[str]:
    with connection.cursor() as cursor:
        return {
            col.name for col in connection.introspection.get_table_description(cursor, table)
        }


def add_scope_column(apps, schema_editor):
    table = "salons_amenity"
    if "scope" in _column_names(table):
        return
    if connection.vendor == "postgresql":
        schema_editor.execute(
            "ALTER TABLE salons_amenity "
            "ADD COLUMN IF NOT EXISTS scope varchar(16) NOT NULL DEFAULT 'all'"
        )
        schema_editor.execute(
            "CREATE INDEX IF NOT EXISTS salons_amenity_scope_6a0b0d89 "
            "ON salons_amenity (scope)"
        )
        return
    schema_editor.execute(
        "ALTER TABLE salons_amenity ADD COLUMN scope varchar(16) NOT NULL DEFAULT 'all'"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("salons", "0013_amenity_scope"),
    ]

    operations = [
        migrations.RunPython(add_scope_column, migrations.RunPython.noop),
    ]
