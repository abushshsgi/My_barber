from django.db import migrations, models


def seed_platform_settings(apps, schema_editor):
    PlatformSettings = apps.get_model("control_panel", "PlatformSettings")
    PlatformSettings.objects.get_or_create(
        pk=1,
        defaults={"maintenance_banner_enabled": True},
    )


class Migration(migrations.Migration):
    dependencies = [
        ("control_panel", "0005_analytics_foundation"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "maintenance_banner_enabled",
                    models.BooleanField(
                        default=True,
                        help_text="True bo‘lsa barcha sahifalar tepasida texnik ishlar banneri chiqadi.",
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Platform settings",
                "verbose_name_plural": "Platform settings",
            },
        ),
        migrations.RunPython(seed_platform_settings, migrations.RunPython.noop),
    ]
