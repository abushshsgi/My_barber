# Generated manually for MorphAiLookShare view counters

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0016_seed_curly_batch"),
    ]

    operations = [
        migrations.AddField(
            model_name="morphailookshare",
            name="view_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="morphailookshare",
            name="last_viewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
