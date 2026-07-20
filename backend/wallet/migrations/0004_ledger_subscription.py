# Generated manually for subscription ledger entry type

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("wallet", "0003_gift_design_fee"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ledgerentry",
            name="entry_type",
            field=models.CharField(
                choices=[
                    ("topup", "Top-up"),
                    ("gift_out", "Gift sent"),
                    ("gift_in", "Gift received"),
                    ("gift_design_fee", "Gift card design fee"),
                    ("booking_pay", "Booking payment"),
                    ("subscription", "Subscription"),
                    ("refund", "Refund"),
                    ("adjustment", "Adjustment"),
                ],
                db_index=True,
                max_length=32,
            ),
        ),
    ]
