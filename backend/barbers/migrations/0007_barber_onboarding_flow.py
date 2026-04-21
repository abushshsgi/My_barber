from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0006_barberworkinghours_breaks"),
    ]

    operations = [
        migrations.AddField(
            model_name="barber",
            name="onboarding_flow",
            field=models.CharField(
                blank=True,
                choices=[
                    ("owner", "Owner"),
                    ("employee", "Employee"),
                    ("mybarber", "MyBarber"),
                    ("independent", "Independent"),
                ],
                db_index=True,
                default="",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="barber",
            name="onboarding_completed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]

