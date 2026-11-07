from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0036_alter_morphaisettings_options_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="TryOnTask",
            fields=[
                ("id", models.CharField(max_length=32, primary_key=True, serialize=False)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("processing", "Processing"),
                            ("retrying", "Retrying"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                (
                    "job_kind",
                    models.CharField(
                        choices=[("tryon", "Try-on"), ("multiview", "Multiview")],
                        default="tryon",
                        max_length=16,
                    ),
                ),
                ("style_id", models.CharField(blank=True, default="", max_length=64)),
                ("style_title", models.CharField(blank=True, default="", max_length=160)),
                ("audience", models.CharField(blank=True, default="", max_length=16)),
                ("slug", models.CharField(blank=True, default="", max_length=64)),
                ("persona_id", models.CharField(blank=True, default="", max_length=64)),
                ("reference_image_url", models.CharField(blank=True, default="", max_length=512)),
                ("idempotency_key", models.CharField(blank=True, db_index=True, default="", max_length=80)),
                ("attempt_count", models.PositiveSmallIntegerField(default=0)),
                ("max_attempts", models.PositiveSmallIntegerField(default=6)),
                ("lease_until", models.DateTimeField(blank=True, null=True)),
                ("lease_owner", models.CharField(blank=True, default="", max_length=64)),
                ("provider", models.CharField(blank=True, default="", max_length=32)),
                ("model_name", models.CharField(blank=True, default="", max_length=120)),
                ("error_detail", models.CharField(blank=True, default="", max_length=500)),
                ("latency_ms", models.PositiveIntegerField(default=0)),
                (
                    "input_photo",
                    models.ImageField(blank=True, null=True, upload_to="ai-style/tryon-jobs/%Y/%m/"),
                ),
                (
                    "result_photo",
                    models.ImageField(blank=True, null=True, upload_to="ai-style/tryon-jobs/%Y/%m/"),
                ),
                ("result_meta", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tryon_tasks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="tryontask",
            index=models.Index(fields=["status", "updated_at"], name="ai_tryontask_status_upd_idx"),
        ),
        migrations.AddIndex(
            model_name="tryontask",
            index=models.Index(fields=["user", "-created_at"], name="ai_tryontask_user_created_idx"),
        ),
    ]
