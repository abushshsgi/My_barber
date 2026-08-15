from django.contrib import admin

from .models import AiGenerationUsage, AiStyleHistoryEntry, Hairstyle, MorphAiLookShare, MorphAiSettings


@admin.register(Hairstyle)
class HairstyleAdmin(admin.ModelAdmin):
    list_display = (
        "style_id",
        "title_uz",
        "audience",
        "category",
        "hair_length",
        "is_published",
        "sort_order",
    )
    list_filter = ("audience", "category", "hair_length", "is_published")
    search_fields = ("style_id", "slug", "title", "title_uz")
    ordering = ("audience", "sort_order", "style_id")


@admin.register(AiStyleHistoryEntry)
class AiStyleHistoryEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "source", "face_shape_key", "created_at")
    list_filter = ("source",)
    search_fields = ("user__phone", "user__email")
    raw_id_fields = ("user",)


@admin.register(AiGenerationUsage)
class AiGenerationUsageAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "kind",
        "status",
        "user",
        "style_id",
        "total_tokens",
        "cost_usd",
        "model",
        "created_at",
    )
    list_filter = ("kind", "status", "provider", "tokens_estimated")
    search_fields = ("user__phone", "user__email", "style_id", "job_id", "prompt")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at",)


@admin.register(MorphAiLookShare)
class MorphAiLookShareAdmin(admin.ModelAdmin):
    list_display = ("id", "style_id", "title", "created_by", "view_count", "created_at")
    search_fields = ("style_id", "title", "created_by__phone", "created_by__email")
    raw_id_fields = ("created_by",)
    readonly_fields = ("created_at", "view_count", "last_viewed_at")


@admin.register(MorphAiSettings)
class MorphAiSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "tryon_enabled",
        "analyze_enabled",
        "referral_generation_enabled",
        "daily_tryon_limit_per_user",
        "daily_budget_usd",
        "budget_enforce",
        "ab_enabled",
        "updated_at",
    )
