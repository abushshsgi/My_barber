from django.db import migrations, models


def sync_age_groups(apps, schema_editor):
    from ai.hairstyle_seed import HAIRSTYLE_SEED

    Hairstyle = apps.get_model("ai", "Hairstyle")
    for row in HAIRSTYLE_SEED:
        Hairstyle.objects.filter(style_id=row["style_id"]).update(
            age_groups=row.get("age_groups", ["teen", "young", "adult"]),
        )


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0003_seed_hairstyles"),
    ]

    operations = [
        migrations.AddField(
            model_name="hairstyle",
            name="age_groups",
            field=models.JSONField(
                default=list,
                help_text="Mos yosh guruhlari: kids, teen, young, adult, mature",
            ),
        ),
        migrations.RunPython(sync_age_groups, migrations.RunPython.noop),
    ]
