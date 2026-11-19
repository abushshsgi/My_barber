"""Missing / unknown product demand analytics for admin dashboard."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Count, Max, Min, Q
from django.utils import timezone

from hair_advisor.models import (
    HairProduct,
    HairScan,
    ProductCandidate,
    ProductConflict,
    ProductSubmission,
    ProductVerification,
)


def _explain_priority(
    *,
    unique_users: int,
    scan_count: int,
    submissions: int,
    has_conflict: bool,
    pending_age_days: int,
    ingredient_complete: bool,
) -> tuple[int, dict[str, Any]]:
    score = 0
    signals: dict[str, Any] = {}
    score += min(40, unique_users * 4)
    signals["unique_users"] = unique_users
    score += min(25, scan_count)
    signals["scan_count"] = scan_count
    score += min(20, submissions * 5)
    signals["submissions"] = submissions
    if has_conflict:
        score += 15
        signals["conflict"] = True
    if pending_age_days >= 7:
        score += min(10, pending_age_days)
        signals["pending_age_days"] = pending_age_days
    if ingredient_complete:
        score += 10
        signals["ingredient_complete"] = True
    return min(100, score), signals


def missing_products_kpis() -> dict[str, Any]:
    today = timezone.now().date()
    open_statuses = [
        ProductCandidate.Status.OPEN,
        ProductCandidate.Status.NEEDS_REVIEW,
        ProductCandidate.Status.CONFLICT,
    ]
    verified_qs = HairProduct.objects.filter(data_quality_status=HairProduct.DataQuality.VERIFIED)

    verifications = ProductVerification.objects.filter(decision=ProductVerification.Decision.APPROVE)
    avg_turnaround = None
    if verifications.exists():
        pairs = list(
            verifications.select_related("candidate").values_list("created_at", "candidate__created_at")[:500]
        )
        deltas = [
            (v - c).total_seconds()
            for v, c in pairs
            if v and c and v >= c
        ]
        if deltas:
            avg_turnaround = round(sum(deltas) / len(deltas) / 3600, 2)

    return {
        "unknown_barcode_scans": HairScan.objects.filter(status=HairScan.Status.PRODUCT_NOT_FOUND).count(),
        "missing_candidates": ProductCandidate.objects.filter(status__in=open_statuses).count(),
        "product_submissions": ProductSubmission.objects.count(),
        "submissions_today": ProductSubmission.objects.filter(created_at__date=today).count(),
        "unique_contributors": ProductSubmission.objects.values("user_id").distinct().count(),
        "pending_verification": ProductCandidate.objects.filter(status__in=open_statuses).count(),
        "ingredient_conflicts": ProductConflict.objects.filter(resolved=False).count(),
        "recently_approved": ProductCandidate.objects.filter(
            status=ProductCandidate.Status.APPROVED,
            updated_at__gte=timezone.now() - timedelta(days=30),
        ).count(),
        "verified_catalog_size": verified_qs.count(),
        "avg_verification_hours": avg_turnaround,
    }


def list_missing_products(
    *,
    brand: str = "",
    status: str = "",
    q: str = "",
    sort: str = "most_scans",
    page: int = 1,
    page_size: int = 25,
) -> dict[str, Any]:
    page = max(1, page)
    page_size = min(100, max(5, page_size))

    scan_qs = HairScan.objects.filter(status=HairScan.Status.PRODUCT_NOT_FOUND).exclude(barcode="")
    grouped = (
        scan_qs.values("barcode")
        .annotate(
            scan_count=Count("id"),
            unique_users=Count("user_id", distinct=True),
            last_scanned=Max("created_at"),
            first_scanned=Min("created_at"),
        )
        .order_by("-scan_count")
    )

    rows: list[dict[str, Any]] = []
    for row in grouped:
        barcode = row["barcode"]
        cand = (
            ProductCandidate.objects.filter(proposed_barcode=barcode)
            .order_by("-admin_review_priority", "-updated_at")
            .first()
        )
        subs = ProductSubmission.objects.filter(barcode=barcode)
        sub_count = subs.count()
        unique_sub_users = subs.values("user_id").distinct().count()
        has_conflict = False
        candidate_status = ""
        brand_name = ""
        product_name = ""
        variant = ""
        image_url = None
        candidate_id = None
        if cand:
            candidate_id = str(cand.id)
            candidate_status = cand.status
            brand_name = cand.proposed_brand
            product_name = cand.proposed_product_name
            variant = cand.proposed_variant
            has_conflict = bool(cand.conflicting_fields) or cand.status == ProductCandidate.Status.CONFLICT
            link = cand.submission_links.select_related("submission").first()
            if link and link.submission.ingredient_label_image:
                image_url = link.submission.ingredient_label_image.url
            elif link and link.submission.front_image:
                image_url = link.submission.front_image.url

        if brand and brand_name and brand.lower() not in brand_name.lower():
            continue
        if q:
            blob = f"{brand_name} {product_name} {barcode} {variant}".lower()
            if q.lower() not in blob:
                continue
        if status and candidate_status and candidate_status != status:
            continue

        pending_days = 0
        if cand and cand.created_at:
            pending_days = (timezone.now() - cand.created_at).days

        ingredient_complete = any(
            (s.normalized_ingredients or s.user_corrected_ingredients) for s in subs.only("normalized_ingredients", "user_corrected_ingredients")[:20]
        )

        priority, priority_signals = _explain_priority(
            unique_users=int(row["unique_users"]),
            scan_count=int(row["scan_count"]),
            submissions=sub_count,
            has_conflict=has_conflict,
            pending_age_days=pending_days,
            ingredient_complete=ingredient_complete,
        )

        rows.append(
            {
                "barcode": barcode,
                "brand": brand_name,
                "product_name": product_name,
                "variant": variant,
                "image_url": image_url,
                "scan_count": row["scan_count"],
                "unique_users": row["unique_users"],
                "unique_contributors": unique_sub_users,
                "submission_count": sub_count,
                "last_scanned": row["last_scanned"].isoformat() if row["last_scanned"] else None,
                "formula_conflicts": has_conflict,
                "review_priority": priority,
                "priority_signals": priority_signals,
                "verification_status": candidate_status or "no_candidate",
                "candidate_id": candidate_id,
            }
        )

    sort_key = {
        "most_scans": lambda r: (r["scan_count"], r["unique_users"]),
        "most_users": lambda r: (r["unique_users"], r["scan_count"]),
        "most_recent": lambda r: r["last_scanned"] or "",
        "highest_priority": lambda r: r["review_priority"],
        "most_conflicts": lambda r: (1 if r["formula_conflicts"] else 0, r["review_priority"]),
        "oldest_pending": lambda r: r["last_scanned"] or "",
    }.get(sort, lambda r: (r["scan_count"],))

    reverse = sort not in ("oldest_pending",)
    rows.sort(key=sort_key, reverse=reverse)

    total = len(rows)
    start = (page - 1) * page_size
    page_rows = rows[start : start + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": page_rows,
    }