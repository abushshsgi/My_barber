from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0026_care_user_product"),
    ]

    operations = [
        migrations.AddField(
            model_name="careproduct",
            name="scalp_types",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="careproduct",
            name="concerns",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="haircareprofile",
            name="scalp",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="haircareprofile",
            name="concerns",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
