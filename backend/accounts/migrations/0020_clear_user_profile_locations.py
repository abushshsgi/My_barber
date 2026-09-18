from django.db import migrations


def clear_user_profile_locations(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.exclude(latitude=None, longitude=None, region="").update(
        latitude=None,
        longitude=None,
        region="",
    )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0019_user_gender"),
    ]

    operations = [
        migrations.RunPython(clear_user_profile_locations, noop),
    ]
