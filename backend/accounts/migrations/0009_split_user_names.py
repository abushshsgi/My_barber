from django.db import migrations


def split_full_names(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    for user in User.objects.filter(first_name="", last_name="").exclude(full_name=""):
        parts = (user.full_name or "").strip().split(None, 1)
        if not parts:
            continue
        user.first_name = parts[0]
        user.last_name = parts[1] if len(parts) > 1 else ""
        user.save(update_fields=["first_name", "last_name"])


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0008_user_profile_onboarding"),
    ]

    operations = [
        migrations.RunPython(split_full_names, migrations.RunPython.noop),
    ]
