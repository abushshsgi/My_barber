import uuid

from django.conf import settings
from django.db import models

from barbers.models import Barber


class Conversation(models.Model):
    """
    Text-only chat: faqat barber ↔ mijoz.
    Public ID (UUID) URL/WebSocket uchun ishlatiladi (enumeration yo'q).
    """

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_conversations"
    )
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="chat_conversations")
    last_message_text = models.CharField(max_length=1000, blank=True, default="")
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        unique_together = [["user", "barber"]]
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"Conversation({self.public_id})"


class Message(models.Model):
    class SenderKind(models.TextChoices):
        USER = "USER", "User"
        BARBER = "BARBER", "Barber"

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender_kind = models.CharField(max_length=10, choices=SenderKind.choices, db_index=True)
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="chat_messages",
        null=True,
        blank=True,
    )
    sender_barber = models.ForeignKey(
        Barber,
        on_delete=models.SET_NULL,
        related_name="chat_messages",
        null=True,
        blank=True,
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self) -> str:
        return f"Message({self.id}, {self.sender_kind})"

