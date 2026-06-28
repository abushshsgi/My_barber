from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("salons", "0012_barberscheduleexception"),
    ]

    operations = [
        migrations.AddField(
            model_name="amenity",
            name="scope",
            field=models.CharField(
                choices=[
                    ("all", "All venues"),
                    ("solo_studio", "Solo studio / brand"),
                    ("salon", "Multi-staff salon"),
                ],
                db_index=True,
                default="all",
                max_length=16,
            ),
        ),
    ]
