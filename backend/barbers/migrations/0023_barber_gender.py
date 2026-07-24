from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0022_barber_business_kind"),
    ]

    operations = [
        migrations.AddField(
            model_name="barber",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[("male", "Erkak"), ("female", "Ayol")],
                db_index=True,
                default="",
                help_text="Erkak mijozlarga erkak ustalar; ayollarga ayol ustalar.",
                max_length=16,
            ),
        ),
    ]
