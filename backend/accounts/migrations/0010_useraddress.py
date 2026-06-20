import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0009_split_user_names"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserAddress",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "label",
                    models.CharField(
                        choices=[("home", "Uy"), ("work", "Ofis"), ("other", "Boshqa")],
                        default="home",
                        max_length=16,
                    ),
                ),
                ("custom_label", models.CharField(blank=True, default="", max_length=64)),
                ("address_line", models.CharField(max_length=512)),
                ("region", models.CharField(db_index=True, max_length=32)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("is_default", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="addresses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-is_default", "-updated_at"],
            },
        ),
    ]
