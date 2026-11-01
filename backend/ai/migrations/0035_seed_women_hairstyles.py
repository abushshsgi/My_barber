from django.db import migrations


def seed_women_hairstyles(apps, schema_editor):
    from ai.hairstyle_seed_women import WOMEN_HAIRSTYLE_SEED

    Hairstyle = apps.get_model("ai", "Hairstyle")
    for row in WOMEN_HAIRSTYLE_SEED:
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


def unseed_women_hairstyles(apps, schema_editor):
    from ai.hairstyle_seed_women import WOMEN_HAIRSTYLE_SEED

    Hairstyle = apps.get_model("ai", "Hairstyle")
    ids = [row["style_id"] for row in WOMEN_HAIRSTYLE_SEED]
    Hairstyle.objects.filter(style_id__in=ids).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0034_usercareplan"),
    ]

    operations = [
        migrations.RunPython(seed_women_hairstyles, unseed_women_hairstyles),
    ]
