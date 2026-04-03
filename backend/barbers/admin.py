from django.contrib import admin

from .models import BarberProfile, BarberService, BarberWorkPhoto


class BarberWorkPhotoInline(admin.TabularInline):
    model = BarberWorkPhoto
    extra = 0


class BarberServiceInline(admin.TabularInline):
    model = BarberService
    extra = 0


@admin.register(BarberProfile)
class BarberProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "location_text", "created_at")
    search_fields = ("user__email", "user__full_name", "location_text")
    autocomplete_fields = ("user",)
    inlines = [BarberServiceInline, BarberWorkPhotoInline]


@admin.register(BarberService)
class BarberServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "name", "price", "duration_minutes", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "profile__user__email", "profile__user__full_name")
    autocomplete_fields = ("profile",)


@admin.register(BarberWorkPhoto)
class BarberWorkPhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "sort_order", "created_at")
    autocomplete_fields = ("profile",)

