"""Wet Curl Taper — rasmdagi jingalak wet-look uslub."""

from django.db import migrations


def seed_wet_curl_taper(apps, schema_editor):
    from ai.hairstyle_seed_new20 import NEW_MEN_HAIRSTYLE_SEED

    Hairstyle = apps.get_model("ai", "Hairstyle")
    row = next(r for r in NEW_MEN_HAIRSTYLE_SEED if r["slug"] == "wet-curl-taper")
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
        ("ai", "0014_seed_new20_men_hairstyles"),
    ]

    operations = [
        migrations.RunPython(seed_wet_curl_taper, migrations.RunPython.noop),
    ]
