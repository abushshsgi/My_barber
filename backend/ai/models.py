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
