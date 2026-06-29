import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0010_booking_order_number_checkin_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="review",
            name="salon_rating",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="review",
            name="salon_text",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.CreateModel(
            name="ReviewDimensionScore",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "target",
                    models.CharField(
                        choices=[("barber", "Barber"), ("salon", "Salon")],
                        max_length=10,
                    ),
                ),
                ("dimension", models.CharField(max_length=32)),
                ("score", models.PositiveSmallIntegerField()),
                (
                    "review",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dimensions",
                        to="bookings.review",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["target", "dimension"],
                        name="bookings_re_target_2f0a3e_idx",
                    )
                ],
                "unique_together": {("review", "target", "dimension")},
            },
        ),
    ]
