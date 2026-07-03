from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("barbers", "0020_ensure_barber_work_prefs_columns"),
    ]

    operations = [
        migrations.AddField(
            model_name="barberprofile",
            name="booking_mode",
            field=models.CharField(
                choices=[("daily", "Har kunlik"), ("advance", "Oldindan")],
                default="daily",
                help_text="daily — bugundan bron; advance — faqat N kun oldindan.",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="barberprofile",
            name="advance_min_days",
            field=models.PositiveSmallIntegerField(
                default=2,
                help_text="Oldindan rejimda: eng kamida necha kun oldin bron qilish mumkin.",
            ),
        ),
        migrations.AddField(
            model_name="barberprofile",
            name="advance_max_days",
            field=models.PositiveSmallIntegerField(
                default=3,
                help_text="Oldindan rejimda: eng ko'pi bilan necha kun oldin bron qilish mumkin.",
            ),
        ),
    ]
