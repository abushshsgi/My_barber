from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0012_family_sessions_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="google_sub",
            field=models.CharField(
                blank=True, db_index=True, max_length=64, null=True, unique=True
            ),
        ),
    ]
