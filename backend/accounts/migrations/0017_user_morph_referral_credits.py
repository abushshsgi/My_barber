# Generated manually — morph_referral_credits

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0016_usersession_client_kind"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="morph_referral_credits",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
