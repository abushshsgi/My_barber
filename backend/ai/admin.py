from django.contrib import admin

from .models import AiStyleHistoryEntry, Hairstyle


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
