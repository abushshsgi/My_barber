from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("wallet", "0010_barber_shop_subscription"),
    ]

    operations = [
        migrations.AddField(
            model_name="wallet",
            name="freeze_log",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="wallet",
            name="freeze_reason",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="wallet",
            name="frozen_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="wallet",
            name="frozen_by",
            field=models.CharField(
                blank=True,
                choices=[("user", "Foydalanuvchi"), ("admin", "Admin")],
                default="",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="wallet",
            name="frozen_by_admin_id",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="wallet",
            name="frozen_by_label",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="wallet",
            name="frozen_by_user_id",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="wallet",
            name="is_frozen",
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
