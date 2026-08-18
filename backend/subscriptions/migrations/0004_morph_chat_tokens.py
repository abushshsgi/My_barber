from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0003_remove_referral_trial"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionusageperiod",
            name="morph_chat_tokens_used",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
