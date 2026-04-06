# Generated manually for Barber.work_mode

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0004_barberprofile_barber_alter_barberprofile_user"),
    ]

    operations = [
        migrations.AddField(
            model_name="barber",
            name="work_mode",
            field=models.CharField(
                choices=[("salon", "Salon"), ("independent", "Independent")],
                db_index=True,
                default="salon",
                max_length=16,
            ),
        ),
    ]
