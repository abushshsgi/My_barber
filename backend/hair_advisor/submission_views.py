from __future__ import annotations

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.customer_permissions import IsAuthenticatedCustomer
from ai.models import HairCareProfile
from ai.unthrottled import UnthrottledAPIView
from subscriptions.services import morph_care_block

from hair_advisor.models import HairScan, ProductSubmission
from hair_advisor.serializers import ProductSubmissionCreateSerializer, ProductSubmissionSerializer
from hair_advisor.services.submission_pipeline import (
    extract_from_label_image,
    finalize_submission,
    save_submission_image,
)


class ProductSubmissionListCreateView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)
        qs = ProductSubmission.objects.filter(user=request.user).order_by("-created_at")[:30]
        return Response(ProductSubmissionSerializer(qs, many=True).data)

    @transaction.atomic
    def post(self, request):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)

        ser = ProductSubmissionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        scan = None
        scan_id = data.get("hair_scan_id")
        if scan_id:
            scan = HairScan.objects.filter(pk=scan_id, user=request.user).first()

        submission = ProductSubmission.objects.create(
            user=request.user,
            hair_scan=scan,
            barcode=(data.get("barcode") or (scan.barcode if scan else ""))[:32],
            submitted_product_name=(data.get("submitted_product_name") or "")[:160],
            submitted_brand=(data.get("submitted_brand") or "")[:120],
            submitted_variant=(data.get("submitted_variant") or "")[:80],
            product_size=(data.get("product_size") or "")[:40],
            claimed_country=(data.get("claimed_country") or "")[:80],
            observed_price=data.get("observed_price"),
            currency=(data.get("currency") or "")[:8],
            store_name=(data.get("store_name") or "")[:120],
            status=ProductSubmission.Status.PROCESSING,
        )

        for role in ("front", "back", "ingredient_label", "barcode"):
            img = (data.get(f"{role}_image") or "").strip()
            if img:
                save_submission_image(submission, role, img)

        profile, _ = HairCareProfile.objects.get_or_create(user=request.user)
        label_image = (data.get("ingredient_label_image") or data.get("image") or "").strip()
        if label_image and label_image.startswith("data:"):
            try:
                extract_from_label_image(submission, label_image, profile, request.user)
            except Exception:
                submission.status = ProductSubmission.Status.SUBMITTED
                submission.save(update_fields=["status", "updated_at"])

        ingredients = data.get("user_corrected_ingredients")
        finalize = data.get("finalize", True)
        if finalize:
            finalize_submission(submission, ingredients=ingredients)
        else:
            submission.status = ProductSubmission.Status.READY
            submission.save(update_fields=["status", "updated_at"])

        payload = ProductSubmissionSerializer(submission).data
        payload["message_uz"] = "Mahsulot ma'lumotlari tekshiruvga yuborildi."
        return Response(payload, status=201)


class ProductSubmissionDetailView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request, submission_id):
        sub = ProductSubmission.objects.filter(pk=submission_id, user=request.user).first()
        if sub is None:
            return Response({"detail": "Topilmadi."}, status=404)
        return Response(ProductSubmissionSerializer(sub).data)

    @transaction.atomic
    def patch(self, request, submission_id):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)
        sub = ProductSubmission.objects.filter(pk=submission_id, user=request.user).first()
        if sub is None:
            return Response({"detail": "Topilmadi."}, status=404)
        ingredients = request.data.get("user_corrected_ingredients")
        if isinstance(ingredients, list):
            finalize_submission(sub, ingredients=ingredients)
        payload = ProductSubmissionSerializer(sub).data
        payload["message_uz"] = "Mahsulot ma'lumotlari tekshiruvga yuborildi."
        return Response(payload)