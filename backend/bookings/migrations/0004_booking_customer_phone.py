from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0003_alter_booking_barber_alter_review_barber"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="customer_phone",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
    ]
