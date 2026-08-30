# Generated manually for CareUserProduct

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0025_care_product_like"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CareUserProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("scan", "Scan"),
                            ("catalog", "Catalog"),
                            ("recommended", "Recommended"),
                        ],
                        default="catalog",
                        max_length=16,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_saves",
                        to="ai.careproduct",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="care_user_products",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="careuserproduct",
            index=models.Index(fields=["user", "-created_at"], name="ai_careuser_user_id_a1b2c3_idx"),
        ),
        migrations.AddIndex(
            model_name="careuserproduct",
            index=models.Index(fields=["product", "-created_at"], name="ai_careuser_product_d4e5f6_idx"),
        ),
        migrations.AddConstraint(
            model_name="careuserproduct",
            constraint=models.UniqueConstraint(
                fields=("user", "product"),
                name="uniq_care_user_product_user_product",
            ),
        ),
    ]
