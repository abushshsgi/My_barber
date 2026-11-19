from django.contrib import admin

from hair_advisor.models import (
    HairAnalysis,
    HairProduct,
    HairScan,
    Ingredient,
    ProductCandidate,
    ProductComparison,
    ProductSubmission,
    ProductVerification,
)


@admin.register(HairScan)
class HairScanAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "barcode", "input_method", "created_at")
    list_filter = ("status", "input_method", "lookup_source")
    search_fields = ("barcode", "search_query", "user__phone", "user__email")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(HairAnalysis)
class HairAnalysisAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "recommendation", "data_confidence", "created_at")
    list_filter = ("recommendation", "data_confidence")


@admin.register(HairProduct)
class HairProductAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "barcode", "data_quality_status", "updated_at")
    search_fields = ("name", "brand", "barcode")


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    search_fields = ("inci_name", "normalized_name")


@admin.register(ProductComparison)
class ProductComparisonAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at")


@admin.register(ProductSubmission)
class ProductSubmissionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "submitted_brand", "barcode", "created_at")
    list_filter = ("status",)
    search_fields = ("barcode", "submitted_product_name", "submitted_brand")


@admin.register(ProductCandidate)
class ProductCandidateAdmin(admin.ModelAdmin):
    list_display = (
        "proposed_product_name",
        "proposed_brand",
        "proposed_barcode",
        "status",
        "submission_count",
        "admin_review_priority",
    )
    list_filter = ("status",)


@admin.register(ProductVerification)
class ProductVerificationAdmin(admin.ModelAdmin):
    list_display = ("candidate", "decision", "created_at")
    list_filter = ("decision",)