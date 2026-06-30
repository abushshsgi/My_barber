from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0011_review_dimensions"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="notes",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Mijozning izohi yoki maxsus so'rovi (ixtiyoriy).",
            ),
        ),
    ]
