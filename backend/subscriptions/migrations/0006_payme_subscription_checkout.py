from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0005_backfill_free_chat_tokens"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionpayment",
            name="amount_tiyin",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="subscriptionpayment",
            name="payme_receipt_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="subscriptionpayment",
            name="payme_state",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="subscriptionpayment",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Kutilmoqda"),
                    ("paid", "To'langan"),
                    ("failed", "Muvaffaqiyatsiz"),
                    ("cancelled", "Bekor qilingan"),
                    ("expired", "Muddati o'tgan"),
                    ("refunded", "Qaytarilgan"),
                ],
                db_index=True,
                default="pending",
                max_length=16,
            ),
        ),
        migrations.AddConstraint(
            model_name="subscriptionpayment",
            constraint=models.UniqueConstraint(
                condition=~models.Q(payme_receipt_id=""),
                fields=("payme_receipt_id",),
                name="uniq_subscription_payme_receipt_id",
            ),
        ),
    ]
