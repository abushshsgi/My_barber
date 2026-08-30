from django.db import migrations, models


def seed_gs1_codes(apps, schema_editor):
    Gs1CountryCode = apps.get_model("ai", "Gs1CountryCode")
    from ai.services.barcode_country import gs1_country_rows

    for row in gs1_country_rows():
        Gs1CountryCode.objects.update_or_create(
            prefix_label=row["prefix_label"],
            defaults={
                "country_name": row["country_name"],
                "prefix_start": row["prefix_start"],
                "prefix_end": row["prefix_end"],
            },
        )


def unseed_gs1_codes(apps, schema_editor):
    Gs1CountryCode = apps.get_model("ai", "Gs1CountryCode")
    Gs1CountryCode.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0028_care_product_barcode"),
    ]

    operations = [
        migrations.CreateModel(
            name="Gs1CountryCode",
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
                ("prefix_label", models.CharField(db_index=True, max_length=16, unique=True)),
                ("country_name", models.CharField(max_length=80)),
                ("prefix_start", models.PositiveSmallIntegerField(db_index=True)),
                ("prefix_end", models.PositiveSmallIntegerField(db_index=True)),
            ],
            options={
                "verbose_name": "GS1 country code",
                "verbose_name_plural": "GS1 country codes",
                "ordering": ["prefix_start", "prefix_end"],
            },
        ),
        migrations.AddIndex(
            model_name="gs1countrycode",
            index=models.Index(
                fields=["prefix_start", "prefix_end"],
                name="ai_gs1_prefix_range_idx",
            ),
        ),
        migrations.RunPython(seed_gs1_codes, unseed_gs1_codes),
    ]
