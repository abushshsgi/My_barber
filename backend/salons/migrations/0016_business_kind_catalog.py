# Generated manually for business_kind CRM

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("salons", "0015_salonmembership_booking_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="salon",
            name="business_kind",
            field=models.CharField(
                blank=True,
                choices=[
                    ("barbershop", "Sartaroshxona"),
                    ("beauty_salon", "Go'zallik saloni"),
                ],
                db_index=True,
                default="",
                help_text="Sartaroshxona yoki go'zallik saloni — egasi signup tanlovi.",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="category",
            name="for_barbershop",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name="category",
            name="for_beauty_salon",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AddField(
            model_name="catalogservice",
            name="for_barbershop",
            field=models.BooleanField(db_index=True, default=True),
        ),
        migrations.AddField(
            model_name="catalogservice",
            name="for_beauty_salon",
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
