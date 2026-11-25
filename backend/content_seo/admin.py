from django.contrib import admin

from content_seo.models import SeoArticle


@admin.register(SeoArticle)
class SeoArticleAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "slug",
        "locale",
        "category",
        "status",
        "published_at",
        "updated_at",
    )
    list_filter = ("status", "locale", "category")
    search_fields = ("title", "slug", "excerpt")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")