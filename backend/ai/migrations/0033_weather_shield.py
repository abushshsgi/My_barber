# Generated manually for Weather Shield

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0032_careshelfitem_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeatherShieldCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("key", models.CharField(db_index=True, max_length=40, unique=True)),
                ("title_uz", models.CharField(max_length=120)),
                ("description_uz", models.TextField(blank=True, default="")),
                ("icon", models.CharField(blank=True, default="sunny-outline", max_length=48)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["sort_order", "title_uz"]},
        ),
        migrations.CreateModel(
            name="WeatherShieldProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("description_uz", models.TextField(blank=True, default="")),
                (
                    "kind",
                    models.CharField(
                        choices=[("product", "Mahsulot"), ("routine", "Rutina")],
                        db_index=True,
                        default="product",
                        max_length=16,
                    ),
                ),
                ("product_tag", models.CharField(blank=True, default="", max_length=64)),
                ("icon", models.CharField(blank=True, default="flask-outline", max_length=48)),
                ("image", models.ImageField(blank=True, null=True, upload_to="care/weather-shield/%Y/%m/")),
                ("external_image_url", models.URLField(blank=True, default="", max_length=500)),
                ("priority", models.PositiveSmallIntegerField(default=2)),
                ("hair_conditions", models.JSONField(blank=True, default=list)),
                ("is_published", models.BooleanField(db_index=True, default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="products",
                        to="ai.weathershieldcategory",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="weather_shield_products_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["priority", "sort_order", "name"]},
        ),
        migrations.CreateModel(
            name="WeatherShieldUserAction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action_key", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("completed", models.BooleanField(default=True)),
                ("weather_snapshot", models.JSONField(blank=True, default=dict)),
                ("completed_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_actions",
                        to="ai.weathershieldproduct",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="weather_shield_actions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-completed_at"]},
        ),
        migrations.AddIndex(
            model_name="weathershieldproduct",
            index=models.Index(fields=["is_published", "category", "priority"], name="ai_weathers_is_publ_idx"),
        ),
        migrations.AddIndex(
            model_name="weathershielduseraction",
            index=models.Index(fields=["user", "-completed_at"], name="ai_weathers_user_id_idx"),
        ),
        migrations.AddIndex(
            model_name="weathershielduseraction",
            index=models.Index(fields=["-completed_at"], name="ai_weathers_complet_idx"),
        ),
        migrations.AddConstraint(
            model_name="weathershielduseraction",
            constraint=models.UniqueConstraint(
                condition=models.Q(("product__isnull", False)),
                fields=("user", "product"),
                name="uniq_ws_user_product",
            ),
        ),
        migrations.AddConstraint(
            model_name="weathershielduseraction",
            constraint=models.UniqueConstraint(
                condition=models.Q(("action_key", ""), _negated=True),
                fields=("user", "action_key"),
                name="uniq_ws_user_action_key",
            ),
        ),
    ]
