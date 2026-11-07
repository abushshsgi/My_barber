from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0007_subscription_cancel"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionusageperiod",
            name="plan_code",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
    ]
