from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import AdminAccount, BarberApplication, User


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


@admin.register(BarberApplication)
class BarberApplicationAdmin(admin.ModelAdmin):
    list_display = ("shop_name", "user_email", "status", "region", "created_at", "reviewed_at")
    list_filter = ("status", "region", "created_at", "reviewed_at")
    search_fields = ("shop_name", "user__email", "user__full_name", "user__phone")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "reviewed_at")
    list_per_page = 50
    actions = ("approve_selected", "reject_selected")

    @admin.display(description="User email", ordering="user__email")
    def user_email(self, obj: BarberApplication):
        return obj.user.email

    @admin.action(description="Approve selected applications")
    def approve_selected(self, request, queryset):
        updated = queryset.exclude(status=BarberApplication.Status.APPROVED).update(
            status=BarberApplication.Status.APPROVED,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"Approved: {updated}")

    @admin.action(description="Reject selected applications")
    def reject_selected(self, request, queryset):
        updated = queryset.exclude(status=BarberApplication.Status.REJECTED).update(
            status=BarberApplication.Status.REJECTED,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"Rejected: {updated}")
