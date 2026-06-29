from django.db import migrations, models


def backfill_order_numbers(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    import secrets

    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ0123456789"
    used = set(
        Booking.objects.exclude(order_number__isnull=True).values_list(
            "order_number", flat=True
        )
    )
    for booking in Booking.objects.filter(order_number__isnull=True).iterator():
        day = booking.created_at.strftime("%Y%m%d") if booking.created_at else "00000000"
        while True:
            suffix = "".join(secrets.choice(alphabet) for _ in range(4))
            candidate = f"MS-{day}-{suffix}"
            if candidate not in used:
                used.add(candidate)
                break
        booking.order_number = candidate
        booking.save(update_fields=["order_number"])


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0009_booking_portfolio_consent_checked_in"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="order_number",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Support uchun doimiy buyurtma raqami (MS-YYYYMMDD-XXXX).",
                max_length=32,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="check_in_token",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Mijoz QR kodi uchun maxfiy token. Bir marta ishlatiladi.",
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="check_in_short_code",
            field=models.CharField(
                blank=True,
                help_text="Qo'lda kiritish uchun qisqa kod (token bilan birga).",
                max_length=12,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="check_in_token_issued_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="check_in_token_used_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_order_numbers, migrations.RunPython.noop),
    ]
