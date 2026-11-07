from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0006_payme_subscription_checkout"),
    ]

    operations = [
        migrations.AddField(
            model_name="usersubscription",
            name="cancelled_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.AlterField(
            model_name="usersubscription",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "To'lov kutilmoqda"),
                    ("active", "Faol"),
                    ("expired", "Muddati tugagan"),
                    ("cancelled", "Bekor qilingan"),
                    ("deactivated", "O'chirilgan"),
                    ("refunded", "To'lov qaytarilgan"),
                ],
                db_index=True,
                default="pending",
                max_length=16,
            ),
        ),
    ]
