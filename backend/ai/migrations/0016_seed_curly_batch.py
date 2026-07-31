"""Curly reference batch — 17 uslubni DB ga qo'shish."""

from django.db import migrations


def seed_curly_batch(apps, schema_editor):
    from ai.hairstyle_seed_curly_batch import curly_batch_hairstyle_rows

    Hairstyle = apps.get_model("ai", "Hairstyle")
    for row in curly_batch_hairstyle_rows():
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
        ("ai", "0015_seed_wet_curl_taper"),
    ]

    operations = [
        migrations.RunPython(seed_curly_batch, migrations.RunPython.noop),
    ]
