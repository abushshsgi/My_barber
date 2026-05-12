from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("salons", "0006_favoritesalon"),
    ]

    operations = [
        migrations.AddField(
            model_name="barberworkinghours",
            name="breaks",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
