from django.contrib import admin

from .models import (
    Barber,
    BarberExpense,
    BarberGoal,
    BarberInventoryItem,
    BarberInventoryMovement,
    BarberProfile,
    BarberPromo,
    BarberService,
    BarberSetting,
    BarberSupportTicket,
    BarberWorkPhoto,
)


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


@admin.register(BarberInventoryItem)
class BarberInventoryItemAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "name", "category", "stock", "min_stock", "price")
    list_filter = ("category",)
    search_fields = ("name", "barber__email", "barber__full_name")
    autocomplete_fields = ("barber",)


@admin.register(BarberInventoryMovement)
class BarberInventoryMovementAdmin(admin.ModelAdmin):
    list_display = ("id", "item", "delta", "note", "created_at")
    search_fields = ("item__name", "item__barber__email")
    autocomplete_fields = ("item",)


@admin.register(BarberExpense)
class BarberExpenseAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "category", "description", "amount", "spent_on")
    list_filter = ("category", "spent_on")
    search_fields = ("description", "barber__email")
    autocomplete_fields = ("barber",)


@admin.register(BarberGoal)
class BarberGoalAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "title", "target", "current", "done", "deadline")
    list_filter = ("done",)
    search_fields = ("title", "barber__email")
    autocomplete_fields = ("barber",)


@admin.register(BarberPromo)
class BarberPromoAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "code", "discount_pct", "uses", "max_uses", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "barber__email")
    autocomplete_fields = ("barber",)


@admin.register(BarberSetting)
class BarberSettingAdmin(admin.ModelAdmin):
    list_display = ("barber", "notifications_email", "notifications_push", "notifications_sms", "auto_accept")
    autocomplete_fields = ("barber",)


@admin.register(BarberSupportTicket)
class BarberSupportTicketAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "subject", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("subject", "message", "barber__email")
    autocomplete_fields = ("barber",)

