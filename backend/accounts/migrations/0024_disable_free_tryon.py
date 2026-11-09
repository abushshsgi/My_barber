from django.db import migrations, models


def disable_free_tryon(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(morph_free_tryon_eligible=True).update(morph_free_tryon_eligible=False)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0023_rename_accounts_accou_status_crea_idx_accounts_ac_status_605efb_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="morph_free_tryon_eligible",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(disable_free_tryon, migrations.RunPython.noop),
    ]
