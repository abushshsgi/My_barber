from django.contrib import admin

from .models import Booking, BookingCompletion, BookingLine, Review


class BookingLineInline(admin.TabularInline):
    model = BookingLine
    extra = 0


class BookingCompletionInline(admin.StackedInline):
    model = BookingCompletion
    extra = 0
    can_delete = False
    readonly_fields = ("completed_at",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "order_number", "customer", "salon", "barber", "start_at", "status")
    list_filter = ("status", "salon", "barber")
    search_fields = (
        "id",
        "order_number",
        "customer__email",
        "customer__full_name",
        "barber__email",
        "salon__name",
    )
    autocomplete_fields = ("customer", "salon", "barber")
    date_hierarchy = "start_at"
    inlines = [BookingLineInline, BookingCompletionInline]
    readonly_fields = ("created_at", "updated_at", "total_price", "end_at")
    list_per_page = 50


@admin.register(BookingCompletion)
class BookingCompletionAdmin(admin.ModelAdmin):
    list_display = ("booking", "portfolio_allowed", "completed_at")
    list_filter = ("portfolio_allowed", "completed_at")
    search_fields = ("booking__id", "booking__salon__name", "booking__customer__email")
    autocomplete_fields = ("booking",)
    date_hierarchy = "completed_at"
    readonly_fields = ("completed_at",)
    list_per_page = 50


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("salon", "barber", "rating", "created_at")
    list_filter = ("rating", "created_at", "salon")
    search_fields = ("salon__name", "barber__email", "author__email", "text")
    autocomplete_fields = ("booking", "author", "salon", "barber")
    date_hierarchy = "created_at"
    list_per_page = 50
