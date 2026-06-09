from django.conf import settings
from django.db import models

HISTORY_MAX_PER_USER = 6


class AiStyleHistoryEntry(models.Model):
    class Source(models.TextChoices):
        CAMERA_SCAN = "camera_scan", "Camera scan"
        GALLERY = "gallery", "Gallery"
        AI_ANALYSIS = "ai_analysis", "AI analysis"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_style_history",
    )
    photo = models.ImageField(upload_to="ai-style/history/%Y/%m/", blank=True, null=True)
    face_shape_key = models.CharField(max_length=16, blank=True, default="")
    hair_type_key = models.CharField(max_length=16, blank=True, default="")
    source = models.CharField(max_length=16, choices=Source.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"AiStyleHistory({self.user_id}, {self.source}, {self.created_at})"
