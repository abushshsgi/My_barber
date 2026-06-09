from django.contrib import admin

from .models import AiStyleHistoryEntry


@admin.register(AiStyleHistoryEntry)
class AiStyleHistoryEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "source", "face_shape_key", "created_at")
    list_filter = ("source",)
    search_fields = ("user__phone", "user__email")
    raw_id_fields = ("user",)
