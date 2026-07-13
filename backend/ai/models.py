from decimal import Decimal

from django.conf import settings
from django.db import models

HISTORY_MAX_PER_USER = 6


class Hairstyle(models.Model):
    class Audience(models.TextChoices):
        MEN = "men", "Men"
        WOMEN = "women", "Women"

    class Category(models.TextChoices):
        BARBER = "barber", "Barber"
        BEAUTY = "beauty", "Beauty"

    class HairLength(models.TextChoices):
        SHORT = "short", "Short"
        MEDIUM = "medium", "Medium"
        LONG = "long", "Long"

    style_id = models.CharField(max_length=64, primary_key=True)
    slug = models.CharField(max_length=64, db_index=True)
    audience = models.CharField(max_length=8, choices=Audience.choices, db_index=True)
    category = models.CharField(max_length=16, choices=Category.choices)
    title = models.CharField(max_length=120)
    title_uz = models.CharField(max_length=120)
    face_shapes = models.JSONField(default=list)
    hair_length = models.CharField(max_length=8, choices=HairLength.choices)
    image_path = models.CharField(max_length=255)
    description_uz = models.TextField(blank=True, default="")
    tags = models.JSONField(default=list)
    age_groups = models.JSONField(
        default=list,
        help_text="Mos yosh guruhlari: kids, teen, young, adult, mature",
    )
    is_published = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["audience", "sort_order", "style_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["audience", "slug"],
                name="uniq_hairstyle_audience_slug",
            ),
        ]

    def __str__(self) -> str:
        return self.style_id


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


class AiGenerationUsage(models.Model):
    """Morph AI (AI Style / try-on) — har bir generatsiya/token/xarajat yozuvi."""

    class Kind(models.TextChoices):
        TRYON = "tryon", "Try-on"
        ANALYZE = "analyze", "Style analyze"
        FACE_CHECK = "face_check", "Face check"

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_generations",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices, db_index=True)
    status = models.CharField(max_length=16, choices=Status.choices, db_index=True)
    prompt = models.TextField(blank=True, default="")
    style_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    style_title = models.CharField(max_length=120, blank=True, default="")
    model = models.CharField(max_length=80, blank=True, default="")
    provider = models.CharField(max_length=32, blank=True, default="")
    job_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    prompt_tokens = models.PositiveIntegerField(default=0)
    candidates_tokens = models.PositiveIntegerField(default=0)
    thoughts_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=12, decimal_places=6, default=Decimal("0"))
    tokens_estimated = models.BooleanField(default=False)
    latency_ms = models.PositiveIntegerField(default=0)
    error_detail = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["kind", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"AiGeneration({self.kind}, {self.status}, user={self.user_id})"
