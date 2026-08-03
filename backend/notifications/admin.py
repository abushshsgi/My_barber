from django.contrib import admin

from .models import BarberPushToken, Notification, UserPushToken


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "barber", "type", "title", "read_at", "created_at")
    list_filter = ("type", "read_at", "created_at")
    search_fields = ("user__email", "barber__email", "barber__full_name", "title", "body", "type")
    autocomplete_fields = ("user", "barber")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
    list_per_page = 50


@admin.register(BarberPushToken)
class BarberPushTokenAdmin(admin.ModelAdmin):
    list_display = ("barber", "platform", "token", "updated_at")
    search_fields = ("token", "barber__email", "barber__full_name")
    autocomplete_fields = ("barber",)


@admin.register(UserPushToken)
class UserPushTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "platform", "token", "updated_at")
    search_fields = ("token", "user__email", "user__phone", "user__full_name")
    autocomplete_fields = ("user",)
