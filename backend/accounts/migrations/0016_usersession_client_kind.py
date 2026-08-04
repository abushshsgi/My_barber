from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0015_skinprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="usersession",
            name="client_kind",
            field=models.CharField(blank=True, db_index=True, default="web", max_length=16),
        ),
        migrations.AddField(
            model_name="usersession",
            name="app_version",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
