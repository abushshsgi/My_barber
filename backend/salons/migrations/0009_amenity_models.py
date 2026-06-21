import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("salons", "0008_catalogservice_service_catalog_service"),
    ]

    operations = [
        migrations.CreateModel(
            name="Amenity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.SlugField(max_length=64, unique=True)),
                ("icon", models.CharField(help_text="Lucide icon nomi", max_length=64)),
                ("labels", models.JSONField(blank=True, default=dict)),
            ],
            options={
                "verbose_name_plural": "amenities",
                "ordering": ["code"],
            },
        ),
        migrations.CreateModel(
            name="SalonAmenity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "amenity",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="salon_links",
                        to="salons.amenity",
                    ),
                ),
                (
                    "salon",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="salon_amenities",
                        to="salons.salon",
                    ),
                ),
            ],
            options={
                "ordering": ["amenity__code"],
                "unique_together": {("salon", "amenity")},
            },
        ),
    ]
