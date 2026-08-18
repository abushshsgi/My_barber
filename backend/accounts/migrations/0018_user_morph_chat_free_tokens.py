# Generated manually — morph_chat_free_tokens_used

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0017_user_morph_referral_credits"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="morph_chat_free_tokens_used",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
