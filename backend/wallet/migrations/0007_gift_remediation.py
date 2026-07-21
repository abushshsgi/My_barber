# Generated manually for gift remediation (hold / refund / admin note)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("wallet", "0006_manualcarddeposit_receipt_image"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gifttransfer",
            name="status",
            field=models.CharField(
                choices=[
                    ("completed", "Completed"),
                    ("failed", "Failed"),
                    ("on_hold", "On hold"),
                    ("refunded", "Refunded"),
                ],
                db_index=True,
                default="completed",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="gifttransfer",
            name="held_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name="gifttransfer",
            name="admin_note",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="gifttransfer",
            name="remediation_log",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="gifttransfer",
            name="held_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gifttransfer",
            name="held_by_admin_id",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gifttransfer",
            name="refunded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="gifttransfer",
            name="refunded_by_admin_id",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
