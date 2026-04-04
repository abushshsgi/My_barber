# Generated manually — sartarosh alohida jadval

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0002_barberworkinghours"),
    ]

    operations = [
        migrations.CreateModel(
            name="Barber",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(db_index=True, max_length=254, unique=True)),
                ("username", models.CharField(max_length=150, unique=True)),
                ("password", models.CharField(max_length=128)),
                ("full_name", models.CharField(blank=True, max_length=255)),
                ("phone", models.CharField(blank=True, max_length=32, null=True, unique=True)),
                ("avatar", models.ImageField(blank=True, null=True, upload_to="barbers/avatars/")),
                (
                    "region",
                    models.CharField(
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
                ("is_active", models.BooleanField(default=True)),
                ("date_joined", models.DateTimeField(auto_now_add=True)),
                ("last_login", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "ordering": ["-date_joined"],
            },
        ),
    ]
