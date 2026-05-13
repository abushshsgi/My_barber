from django.db import migrations, models
from django.utils import timezone


def backfill_email_verified(apps, schema_editor):
    Barber = apps.get_model("barbers", "Barber")
    now = timezone.now()
    Barber.objects.filter(email_verified_at__isnull=True).update(email_verified_at=now)


class Migration(migrations.Migration):
    dependencies = [
        ("barbers", "0011_barberprofile_spoken_languages"),
    ]

    operations = [
        migrations.AddField(
            model_name="barber",
            name="email_verified_at",
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                help_text="Email tasdiqlangan vaqt. Mijozlarga ko‘rinish va to‘liq panel uchun talab.",
                null=True,
            ),
        ),
        migrations.RunPython(backfill_email_verified, migrations.RunPython.noop),
    ]
