"""Admin product verification dashboard APIs."""

from __future__ import annotations

from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from ai.unthrottled import UnthrottledAPIView

from hair_advisor.models import (
    CandidateSubmission,
    HairProduct,
    ProductAggregationJob,
    ProductCandidate,
    ProductConflict,
    ProductSubmission,
    ProductVerification,
    ProductVerificationAlert,
)
from hair_advisor.services.publishing import publish_candidate


def _candidate_row(c: ProductCandidate) -> dict:
    first_sub = (
        c.submission_links.select_related("submission")
        .order_by("created_at")
        .first()
    )
    img = None
    if first_sub and first_sub.submission.ingredient_label_image:
        img = first_sub.submission.ingredient_label_image.url
    elif first_sub and first_sub.submission.front_image:
        img = first_sub.submission.front_image.url
    return {
        "id": str(c.id),
        "status": c.status,
        "proposed_brand": c.proposed_brand,
        "proposed_product_name": c.proposed_product_name,
        "proposed_variant": c.proposed_variant,
        "proposed_barcode": c.proposed_barcode,
        "submission_count": c.submission_count,
        "conflicting_fields": c.conflicting_fields,
        "admin_review_priority": c.admin_review_priority,
        "proposed_field_evidence": c.proposed_field_evidence,
        "image_url": img,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


class AdminProductVerificationDashboardView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        open_statuses = [
            ProductCandidate.Status.OPEN,
            ProductCandidate.Status.NEEDS_REVIEW,
            ProductCandidate.Status.CONFLICT,
        ]
        pending = ProductCandidate.objects.filter(status__in=open_statuses).count()
        conflicts = ProductConflict.objects.filter(resolved=False).count()
        verified = ProductCandidate.objects.filter(status=ProductCandidate.Status.APPROVED).count()
        rejected = ProductCandidate.objects.filter(status=ProductCandidate.Status.REJECTED).count()
        alerts_unread = ProductVerificationAlert.objects.filter(read_at__isnull=True).count()

        top_barcodes = list(
            ProductSubmission.objects.exclude(barcode="")
            .values("barcode")
            .annotate(c=Count("id"))
            .order_by("-c")[:10]
        )

        return Response(
            {
                "pending_candidates": pending,
                "conflicts_open": conflicts,
                "verified_candidates": verified,
                "rejected_candidates": rejected,
                "alerts_unread": alerts_unread,
                "submissions_total": ProductSubmission.objects.count(),
                "submissions_today": ProductSubmission.objects.filter(
                    created_at__date=timezone.now().date()
                ).count(),
                "most_requested_barcodes": top_barcodes,
            }
        )


class AdminProductCandidateListView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        status_filter = (request.query_params.get("status") or "").strip()
        q = (request.query_params.get("q") or "").strip()
        qs = ProductCandidate.objects.all().order_by("-admin_review_priority", "-updated_at")
        if status_filter:
            qs = qs.filter(status=status_filter)
        if q:
            qs = qs.filter(
                Q(proposed_brand__icontains=q)
                | Q(proposed_product_name__icontains=q)
                | Q(proposed_barcode__icontains=q)
            )
        return Response({"candidates": [_candidate_row(c) for c in qs[:100]]})


class AdminProductCandidateDetailView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request, candidate_id):
        cand = ProductCandidate.objects.filter(pk=candidate_id).first()
        if cand is None:
            return Response({"detail": "Topilmadi."}, status=404)
        submissions = []
        for link in cand.submission_links.select_related("submission", "submission__user").order_by(
            "-created_at"
        ):
            sub = link.submission
            submissions.append(
                {
                    "id": str(sub.id),
                    "user_id": sub.user_id,
                    "barcode": sub.barcode,
                    "brand": sub.submitted_brand,
                    "name": sub.submitted_product_name,
                    "ingredients": sub.user_corrected_ingredients or sub.normalized_ingredients,
                    "raw_ocr": sub.raw_ocr_result,
                    "images": {
                        "front": sub.front_image.url if sub.front_image else None,
                        "back": sub.back_image.url if sub.back_image else None,
                        "ingredient_label": sub.ingredient_label_image.url if sub.ingredient_label_image else None,
                        "barcode": sub.barcode_image.url if sub.barcode_image else None,
                    },
                    "match_stage": link.match_stage,
                    "match_score": link.match_score,
                    "created_at": sub.created_at.isoformat() if sub.created_at else None,
                }
            )
        conflicts = list(
            ProductConflict.objects.filter(candidate=cand, resolved=False).values(
                "id", "conflict_type", "field_name", "values", "submission_ids", "created_at"
            )
        )
        reviews = list(
            ProductVerification.objects.filter(candidate=cand)
            .order_by("-created_at")
            .values("decision", "review_notes", "corrected_fields", "created_at")[:20]
        )
        return Response(
            {
                "candidate": _candidate_row(cand),
                "submissions": submissions,
                "conflicts": conflicts,
                "reviews": reviews,
            }
        )


class AdminProductCandidateApproveView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def post(self, request, candidate_id):
        cand = ProductCandidate.objects.filter(pk=candidate_id).first()
        if cand is None:
            return Response({"detail": "Topilmadi."}, status=404)
        corrected = request.data.get("corrected_fields") if isinstance(request.data.get("corrected_fields"), dict) else {}
        notes = str(request.data.get("review_notes") or "")
        admin_meta = {
            "admin_id": getattr(request.user, "id", None),
            "admin_email": getattr(getattr(request.user, "admin_account", None), "email", ""),
        }
        hp = publish_candidate(
            cand,
            reviewer=None,
            corrected_fields=corrected,
            review_notes=notes,
            admin_meta=admin_meta,
        )
        return Response(
            {
                "hair_product_id": hp.pk,
                "care_product_id": hp.care_product_id,
                "public_id": str(hp.public_id),
                "status": "approved",
            }
        )


class AdminProductCandidateRejectView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def post(self, request, candidate_id):
        cand = ProductCandidate.objects.filter(pk=candidate_id).first()
        if cand is None:
            return Response({"detail": "Topilmadi."}, status=404)
        notes = str(request.data.get("review_notes") or "")
        ProductVerification.objects.create(
            candidate=cand,
            reviewer=None,
            decision=ProductVerification.Decision.REJECT,
            review_notes=notes,
            evidence_reviewed=[{"admin_id": getattr(request.user, "id", None)}],
        )
        cand.status = ProductCandidate.Status.REJECTED
        cand.save(update_fields=["status", "updated_at"])
        return Response({"status": "rejected"})


class AdminProductCandidateLinkExistingView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request, candidate_id):
        care_product_id = request.data.get("care_product_id")
        if not care_product_id:
            return Response({"detail": "care_product_id kerak"}, status=400)
        cand = ProductCandidate.objects.filter(pk=candidate_id).first()
        if cand is None:
            return Response({"detail": "Topilmadi."}, status=404)
        hp = HairProduct.objects.filter(care_product_id=care_product_id).first()
        if hp is None:
            return Response({"detail": "HairProduct topilmadi."}, status=404)
        cand.status = ProductCandidate.Status.APPROVED
        cand.published_product = hp
        cand.save(update_fields=["status", "published_product", "updated_at"])
        ProductVerification.objects.create(
            candidate=cand,
            reviewer=None,
            decision=ProductVerification.Decision.LINK_EXISTING,
            review_notes=str(request.data.get("review_notes") or ""),
            corrected_fields={"care_product_id": care_product_id},
        )
        return Response({"status": "linked", "hair_product_id": hp.pk})


class AdminProductCandidateRequestInfoView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def post(self, request, candidate_id):
        cand = ProductCandidate.objects.filter(pk=candidate_id).first()
        if cand is None:
            return Response({"detail": "Topilmadi."}, status=404)
        notes = str(request.data.get("review_notes") or "")
        cand.status = ProductCandidate.Status.NEEDS_REVIEW
        cand.save(update_fields=["status", "updated_at"])
        ProductVerification.objects.create(
            candidate=cand,
            reviewer=None,
            decision=ProductVerification.Decision.REQUEST_INFO,
            review_notes=notes,
        )
        return Response({"status": "needs_review"})


class AdminAggregationJobsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        status_filter = (request.query_params.get("status") or "").strip()
        qs = ProductAggregationJob.objects.select_related("submission").order_by("-created_at")
        if status_filter:
            qs = qs.filter(status=status_filter)
        pending = ProductAggregationJob.objects.filter(status=ProductAggregationJob.Status.PENDING).count()
        rows = [
            {
                "id": job.id,
                "submission_id": str(job.submission_id),
                "status": job.status,
                "attempts": job.attempts,
                "last_error": job.last_error,
                "created_at": job.created_at.isoformat() if job.created_at else None,
            }
            for job in qs[:100]
        ]
        return Response({"jobs": rows, "pending": pending})


class AdminProductCandidateMergeView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request, candidate_id):
        target_id = request.data.get("target_candidate_id")
        if not target_id:
            return Response({"detail": "target_candidate_id kerak"}, status=400)
        source = ProductCandidate.objects.filter(pk=candidate_id).first()
        target = ProductCandidate.objects.filter(pk=target_id).exclude(pk=candidate_id).first()
        if not source or not target:
            return Response({"detail": "Topilmadi."}, status=404)
        for link in list(CandidateSubmission.objects.filter(candidate=source).select_related("submission")):
            link.candidate = target
            link.match_stage = "merge"
            link.save(update_fields=["candidate", "match_stage"])
        count = CandidateSubmission.objects.filter(candidate=target).count()
        ProductCandidate.objects.filter(pk=target.pk).update(
            submission_count=count,
            updated_at=timezone.now(),
        )
        source.status = ProductCandidate.Status.MERGED
        source.save(update_fields=["status", "updated_at"])
        ProductVerification.objects.create(
            candidate=target,
            reviewer=None,
            decision=ProductVerification.Decision.MERGE,
            review_notes=f"Merged from {source.id}",
            evidence_reviewed=[{"merged_from": str(source.id)}],
        )
        return Response({"status": "merged", "target_id": str(target.id), "submission_count": count})


class AdminProductCandidateSplitView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def post(self, request, candidate_id):
        submission_ids = request.data.get("submission_ids")
        if not isinstance(submission_ids, list) or not submission_ids:
            return Response({"detail": "submission_ids kerak"}, status=400)
        source = ProductCandidate.objects.filter(pk=candidate_id).first()
        if not source:
            return Response({"detail": "Topilmadi."}, status=404)
        new_cand = ProductCandidate.objects.create(
            proposed_brand=source.proposed_brand,
            proposed_product_name=source.proposed_product_name,
            proposed_barcode=source.proposed_barcode,
            status=ProductCandidate.Status.OPEN,
            duplicate_group=source.duplicate_group,
        )
        moved = 0
        for sid in submission_ids:
            link = CandidateSubmission.objects.filter(candidate=source, submission_id=sid).first()
            if not link:
                continue
            link.candidate = new_cand
            link.match_stage = "split"
            link.save(update_fields=["candidate", "match_stage"])
            moved += 1
        if moved == 0:
            new_cand.delete()
            return Response({"detail": "Topshiruvlar topilmadi."}, status=404)
        ProductCandidate.objects.filter(pk=source.pk).update(
            submission_count=CandidateSubmission.objects.filter(candidate=source).count(),
            updated_at=timezone.now(),
        )
        ProductCandidate.objects.filter(pk=new_cand.pk).update(
            submission_count=moved,
            updated_at=timezone.now(),
        )
        ProductVerification.objects.create(
            candidate=new_cand,
            reviewer=None,
            decision=ProductVerification.Decision.SPLIT,
            review_notes=f"Split from {source.id}",
            evidence_reviewed=[{"submission_ids": submission_ids}],
        )
        return Response({"status": "split", "new_candidate_id": str(new_cand.id), "moved": moved})


class AdminProductVerificationAlertsView(UnthrottledAPIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = ProductVerificationAlert.objects.filter(read_at__isnull=True).order_by("-created_at")[:50]
        return Response(
            {
                "alerts": [
                    {
                        "id": a.id,
                        "type": a.alert_type,
                        "title": a.title,
                        "body": a.body,
                        "candidate_id": str(a.candidate_id) if a.candidate_id else None,
                        "created_at": a.created_at.isoformat() if a.created_at else None,
                    }
                    for a in qs
                ]
            }
        )

    def post(self, request):
        alert_id = request.data.get("alert_id")
        if not alert_id:
            return Response({"detail": "alert_id kerak"}, status=400)
        ProductVerificationAlert.objects.filter(pk=alert_id).update(read_at=timezone.now())
        return Response({"ok": True})