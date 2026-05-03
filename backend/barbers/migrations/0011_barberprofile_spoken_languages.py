from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("barbers", "0010_barber_business_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="barberprofile",
            name="spoken_languages",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
