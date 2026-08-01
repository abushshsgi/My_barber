from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0014_barber_wallet_and_escrow"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="master_card_json",
            field=models.JSONField(
                blank=True,
                help_text="Morf AI Barber Master Card (texnik retsept JSON).",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="style_preview_url",
            field=models.URLField(
                blank=True,
                default="",
                help_text="Try-on / style preview URL for barber dashboard.",
                max_length=2000,
            ),
        ),
        migrations.AddField(
            model_name="booking",
            name="viewer_camera_state",
            field=models.JSONField(
                blank=True,
                help_text="Multi-angle / 3D viewer camera state at booking time.",
                null=True,
            ),
        ),
    ]
