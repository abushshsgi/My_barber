from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0005_booking_started_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="barber_replied_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="review",
            name="barber_reply",
            field=models.TextField(blank=True, default=""),
        ),
    ]
