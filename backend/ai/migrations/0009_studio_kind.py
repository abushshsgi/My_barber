# Generated manually for studio kind on AiGenerationUsage

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0008_morphaisettings"),
    ]

    operations = [
        migrations.AlterField(
            model_name="aigenerationusage",
            name="kind",
            field=models.CharField(
                choices=[
                    ("tryon", "Try-on"),
                    ("analyze", "Style analyze"),
                    ("face_check", "Face check"),
                    ("studio", "Studio edit"),
                ],
                db_index=True,
                max_length=16,
            ),
        ),
    ]
