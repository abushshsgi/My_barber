from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0021_morphaisettings_referral_generation_enabled"),
    ]

    operations = [
        migrations.CreateModel(
            name="MorphAiUserPrefs",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "privacy_local_only",
                    models.BooleanField(
                        default=False,
                        help_text="True bo'lsa chat tarixi serverga yozilmaydi va Gemini ga yuborilmaydi.",
                    ),
                ),
                ("save_chat_history", models.BooleanField(default=True)),
                (
                    "persist_looks",
                    models.BooleanField(
                        default=True,
                        help_text="False bo'lsa try-on/studio/selfie tarixi serverga yozilmaydi.",
                    ),
                ),
                ("limit_notify", models.BooleanField(default=True)),
                ("use_tryon_context", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="morph_ai_prefs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Morph AI user prefs",
                "verbose_name_plural": "Morph AI user prefs",
            },
        ),
    ]
