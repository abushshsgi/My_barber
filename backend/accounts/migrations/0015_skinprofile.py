from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0014_referral"),
    ]

    operations = [
        migrations.CreateModel(
            name="SkinProfile",
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
                (
                    "skin_type",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("dry", "Dry"),
                            ("oily", "Oily"),
                            ("combination", "Combination"),
                            ("normal", "Normal"),
                        ],
                        default="",
                        max_length=16,
                    ),
                ),
                ("acne_prone", models.BooleanField(default=False)),
                (
                    "sensitivity",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("low", "Low"),
                            ("medium", "Medium"),
                            ("high", "High"),
                        ],
                        default="",
                        max_length=16,
                    ),
                ),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="skin_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
