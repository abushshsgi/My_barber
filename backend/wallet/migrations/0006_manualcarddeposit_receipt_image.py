# Generated manually for ManualCardDeposit.receipt_image

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("wallet", "0005_manual_card_deposit"),
    ]

    operations = [
        migrations.AddField(
            model_name="manualcarddeposit",
            name="receipt_image",
            field=models.ImageField(
                blank=True,
                help_text="Foydalanuvchi yuklagan to'lov cheki (rasm).",
                null=True,
                upload_to="wallet/card_receipts/%Y/%m/",
            ),
        ),
    ]
