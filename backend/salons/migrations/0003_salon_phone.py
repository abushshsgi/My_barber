# Generated manually for Salon.phone

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("salons", "0002_salon_name_unique_ci_trim"),
    ]

    operations = [
        migrations.AddField(
            model_name="salon",
            name="phone",
            field=models.CharField(blank=True, max_length=32),
        ),
    ]
