from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("wallet", "0011_wallet_freeze"),
    ]

    operations = [
        migrations.AddField(
            model_name="manualcarddeposit",
            name="client_channel",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="web yoki mobile — to'lov qaysi klientdan kelgani.",
                max_length=16,
            ),
        ),
    ]
