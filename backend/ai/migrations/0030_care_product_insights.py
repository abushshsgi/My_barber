from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0029_gs1_country_codes"),
    ]

    operations = [
        migrations.AddField(
            model_name="careproduct",
            name="views_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="careproduct",
            name="clicks_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.CreateModel(
            name="CareProductInsight",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("views", models.PositiveIntegerField(default=0)),
                ("clicks", models.PositiveIntegerField(default=0)),
                ("first_seen_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="insights",
                        to="ai.careproduct",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="care_product_insights",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="careproductinsight",
            constraint=models.UniqueConstraint(
                fields=("user", "product"),
                name="uniq_care_product_insight_user_product",
            ),
        ),
        migrations.AddIndex(
            model_name="careproductinsight",
            index=models.Index(fields=["product", "-last_seen_at"], name="ai_careins_prod_seen_idx"),
        ),
        migrations.AddIndex(
            model_name="careproductinsight",
            index=models.Index(fields=["user", "-last_seen_at"], name="ai_careins_user_seen_idx"),
        ),
    ]
