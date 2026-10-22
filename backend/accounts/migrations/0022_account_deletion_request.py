# Generated migration for AccountDeletionRequest

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0021_user_morph_free_tryon"),
    ]

    operations = [
        migrations.CreateModel(
            name="AccountDeletionRequest",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("email", models.EmailField(blank=True, db_index=True, null=True)),
                ("phone", models.CharField(blank=True, db_index=True, max_length=32, null=True)),
                ("explanation", models.TextField(blank=True, default="")),
                ("verification_code", models.CharField(blank=True, default="", max_length=8)),
                (
                    "verification_expires_at",
                    models.DateTimeField(blank=True, null=True),
                ),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending Verification"),
                            ("verified", "Verified — Awaiting Processing"),
                            ("processing", "Processing"),
                            ("completed", "Completed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("user_id", models.BigIntegerField(blank=True, db_index=True, null=True)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, default="", max_length=512)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["status", "created_at"], name="accounts_accou_status_crea_idx"),
                    models.Index(fields=["email", "status"], name="accounts_accou_email_stat_idx"),
                    models.Index(fields=["phone", "status"], name="accounts_accou_phone_stat_idx"),
                ],
            },
        ),
    ]
