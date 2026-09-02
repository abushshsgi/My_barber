# Generated manually — user.gender

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0018_user_morph_chat_free_tokens"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[("male", "Male"), ("female", "Female")],
                db_index=True,
                default="",
                max_length=16,
            ),
        ),
    ]
