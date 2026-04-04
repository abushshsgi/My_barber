from django.contrib import admin

from .models import Barber, BarberProfile, BarberService, BarberWorkPhoto


class BarberWorkPhotoInline(admin.TabularInline):
    model = BarberWorkPhoto
    extra = 0


class BarberServiceInline(admin.TabularInline):
    model = BarberService
    extra = 0


@admin.register(Barber)
class BarberAdmin(admin.ModelAdmin):
    list_display = ("email", "full_name", "is_active", "date_joined")
    list_filter = ("is_active", "region")
    search_fields = ("email", "full_name", "phone")
    ordering = ("-date_joined",)


@admin.register(BarberProfile)
class BarberProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "location_text", "created_at")
    search_fields = ("barber__email", "barber__full_name", "location_text")
    autocomplete_fields = ("barber",)
    inlines = [BarberServiceInline, BarberWorkPhotoInline]


@admin.register(BarberService)
class BarberServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "name", "price", "duration_minutes", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "profile__barber__email", "profile__barber__full_name")
    autocomplete_fields = ("profile",)


@admin.register(BarberWorkPhoto)
class BarberWorkPhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "profile", "sort_order", "created_at")
    autocomplete_fields = ("profile",)

