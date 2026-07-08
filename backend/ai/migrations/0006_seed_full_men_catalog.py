"""Barcha erkaklar katalog uslublarini (12 ta) qayta seed qilish."""

from django.db import migrations


def seed_full_catalog(apps, schema_editor):
    from ai.hairstyle_seed import HAIRSTYLE_SEED

    Hairstyle = apps.get_model("ai", "Hairstyle")
    for row in HAIRSTYLE_SEED:
        Hairstyle.objects.update_or_create(
            style_id=row["style_id"],
            defaults={
                "slug": row["slug"],
                "audience": row["audience"],
                "category": row["category"],
                "title": row["title"],
                "title_uz": row["title_uz"],
                "face_shapes": row["face_shapes"],
                "hair_length": row["hair_length"],
                "image_path": row["image_path"],
                "description_uz": row["description_uz"],
                "tags": row["tags"],
                "age_groups": row["age_groups"],
                "sort_order": row["sort_order"],
                "is_published": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0005_catalog_image_assets_only"),
    ]

    operations = [
        migrations.RunPython(seed_full_catalog, migrations.RunPython.noop),
    ]
