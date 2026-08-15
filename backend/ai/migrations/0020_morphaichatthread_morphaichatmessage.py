# Generated manually for MorphAiChatThread / MorphAiChatMessage

from decimal import Decimal

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ai", "0019_aistylehistory_analysis_traits"),
    ]

    operations = [
        migrations.CreateModel(
            name="MorphAiChatThread",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("client_id", models.CharField(db_index=True, max_length=64)),
                ("title", models.CharField(blank=True, default="", max_length=200)),
                ("preview", models.CharField(blank=True, default="", max_length=280)),
                ("context", models.JSONField(blank=True, default=dict)),
                ("message_count", models.PositiveIntegerField(default=0)),
                ("total_prompt_tokens", models.PositiveIntegerField(default=0)),
                ("total_candidates_tokens", models.PositiveIntegerField(default=0)),
                ("total_tokens", models.PositiveIntegerField(default=0)),
                (
                    "total_cost_usd",
                    models.DecimalField(decimal_places=6, default=Decimal("0"), max_digits=12),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="morph_chat_threads",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="MorphAiChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("client_id", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                (
                    "role",
                    models.CharField(
                        choices=[("user", "User"), ("assistant", "Assistant")],
                        db_index=True,
                        max_length=16,
                    ),
                ),
                ("content", models.TextField()),
                ("context", models.JSONField(blank=True, default=dict)),
                ("prompt_tokens", models.PositiveIntegerField(default=0)),
                ("candidates_tokens", models.PositiveIntegerField(default=0)),
                ("thoughts_tokens", models.PositiveIntegerField(default=0)),
                ("total_tokens", models.PositiveIntegerField(default=0)),
                (
                    "cost_usd",
                    models.DecimalField(decimal_places=6, default=Decimal("0"), max_digits=12),
                ),
                ("model", models.CharField(blank=True, default="", max_length=80)),
                ("provider", models.CharField(blank=True, default="", max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "thread",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="ai.morphaichatthread",
                    ),
                ),
                (
                    "usage",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="chat_messages",
                        to="ai.aigenerationusage",
                    ),
                ),
            ],
            options={
                "ordering": ["created_at", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="morphaichatthread",
            index=models.Index(fields=["user", "-updated_at"], name="ai_morphchat_user_upd_idx"),
        ),
        migrations.AddConstraint(
            model_name="morphaichatthread",
            constraint=models.UniqueConstraint(
                fields=("user", "client_id"),
                name="uniq_morph_chat_thread_user_client",
            ),
        ),
        migrations.AddIndex(
            model_name="morphaichatmessage",
            index=models.Index(fields=["thread", "created_at"], name="ai_morphchat_msg_thread_idx"),
        ),
    ]
