"""Faqat persona rasmlari mavjud bo'lgan 4 ta erkak uslubini qoldirish."""

from django.db import migrations

KEEP_STYLE_IDS = frozenset(
    {
        "men-mid-fade",
        "men-skin-fade",
        "men-buzz-cut",
        "men-textured-crop",
    }
)


def prune_and_sync_catalog(apps, schema_editor):
    from ai.hairstyle_seed import HAIRSTYLE_SEED

    Hairstyle = apps.get_model("ai", "Hairstyle")
    Hairstyle.objects.exclude(style_id__in=KEEP_STYLE_IDS).delete()
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
        ("ai", "0004_hairstyle_age_groups"),
    ]

    operations = [
        migrations.RunPython(prune_and_sync_catalog, migrations.RunPython.noop),
    ]
