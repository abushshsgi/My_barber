from django.contrib import admin

from subscriptions.models import (
    FlashTryonPass,
    SubscriptionEvent,
    SubscriptionPayment,
    SubscriptionUsagePeriod,
    UserSubscription,
)


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "plan_code",
        "status",
        "source",
        "starts_at",
        "ends_at",
        "cancelled_at",
        "price_uzs",
    )
    list_filter = ("status", "plan_code", "source")
    search_fields = ("user__phone", "user__email", "user__full_name", "payment_order_id")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "order_id",
        "user",
        "plan_code",
        "amount_uzs",
        "amount_tiyin",
        "provider",
        "status",
        "payme_receipt_id",
        "paid_at",
    )
    list_filter = ("status", "provider", "plan_code")
    search_fields = ("order_id", "transaction_id", "user__phone")


@admin.register(SubscriptionUsagePeriod)
class SubscriptionUsagePeriodAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "period_start",
        "plan_code",
        "morph_ai_used",
        "morph_studio_used",
        "morph_chat_tokens_used",
    )
    search_fields = ("user__phone", "user__email")


@admin.register(SubscriptionEvent)
class SubscriptionEventAdmin(admin.ModelAdmin):
    list_display = ("action", "user", "actor", "created_at")
    list_filter = ("action",)
    search_fields = ("user__phone", "actor")


@admin.register(FlashTryonPass)
class FlashTryonPassAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "status",
        "amount_uzs",
        "expires_at",
        "paid_at",
        "used_at",
        "order_id",
    )
    list_filter = ("status",)
    search_fields = ("user__phone", "user__email", "order_id", "payme_receipt_id")
    readonly_fields = ("id", "created_at", "updated_at", "payme_receipt_id", "order_id")

