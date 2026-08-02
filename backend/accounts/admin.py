from django.contrib import admin

from accounts.models import LaunchInterest, SkinProfile, User, UserAddress


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    search_fields = ("email", "phone", "first_name", "last_name", "full_name")
    list_display = ("id", "email", "phone", "region", "onboarding_completed")
    list_filter = ("region", "onboarding_completed", "role")


@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "label", "region", "is_default", "updated_at")
    list_filter = ("region", "is_default", "label")
    search_fields = ("user__email", "user__phone", "address_line")


@admin.register(LaunchInterest)
class LaunchInterestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "region", "city_label", "source", "created_at")
    list_filter = ("region", "source", "created_at")
    search_fields = ("user__email", "user__phone", "city_label", "message")
    readonly_fields = ("created_at",)


@admin.register(SkinProfile)
class SkinProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "skin_type",
        "acne_prone",
        "sensitivity",
        "completed_at",
        "updated_at",
    )
    list_filter = ("skin_type", "acne_prone", "sensitivity")
    search_fields = ("user__email", "user__phone")
    readonly_fields = ("completed_at", "updated_at")
