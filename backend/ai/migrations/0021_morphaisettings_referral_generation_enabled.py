from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0020_morphaichatthread_morphaichatmessage"),
    ]

    operations = [
        migrations.AddField(
            model_name="morphaisettings",
            name="referral_generation_enabled",
            field=models.BooleanField(
                default=True,
                help_text="True bo'lsa 1 referal = 1 Morph AI generatsiya krediti ishlaydi va UI da ko'rinadi.",
            ),
        ),
    ]
