from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("bookings", "0012_booking_notes"),
    ]

    operations = [
        migrations.AddField(
            model_name="bookingcompletion",
            name="finished_early",
            field=models.BooleanField(
                default=False,
                help_text="Rejadan oldin tugatilgan (barber belgilagan yoki avtomatik).",
            ),
        ),
        migrations.CreateModel(
            name="ClientImpression",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("polite", "Polite"),
                            ("great", "Great session"),
                            ("punctual", "Punctual"),
                            ("friendly", "Friendly"),
                            ("vip", "VIP client"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "barber",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_impressions_given",
                        to="barbers.barber",
                    ),
                ),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_impressions",
                        to="bookings.booking",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_impressions_received",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [models.Index(fields=["customer", "kind"], name="bookings_cl_custome_6f0b0d_idx")],
            },
        ),
        migrations.AddConstraint(
            model_name="clientimpression",
            constraint=models.UniqueConstraint(
                fields=("booking", "barber", "kind"),
                name="uniq_client_impression_per_booking_barber_kind",
            ),
        ),
    ]
