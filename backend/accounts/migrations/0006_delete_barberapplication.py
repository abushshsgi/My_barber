from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_barber_data_from_users"),
    ]

    operations = [
        migrations.DeleteModel(
            name="BarberApplication",
        ),
    ]
