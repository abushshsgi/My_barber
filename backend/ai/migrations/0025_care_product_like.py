# Generated manually for CareProductLike

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0024_care_catalog"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CareProductLike",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="likes",
                        to="ai.careproduct",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="care_product_likes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="careproductlike",
            index=models.Index(fields=["product", "-created_at"], name="ai_careprod_product_7c2a1d_idx"),
        ),
        migrations.AddIndex(
            model_name="careproductlike",
            index=models.Index(fields=["user", "-created_at"], name="ai_careprod_user_id_8f4b2e_idx"),
        ),
        migrations.AddConstraint(
            model_name="careproductlike",
            constraint=models.UniqueConstraint(
                fields=("user", "product"),
                name="uniq_care_product_like_user_product",
            ),
        ),
    ]
