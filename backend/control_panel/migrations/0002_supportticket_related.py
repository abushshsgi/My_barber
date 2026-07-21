from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("control_panel", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="supportticket",
            name="related_type",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="supportticket",
            name="related_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
    ]
