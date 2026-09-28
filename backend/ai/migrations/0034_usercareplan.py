import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0033_weather_shield"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserCarePlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("plan", models.JSONField(blank=True, default=dict)),
                ("analyses", models.JSONField(blank=True, default=list)),
                ("product_ids", models.JSONField(blank=True, default=list)),
                ("profile_key", models.CharField(blank=True, default="", max_length=80)),
                ("source", models.CharField(blank=True, default="rules", max_length=24)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="care_plan",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-updated_at"]},
        ),
    ]
