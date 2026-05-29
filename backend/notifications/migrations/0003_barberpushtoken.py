from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0010_barber_business_models"),
        ("notifications", "0002_notification_barber_alter_notification_user"),
    ]

    operations = [
        migrations.CreateModel(
            name="BarberPushToken",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(db_index=True, max_length=255, unique=True)),
                ("platform", models.CharField(blank=True, max_length=16)),
                ("device_name", models.CharField(blank=True, max_length=128)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "barber",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="push_tokens",
                        to="barbers.barber",
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
    ]
