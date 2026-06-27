from django.db import migrations, models


def backfill_legacy_online_paid(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    Booking.objects.all().update(
        payment_method="online",
        payment_status="paid",
    )


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0007_booking_family_member"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="payment_method",
            field=models.CharField(
                choices=[("cash", "Cash"), ("online", "Online")],
                db_index=True,
                default="cash",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("not_applicable", "N/A"),
                    ("pending", "Pending"),
                    ("paid", "Paid"),
                    ("refunded", "Refunded"),
                ],
                db_index=True,
                default="not_applicable",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_legacy_online_paid, migrations.RunPython.noop),
    ]
