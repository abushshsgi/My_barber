from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("subscriptions", "0008_usage_plan_code"),
    ]

    operations = [
        migrations.CreateModel(
            name="FlashTryonPass",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("pending", "To'lov kutilmoqda"), ("paid", "To'langan"), ("used", "Rasm ishlatilgan"), ("expired", "Muddati tugagan"), ("cancelled", "Bekor qilingan"), ("failed", "Muvaffaqiyatsiz")], db_index=True, default="pending", max_length=16)),
                ("amount_uzs", models.DecimalField(decimal_places=2, default=1000, max_digits=12)),
                ("amount_tiyin", models.PositiveIntegerField(default=100000)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("order_id", models.CharField(blank=True, db_index=True, default="", max_length=128)),
                ("payme_receipt_id", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("used_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("reserved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("payment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="flash_passes", to="subscriptions.subscriptionpayment")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="flash_tryon_pass", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name="flashtryonpass",
            index=models.Index(fields=["status", "expires_at"], name="subscriptio_status_7f0a1d_idx"),
        ),
    ]
