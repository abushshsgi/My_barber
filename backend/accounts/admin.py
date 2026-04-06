from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import AdminAccount, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "username", "full_name", "role", "is_staff")
    list_filter = ("role", "is_staff", "is_superuser")
    search_fields = ("email", "username", "phone", "full_name")
    list_select_related = ()
    list_per_page = 50
    list_display_links = ("email",)
    autocomplete_fields = ("groups",)
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Personal", {"fields": ("full_name", "phone", "avatar", "role")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "password1", "password2", "role"),
            },
        ),
    )


@admin.register(AdminAccount)
class AdminAccountAdmin(admin.ModelAdmin):
    list_display = ("email", "is_active", "last_login", "created_at")
    list_filter = ("is_active",)
    search_fields = ("email",)
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "last_login")


