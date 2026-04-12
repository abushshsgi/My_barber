from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0004_booking_customer_phone"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="started_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Barber xizmatni boshlagan vaqt (taymer uchun).",
                null=True,
            ),
        ),
    ]
