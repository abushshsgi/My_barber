from django.db import migrations, models


def mark_existing_profiles_complete(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(full_name__gt="", region__gt="").update(onboarding_completed=True)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0007_alter_user_region"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="birth_year",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="latitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="longitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="onboarding_completed",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.RunPython(mark_existing_profiles_complete, migrations.RunPython.noop),
    ]
