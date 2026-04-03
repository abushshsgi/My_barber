from django.contrib import admin

from .models import BarberWorkingHours, Salon, SalonHours, SalonImage, SalonMembership, Service


class SalonHoursInline(admin.TabularInline):
    model = SalonHours
    extra = 0


class SalonImageInline(admin.TabularInline):
    model = SalonImage
    extra = 1


class ServiceInline(admin.TabularInline):
    model = Service
    extra = 0
    fields = ("name", "price", "duration_minutes", "is_active", "barber")
    autocomplete_fields = ("barber",)


@admin.register(Salon)
class SalonAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "premium", "is_published", "created_at")
    list_filter = ("premium", "is_published", "created_at", "updated_at")
    search_fields = ("name", "slug", "owner__email", "address")
    autocomplete_fields = ("owner",)
    date_hierarchy = "created_at"
    inlines = [ServiceInline, SalonHoursInline, SalonImageInline]
    list_per_page = 50


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "salon", "barber", "price", "duration_minutes")
    list_filter = ("is_active", "salon")
    search_fields = ("name", "salon__name", "barber__email")
    autocomplete_fields = ("salon", "barber")
    list_per_page = 50


@admin.register(SalonMembership)
class SalonMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "salon", "role", "invite_state")
    list_filter = ("role", "invite_state", "owner_approved")
    search_fields = ("user__email", "user__full_name", "salon__name")
    autocomplete_fields = ("user", "salon")
    list_per_page = 50


@admin.register(BarberWorkingHours)
class BarberWorkingHoursAdmin(admin.ModelAdmin):
    list_display = ("membership", "weekday", "open_time", "close_time", "is_day_off")
    list_filter = ("weekday", "is_day_off")
    autocomplete_fields = ("membership",)
    list_per_page = 50
