from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0023_voice_stt_tts_kind"),
    ]

    operations = [
        migrations.CreateModel(
            name="CareProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("brand", models.CharField(blank=True, default="", max_length=120)),
                ("slug", models.SlugField(max_length=180, unique=True)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("shampoo", "Shampun"),
                            ("balsam", "Balzam"),
                            ("mask", "Maska"),
                            ("oil", "Yog'"),
                            ("spray", "Sprey"),
                            ("other", "Boshqa"),
                        ],
                        db_index=True,
                        default="shampoo",
                        max_length=16,
                    ),
                ),
                ("image", models.ImageField(blank=True, null=True, upload_to="care/products/%Y/%m/")),
                ("ingredients_text", models.TextField(blank=True, default="")),
                ("ingredients", models.JSONField(blank=True, default=list)),
                ("usage_uz", models.TextField(blank=True, default="")),
                ("purpose_uz", models.TextField(blank=True, default="")),
                ("suitable_for", models.JSONField(blank=True, default=list)),
                ("not_suitable_for", models.JSONField(blank=True, default=list)),
                ("pros_uz", models.TextField(blank=True, default="")),
                ("cons_uz", models.TextField(blank=True, default="")),
                ("warnings_uz", models.TextField(blank=True, default="")),
                ("is_published", models.BooleanField(db_index=True, default=True)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="care_products_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["sort_order", "name"]},
        ),
        migrations.CreateModel(
            name="HairCareProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "condition",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("oily", "Oily"),
                            ("dry", "Dry"),
                            ("normal", "Normal"),
                            ("damaged", "Damaged"),
                        ],
                        default="",
                        max_length=16,
                    ),
                ),
                (
                    "texture",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("straight", "Straight"),
                            ("wavy", "Wavy"),
                            ("curly", "Curly"),
                        ],
                        default="",
                        max_length=16,
                    ),
                ),
                (
                    "color_status",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("natural", "Natural"),
                            ("colored", "Colored"),
                            ("bleached", "Bleached"),
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
                        related_name="hair_care_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="IngredientScanEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("photo", models.ImageField(blank=True, null=True, upload_to="care/scans/%Y/%m/")),
                ("extracted_name", models.CharField(blank=True, default="", max_length=160)),
                ("ingredients", models.JSONField(blank=True, default=list)),
                (
                    "verdict",
                    models.CharField(
                        choices=[
                            ("good", "Good"),
                            ("caution", "Caution"),
                            ("bad", "Bad"),
                            ("dangerous", "Dangerous"),
                        ],
                        db_index=True,
                        default="caution",
                        max_length=16,
                    ),
                ),
                ("safety_score", models.PositiveSmallIntegerField(default=0)),
                ("result", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "matched_product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="scans",
                        to="ai.careproduct",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ingredient_scans",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="careproduct",
            index=models.Index(fields=["is_published", "category", "sort_order"], name="ai_careprod_is_publ_idx"),
        ),
        migrations.AddIndex(
            model_name="ingredientscanentry",
            index=models.Index(fields=["user", "-created_at"], name="ai_ingredie_user_id_idx"),
        ),
        migrations.AddIndex(
            model_name="ingredientscanentry",
            index=models.Index(fields=["verdict", "-created_at"], name="ai_ingredie_verdict_idx"),
        ),
    ]
