"""Yangi userlar uchun default morph_free_tryon_eligible=True. Mavjud userlar o'zgarmaydi."""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0025_referralattribution_credit_granted"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="morph_free_tryon_eligible",
            field=models.BooleanField(default=True),
        ),
    ]