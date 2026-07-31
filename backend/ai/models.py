import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

HISTORY_MAX_PER_USER = 6
GENERATION_HISTORY_MAX_PER_USER = 60


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
        STUDIO = "studio", "Studio edit"

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


class MorphAiSettings(models.Model):
    """Singleton — Morph AI limit, byudjet, prompt va A/B sozlamalari."""

    daily_tryon_limit_per_user = models.PositiveIntegerField(
        default=20,
        help_text="0 = cheklov yo'q. User uchun kunlik try-on limiti.",
    )
    daily_analyze_limit_per_user = models.PositiveIntegerField(
        default=30,
        help_text="0 = cheklov yo'q.",
    )
    daily_budget_usd = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("50"),
        help_text="0 = byudjet cheklovi yo'q. Kunlik soft-cap (USD).",
    )
    budget_enforce = models.BooleanField(
        default=False,
        help_text="True bo'lsa byudjet yetganda yangi generatsiya to'xtatiladi.",
    )
    alert_success_rate_below = models.PositiveSmallIntegerField(
        default=80,
        help_text="Success rate shu foizdan past bo'lsa ogohlantirish.",
    )
    tryon_enabled = models.BooleanField(default=True)
    analyze_enabled = models.BooleanField(default=True)
    custom_tryon_prompt = models.TextField(
        blank=True,
        default="",
        help_text="Bo'sh bo'lsa default prompt ishlatiladi.",
    )
    custom_tryon_prompt_b = models.TextField(
        blank=True,
        default="",
        help_text="A/B variant B prompti.",
    )
    ab_enabled = models.BooleanField(default=False)
    ab_traffic_percent_b = models.PositiveSmallIntegerField(
        default=50,
        help_text="0–100. Variant B ga yo'naltiriladigan so'rovlar foizi.",
    )
    preferred_model = models.CharField(
        max_length=80,
        blank=True,
        default="",
        help_text="Bo'sh = env / Django settings modeli.",
    )
    gallery_public = models.BooleanField(
        default=False,
        help_text="Admin galleryda faqat opt-in tarix (hozir history yozuvlari).",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Morph AI settings"
        verbose_name_plural = "Morph AI settings"

    def __str__(self) -> str:
        return "Morph AI settings"

    @classmethod
    def load(cls) -> "MorphAiSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class MorphAiLookShare(models.Model):
    """Public shareable Morf AI before/after look (viral link)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="morph_look_shares",
    )
    style_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    title = models.CharField(max_length=160, blank=True, default="")
    before_photo = models.ImageField(
        upload_to="ai-style/shares/%Y/%m/",
        blank=True,
        null=True,
    )
    after_photo = models.ImageField(upload_to="ai-style/shares/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    view_count = models.PositiveIntegerField(default=0)
    last_viewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"MorphAiLookShare({self.id}, {self.style_id})"


class MorphAiGenerationEntry(models.Model):
    """User try-on / studio result history (before + after) — media via DB storage."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="morph_generations",
    )
    style_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    title = models.CharField(max_length=160, blank=True, default="")
    persona_id = models.CharField(max_length=64, blank=True, default="")
    before_photo = models.ImageField(
        upload_to="ai-style/generations/%Y/%m/",
        blank=True,
        null=True,
    )
    after_photo = models.ImageField(upload_to="ai-style/generations/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"MorphAiGeneration({self.user_id}, {self.style_id}, {self.created_at})"
