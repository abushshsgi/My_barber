from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("barbers", "0021_barberprofile_booking_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="barber",
            name="business_kind",
            field=models.CharField(
                blank=True,
                choices=[
                    ("barbershop", "Sartaroshxona"),
                    ("beauty_salon", "Go'zallik saloni"),
                ],
                db_index=True,
                default="",
                help_text="Sartaroshxona yoki go'zallik saloni — signup birinchi savoli.",
                max_length=16,
            ),
        ),
    ]
