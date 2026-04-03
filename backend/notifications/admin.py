from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "title", "read_at", "created_at")
    list_filter = ("type", "read_at", "created_at")
    search_fields = ("user__email", "title", "body", "type")
    autocomplete_fields = ("user",)
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
    list_per_page = 50
