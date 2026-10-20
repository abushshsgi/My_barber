from django.db import migrations, models


class Migration(migrations.Migration):
    """Bir martalik bepul try-on: mavjud userlar — eligible=False, yangilar — True."""

    dependencies = [
        ("accounts", "0020_clear_user_profile_locations"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="morph_free_tryon_eligible",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="user",
            name="morph_free_tryon_eligible",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="user",
            name="morph_free_tryon_used_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
