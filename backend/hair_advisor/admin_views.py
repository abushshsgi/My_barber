"""Admin Hair Advisor analytics."""

from __future__ import annotations

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.models import AiGenerationUsage, CareProduct
from ai.unthrottled import UnthrottledAPIView
from hair_advisor.models import (
    HairAnalysis,
    HairAnalysisFeedback,
    HairProduct,
    HairScan,
    Ingredient,
    ProductCandidate,
    ProductSubmission,
)


class AdminHairAdvisorStatsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        today = timezone.now().date()
        scans_qs = HairScan.objects.all()
        analysis_qs = HairAnalysis.objects.all()

        status_counts = dict(
            scans_qs.values("status").annotate(c=Count("id")).values_list("status", "c")
        )
        total_scans = scans_qs.count()
        completed = status_counts.get(HairScan.Status.COMPLETED, 0)
        failed = status_counts.get(HairScan.Status.FAILED, 0)
        ocr_failed = scans_qs.filter(error_code="ocr_failed").count()
        unknown_products = status_counts.get(HairScan.Status.PRODUCT_NOT_FOUND, 0)

        top_barcodes = list(
            scans_qs.exclude(barcode="")
            .values("barcode")
            .annotate(c=Count("id"))
            .order_by("-c")[:10]
        )

        top_care = list(
            scans_qs.exclude(care_product_id=None)
            .values("care_product_id", "care_product__name", "care_product__brand")
            .annotate(c=Count("id"))
            .order_by("-c")[:10]
        )

        unique_scanners = scans_qs.values("user_id").distinct().count()
        repeat_users = (
            scans_qs.values("user_id")
            .annotate(c=Count("id"))
            .filter(c__gte=2)
            .count()
        )

        ai_usage = AiGenerationUsage.objects.filter(kind="hair_advisor_explain")
        ai_agg = ai_usage.aggregate(
            avg_latency=Avg("latency_ms"),
            total_calls=Count("id"),
        )
        ai_cost = sum(float(r.cost_usd or 0) for r in ai_usage.only("cost_usd")[:5000])

        feedback_total = HairAnalysisFeedback.objects.count()
        feedback_helpful = HairAnalysisFeedback.objects.filter(helpful=True).count()

        verified_hits = scans_qs.filter(
            lookup_source="verified",
            status__in=[HairScan.Status.COMPLETED, HairScan.Status.PRODUCT_FOUND, HairScan.Status.NEEDS_CONFIRMATION],
        ).count()
        verified_catalog_size = HairProduct.objects.filter(
            data_quality_status=HairProduct.DataQuality.VERIFIED
        ).count()
        hit_rate = round((verified_hits / total_scans) * 100, 2) if total_scans else 0.0

        return Response(
            {
                "total_scans": total_scans,
                "scans_today": scans_qs.filter(created_at__date=today).count(),
                "successful_analyses": completed,
                "failed_analyses": failed,
                "ocr_failures": ocr_failed,
                "unknown_products": unknown_products,
                "status_breakdown": status_counts,
                "unique_scanner_users": unique_scanners,
                "repeat_scanner_users": repeat_users,
                "ingredients_in_db": Ingredient.objects.count(),
                "most_scanned_products": [
                    {
                        "care_product_id": row["care_product_id"],
                        "name": row.get("care_product__name") or "",
                        "brand": row.get("care_product__brand") or "",
                        "count": row["c"],
                    }
                    for row in top_care
                ],
                "most_scanned_barcodes": top_barcodes,
                "ai_explain": {
                    "calls": ai_agg.get("total_calls") or 0,
                    "avg_latency_ms": int(ai_agg.get("avg_latency") or 0),
                    "estimated_cost_usd": round(ai_cost, 4),
                },
                "feedback_total": feedback_total,
                "feedback_helpful": feedback_helpful,
                "unverified_products": CareProduct.objects.filter(
                    Q(is_verified=False) | Q(ingredients_text="", ingredients=[])
                ).count(),
                "verified_catalog_hit_rate": hit_rate,
                "verified_catalog_size": verified_catalog_size,
                "product_submissions_total": ProductSubmission.objects.count(),
                "open_candidates": ProductCandidate.objects.filter(
                    status__in=[
                        ProductCandidate.Status.OPEN,
                        ProductCandidate.Status.NEEDS_REVIEW,
                        ProductCandidate.Status.CONFLICT,
                    ]
                ).count(),
            }
        )