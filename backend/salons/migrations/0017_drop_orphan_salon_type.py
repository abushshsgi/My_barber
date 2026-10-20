# Orphan DB column leftover — not in Salon model; blocks INSERT (NOT NULL, no default).

from django.db import migrations


def drop_orphan_column(apps, schema_editor):
    # Faqat PostgreSQL — SQLite (lokal test) da bu ustun hech qachon bo'lmagan.
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("ALTER TABLE salons_salon DROP COLUMN IF EXISTS salon_type;")


def restore_orphan_column(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        "ALTER TABLE salons_salon "
        "ADD COLUMN IF NOT EXISTS salon_type varchar(32) NOT NULL DEFAULT '';"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("salons", "0016_business_kind_catalog"),
    ]

    operations = [
        migrations.RunPython(drop_orphan_column, restore_orphan_column),
    ]
