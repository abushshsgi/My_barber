from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("control_panel", "0002_supportticket_related"),
    ]

    operations = [
        migrations.AlterField(
            model_name="financetransaction",
            name="type",
            field=models.CharField(
                choices=[
                    ("booking", "Booking"),
                    ("commission", "Commission"),
                    ("payout", "Payout"),
                    ("refund", "Refund"),
                    ("qr_pay", "QR payment"),
                ],
                db_index=True,
                max_length=24,
            ),
        ),
    ]
