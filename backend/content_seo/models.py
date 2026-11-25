import uuid

from django.db import models


class SeoArticle(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    class Locale(models.TextChoices):
        UZ = "uz", "Uzbek"
        RU = "ru", "Russian"
        EN = "en", "English"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=120)
    locale = models.CharField(max_length=8, choices=Locale.choices, default=Locale.UZ)
    category = models.CharField(max_length=64, blank=True, default="")
    title = models.CharField(max_length=200)
    seo_title = models.CharField(max_length=200, blank=True, default="")
    meta_description = models.CharField(max_length=320, blank=True, default="")
    excerpt = models.TextField(blank=True, default="")
    content = models.TextField(blank=True, default="")
    cover_image_path = models.CharField(max_length=255, blank=True, default="")
    author = models.CharField(max_length=120, blank=True, default="MySaloon")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    related_morf_service = models.CharField(max_length=64, blank=True, default="")
    related_style_ids = models.JSONField(default=list, blank=True)
    conversion_cta_href = models.CharField(max_length=255, blank=True, default="/ai-style")
    conversion_cta_label = models.CharField(max_length=120, blank=True, default="Boshlash")
    conversion_event = models.CharField(max_length=64, blank=True, default="blog_article_view")
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["slug", "locale"], name="uniq_seo_article_slug_locale"),
        ]

    def __str__(self) -> str:
        return f"{self.slug} ({self.locale})"