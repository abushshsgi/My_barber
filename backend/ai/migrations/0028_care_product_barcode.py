from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0027_care_scalp_concerns"),
    ]

    operations = [
        migrations.AddField(
            model_name="careproduct",
            name="barcode",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="GS1 / EAN / UPC raqami (faqat raqamlar).",
                max_length=32,
                null=True,
                unique=True,
            ),
        ),
        migrations.AddField(
            model_name="careproduct",
            name="country_of_origin",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="careproduct",
            name="country_code_prefix",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="careproduct",
            name="is_verified",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="careproduct",
            name="external_image_url",
            field=models.URLField(blank=True, default="", max_length=500),
        ),
        migrations.AlterField(
            model_name="careproduct",
            name="category",
            field=models.CharField(
                choices=[
                    ("shampoo", "Shampun"),
                    ("balsam", "Balzam"),
                    ("conditioner", "Konditsioner"),
                    ("mask", "Maska"),
                    ("serum", "Sarum"),
                    ("oil", "Yog'"),
                    ("spray", "Sprey"),
                    ("other", "Boshqa"),
                ],
                db_index=True,
                default="shampoo",
                max_length=16,
            ),
        ),
    ]
