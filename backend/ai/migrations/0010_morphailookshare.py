# Generated manually for MorphAiLookShare

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0009_studio_kind"),
    ]

    operations = [
        migrations.CreateModel(
            name="MorphAiLookShare",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("style_id", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("title", models.CharField(blank=True, default="", max_length=160)),
                (
                    "before_photo",
                    models.ImageField(blank=True, null=True, upload_to="ai-style/shares/%Y/%m/"),
                ),
                ("after_photo", models.ImageField(upload_to="ai-style/shares/%Y/%m/")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="morph_look_shares",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
