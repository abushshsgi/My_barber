from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("hair_advisor", "0003_aggregation_jobs"),
    ]

    operations = [
        migrations.AddField(
            model_name="hairscan",
            name="recognition_meta",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]