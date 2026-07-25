# Orphan DB column leftover — not in Salon model; blocks INSERT (NOT NULL, no default).

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("salons", "0016_business_kind_catalog"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE salons_salon DROP COLUMN IF EXISTS salon_type;",
            reverse_sql=(
                "ALTER TABLE salons_salon "
                "ADD COLUMN IF NOT EXISTS salon_type varchar(32) NOT NULL DEFAULT '';"
            ),
        ),
    ]
