from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ai", "0022_morphaiuserprefs"),
    ]

    operations = [
        migrations.AlterField(
            model_name="aigenerationusage",
            name="kind",
            field=models.CharField(
                choices=[
                    ("tryon", "Try-on"),
                    ("analyze", "Style analyze"),
                    ("face_check", "Face check"),
                    ("studio", "Studio edit"),
                    ("ingredient", "Ingredient scan"),
                    ("chat", "Morf AI chat"),
                    ("voice_stt", "Morf AI voice STT"),
                    ("voice_tts", "Morf AI voice TTS"),
                ],
                db_index=True,
                max_length=16,
            ),
        ),
    ]
