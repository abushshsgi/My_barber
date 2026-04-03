# Generated manually for UzRegion viloyat maydoni

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="region",
            field=models.CharField(
                blank=True,
                choices=[
                    ("ANDIJON", "Andijon viloyati"),
                    ("BUXORO", "Buxoro viloyati"),
                    ("FARGONA", "Farg'ona viloyati"),
                    ("JIZZAX", "Jizzax viloyati"),
                    ("QASHQADARYO", "Qashqadaryo viloyati"),
                    ("NAVOIY", "Navoiy viloyati"),
                    ("NAMANGAN", "Namangan viloyati"),
                    ("SAMARQAND", "Samarqand viloyati"),
                    ("SURXONDARYO", "Surxondaryo viloyati"),
                    ("SIRDARYO", "Sirdaryo viloyati"),
                    ("TOSHKENT_V", "Toshkent viloyati"),
                    ("XORAZM", "Xorazm viloyati"),
                ],
                db_index=True,
                default="",
                max_length=32,
            ),
        ),
    ]
