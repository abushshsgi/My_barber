from django.contrib import admin

from media_store.models import StoredMedia


@admin.register(StoredMedia)
class StoredMediaAdmin(admin.ModelAdmin):
    list_display = ("name", "content_type", "size", "updated_at")
    search_fields = ("name",)
    readonly_fields = ("name", "content_type", "size", "created_at", "updated_at")
