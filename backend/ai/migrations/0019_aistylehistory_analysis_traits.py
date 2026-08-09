from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0018_ingredient_kind"),
    ]

    operations = [
        migrations.AddField(
            model_name="aistylehistoryentry",
            name="hair_color_key",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="aistylehistoryentry",
            name="hair_texture_key",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
        migrations.AddField(
            model_name="aistylehistoryentry",
            name="beard_key",
            field=models.CharField(blank=True, default="", max_length=16),
        ),
    ]
