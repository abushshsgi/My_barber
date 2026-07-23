"""Old Money o'rniga Irland klassik 12 uslubni katalogga qaytarish."""

from django.db import migrations


def restore_classic_catalog(apps, schema_editor):
    from ai.hairstyle_seed import HAIRSTYLE_SEED

    Hairstyle = apps.get_model("ai", "Hairstyle")
    keep_ids = {row["style_id"] for row in HAIRSTYLE_SEED}
    Hairstyle.objects.exclude(style_id__in=keep_ids).filter(audience="men").delete()
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
        ("ai", "0011_seed_old_money_curl_catalog"),
    ]

    operations = [
        migrations.RunPython(restore_classic_catalog, migrations.RunPython.noop),
    ]
