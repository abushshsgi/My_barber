from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("barbers", "0018_barberscheduleexception"),
    ]

    operations = [
        migrations.AddField(
            model_name="barberprofile",
            name="payment_methods",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Mustaqil usta to'lov usullari: cash, card, payme, ...",
            ),
        ),
        migrations.AddField(
            model_name="barberprofile",
            name="work_location_type",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Mustaqil usta: studio | home | mobile",
                max_length=16,
            ),
        ),
    ]
