from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0006_review_barber_reply_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="portfolio_consent",
            field=models.BooleanField(
                blank=True,
                help_text="Mijoz portfolio uchun rasmga ruxsat berishi (null = hali javob bermagan).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="checked_in_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Mijoz kelgan vaqt (barber check-in).",
                null=True,
            ),
        ),
    ]
