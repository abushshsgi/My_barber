from django.contrib import admin

from .models import (
    AiGenerationUsage,
    AiStyleHistoryEntry,
    CareProduct,
    HairCareProfile,
    Hairstyle,
    IngredientScanEntry,
    MorphAiLookShare,
    MorphAiSettings,
    MorphAiUserPrefs,
)


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


@admin.register(MorphAiUserPrefs)
class MorphAiUserPrefsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "privacy_local_only",
        "save_chat_history",
        "persist_looks",
        "limit_notify",
        "updated_at",
    )
    list_filter = ("privacy_local_only", "save_chat_history", "persist_looks", "limit_notify")
    search_fields = ("user__phone", "user__email")
    raw_id_fields = ("user",)
    readonly_fields = ("updated_at",)


@admin.register(CareProduct)
class CareProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "brand", "category", "is_published", "sort_order", "updated_at")
    list_filter = ("category", "is_published")
    search_fields = ("name", "brand", "slug", "ingredients_text")
    prepopulated_fields = {"slug": ("brand", "name")}
    raw_id_fields = ("created_by",)


@admin.register(HairCareProfile)
class HairCareProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "condition", "texture", "color_status", "scalp", "completed_at")
    list_filter = ("condition", "texture", "color_status", "scalp")
    search_fields = ("user__phone", "user__email")
    raw_id_fields = ("user",)


@admin.register(IngredientScanEntry)
class IngredientScanEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "verdict", "safety_score", "extracted_name", "created_at")
    list_filter = ("verdict",)
    search_fields = ("user__phone", "user__email", "extracted_name")
    raw_id_fields = ("user", "matched_product")
    readonly_fields = ("created_at",)
