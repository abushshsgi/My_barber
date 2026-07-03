from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("salons", "0014_ensure_amenity_scope_column"),
    ]

    operations = [
        migrations.AddField(
            model_name="salonmembership",
            name="booking_mode",
            field=models.CharField(
                choices=[("daily", "Har kunlik"), ("advance", "Oldindan")],
                default="daily",
                help_text="Salon ichidagi ishchi bron qabul qilish rejimi.",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="salonmembership",
            name="advance_min_days",
            field=models.PositiveSmallIntegerField(default=2),
        ),
        migrations.AddField(
            model_name="salonmembership",
            name="advance_max_days",
            field=models.PositiveSmallIntegerField(default=3),
        ),
    ]
