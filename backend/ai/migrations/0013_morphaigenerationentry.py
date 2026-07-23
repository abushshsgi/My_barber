# Generated manually for MorphAiGenerationEntry

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0012_restore_classic_men_catalog"),
    ]

    operations = [
        migrations.CreateModel(
            name="MorphAiGenerationEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("style_id", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("title", models.CharField(blank=True, default="", max_length=160)),
                ("persona_id", models.CharField(blank=True, default="", max_length=64)),
                (
                    "before_photo",
                    models.ImageField(blank=True, null=True, upload_to="ai-style/generations/%Y/%m/"),
                ),
                ("after_photo", models.ImageField(upload_to="ai-style/generations/%Y/%m/")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="morph_generations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="morphaigenerationentry",
            index=models.Index(fields=["user", "-created_at"], name="ai_morphgen_user_created_idx"),
        ),
    ]
