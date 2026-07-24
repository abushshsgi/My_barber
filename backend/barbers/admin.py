from django.contrib import admin

from .models import (
    Barber,
    BarberCustomerInvite,
    BarberCustomerOutreach,
    BarberExpense,
    BarberGoal,
    BarberInventoryItem,
    BarberInventoryMovement,
    BarberProfile,
    BarberPromo,
    BarberService,
    BarberSetting,
    BarberShopSubscription,
    BarberShopSubscriptionEvent,
    BarberShopSubscriptionPayment,
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
    list_display = (
        "email",
        "full_name",
        "gender",
        "customer_invite_code",
        "is_active",
        "date_joined",
    )
    list_filter = ("gender", "is_active", "region")
    search_fields = ("email", "full_name", "phone", "customer_invite_code")
    ordering = ("-date_joined",)


@admin.register(BarberCustomerInvite)
class BarberCustomerInviteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "barber",
        "customer_full_name",
        "customer_phone",
        "source",
        "code_used",
        "created_at",
    )
    list_filter = ("source", "created_at")
    search_fields = (
        "customer_full_name",
        "customer_phone",
        "code_used",
        "barber__email",
        "barber__full_name",
    )
    autocomplete_fields = ("barber", "customer", "outreach")
    ordering = ("-created_at",)


@admin.register(BarberCustomerOutreach)
class BarberCustomerOutreachAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "barber",
        "full_name",
        "phone",
        "channel",
        "status",
        "created_at",
    )
    list_filter = ("channel", "status", "created_at")
    search_fields = ("full_name", "phone", "barber__email", "barber__full_name")
    autocomplete_fields = ("barber", "joined_customer")
    ordering = ("-created_at",)


@admin.register(BarberShopSubscription)
class BarberShopSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "barber", "plan_code", "status", "starts_at", "ends_at", "price_uzs")
    list_filter = ("status", "plan_code", "source")
    search_fields = ("barber__email", "barber__full_name", "payment_order_id")
    autocomplete_fields = ("barber",)
    ordering = ("-created_at",)


@admin.register(BarberShopSubscriptionPayment)
class BarberShopSubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = ("order_id", "barber", "plan_code", "amount_uzs", "provider", "status", "paid_at")
    list_filter = ("status", "provider", "plan_code")
    search_fields = ("order_id", "barber__email", "transaction_id")
    autocomplete_fields = ("barber", "subscription")
    ordering = ("-created_at",)


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

