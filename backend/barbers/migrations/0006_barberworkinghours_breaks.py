from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0005_barber_work_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="barberworkinghours",
            name="breaks",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
