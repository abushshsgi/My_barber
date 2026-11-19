from __future__ import annotations

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.customer_permissions import IsAuthenticatedCustomer
from ai.care_serializers import CareProductSerializer
from ai.models import CareProduct, HairCareProfile
from ai.unthrottled import UnthrottledAPIView
from subscriptions.services import morph_care_block

from hair_advisor.models import HairAnalysis, HairAnalysisFeedback, HairScan, ProductComparison
from hair_advisor.serializers import (
    CompareSerializer,
    ConfirmIngredientsSerializer,
    FeedbackSerializer,
    HairAnalysisSerializer,
    HairRoutineSerializer,
    HairScanCreateSerializer,
    HairScanSerializer,
    ProductComparisonSerializer,
    RoutineCreateSerializer,
)
from hair_advisor.services.analysis import run_analysis_for_scan, run_ocr_for_scan
from hair_advisor.services.barcode import validate_barcode_checksum
from hair_advisor.services.comparison import compare_care_products
from hair_advisor.services.ingredient_detail import build_ingredient_detail
from hair_advisor.services.ingredient_engine import normalize_ingredient_list
from hair_advisor.services.product_recognition import care_to_hair_product, lookup_by_barcode, search_products
from hair_advisor.services.routines import add_product_to_routine, get_or_create_current_routine


def _serialize_scan(scan: HairScan, request) -> dict:
    return HairScanSerializer(scan, context={"request": request}).data


def _require_profile(user) -> HairCareProfile | Response:
    profile, _ = HairCareProfile.objects.get_or_create(user=user)
    if not profile.is_complete:
        return Response(
            {"detail": "Avval soch profilingizni to'ldiring.", "code": "profile_incomplete"},
            status=400,
        )
    return profile


class HairScanListCreateView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)
        qs = HairScan.objects.filter(user=request.user).select_related("care_product", "product")[:50]
        return Response(HairScanSerializer(qs, many=True, context={"request": request}).data)

    @transaction.atomic
    def post(self, request):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)

        ser = HairScanCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        idem = (data.get("idempotency_key") or "").strip()
        if idem:
            existing = HairScan.objects.filter(user=request.user, idempotency_key=idem).first()
            if existing:
                return Response(_serialize_scan(existing, request), status=200)

        scan = HairScan.objects.create(
            user=request.user,
            input_method=data["input_method"],
            status=HairScan.Status.SCANNING,
            idempotency_key=idem,
        )

        method = data["input_method"]
        if method in (HairScan.InputMethod.BARCODE, HairScan.InputMethod.MANUAL_BARCODE):
            raw = (data.get("barcode") or "").strip()
            valid, code = validate_barcode_checksum(raw)
            if not valid:
                scan.status = HairScan.Status.FAILED
                scan.error_code = "invalid_barcode"
                scan.error_message = "Barcode formati yoki nazorat raqami noto'g'ri."
                scan.save()
                return Response(_serialize_scan(scan, request), status=400)

            lookup = lookup_by_barcode(code)
            scan.barcode = code
            scan.lookup_source = lookup.get("source") or lookup.get("tier") or ""
            if not lookup.get("found"):
                scan.status = HairScan.Status.PRODUCT_NOT_FOUND
                scan.save()
                payload = _serialize_scan(scan, request)
                payload["catalog_tier"] = lookup.get("tier") or "unknown"
                payload["message_uz"] = "Mahsulot bazamizda topilmadi. Uni birgalikda aniqlaymiz."
                payload["submission_allowed"] = True
                if lookup.get("external_hint"):
                    payload["external_hint"] = lookup.get("external_hint")
                return Response(payload, status=200)

            scan.care_product = lookup.get("care_product")
            scan.product = lookup.get("hair_product")
            ingredients = lookup.get("ingredients") or []
            scan.ingredients_draft = normalize_ingredient_list(ingredients)
            verified = lookup.get("tier") == "verified" or lookup.get("source") == "verified"
            if ingredients:
                scan.status = HairScan.Status.NEEDS_CONFIRMATION
            elif verified:
                scan.status = HairScan.Status.INGREDIENTS_REQUIRED
            else:
                scan.status = HairScan.Status.INGREDIENTS_REQUIRED
            if verified and ingredients:
                scan.status = HairScan.Status.PRODUCT_FOUND
            scan.save()
            payload = _serialize_scan(scan, request)
            if verified:
                payload["catalog_tier"] = "verified"
                payload["message_uz"] = "Mahsulot ma'lumotlari MySaloon tomonidan tekshirilgan."
                payload["verified_at"] = lookup.get("verified_at")
            return Response(payload, status=201)

        if method == HairScan.InputMethod.SEARCH:
            q = (data.get("search_query") or "").strip()
            scan.search_query = q
            results = search_products(q)
            if not results:
                scan.status = HairScan.Status.PRODUCT_NOT_FOUND
                scan.save()
                return Response(_serialize_scan(scan, request), status=404)
            care = results[0]
            scan.care_product = care
            scan.product = care_to_hair_product(care)
            scan.ingredients_draft = normalize_ingredient_list(care.ingredients or care.ingredients_text)
            scan.status = (
                HairScan.Status.NEEDS_CONFIRMATION
                if scan.ingredients_draft
                else HairScan.Status.INGREDIENTS_REQUIRED
            )
            scan.save()
            return Response(_serialize_scan(scan, request), status=201)

        if method == HairScan.InputMethod.MANUAL_INGREDIENTS:
            scan.ingredients_draft = normalize_ingredient_list(data.get("ingredients"))
            scan.status = HairScan.Status.NEEDS_CONFIRMATION
            scan.save()
            return Response(_serialize_scan(scan, request), status=201)

        if method in (HairScan.InputMethod.CAMERA_LABEL, HairScan.InputMethod.GALLERY):
            profile = _require_profile(request.user)
            if isinstance(profile, Response):
                return profile
            image = (data.get("image") or "").strip()
            if not image:
                scan.status = HairScan.Status.FAILED
                scan.error_code = "missing_image"
                scan.save()
                return Response({"detail": "Rasm kerak."}, status=400)
            scan.status = HairScan.Status.PROCESSING_OCR
            scan.save()
            try:
                run_ocr_for_scan(scan, image, profile, request.user)
            except Exception:
                scan.status = HairScan.Status.FAILED
                scan.error_code = "ocr_failed"
                scan.error_message = "Tarkib o'qilmadi. Aniqroq rasm yuboring."
                scan.save()
                return Response(_serialize_scan(scan, request), status=422)
            return Response(_serialize_scan(scan, request), status=201)

        scan.status = HairScan.Status.FAILED
        scan.error_code = "unsupported_method"
        scan.save()
        return Response(_serialize_scan(scan, request), status=400)


class HairScanDetailView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request, scan_id):
        try:
            scan = HairScan.objects.select_related("care_product", "product").get(pk=scan_id)
        except HairScan.DoesNotExist:
            return Response({"detail": "Topilmadi."}, status=404)
        if scan.user_id != request.user.pk:
            return Response({"detail": "Ruxsat yo'q."}, status=403)
        payload = _serialize_scan(scan, request)
        try:
            analysis = scan.analysis
            payload["analysis"] = HairAnalysisSerializer(analysis).data
        except HairAnalysis.DoesNotExist:
            pass
        return Response(payload)


class ConfirmIngredientsView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    @transaction.atomic
    def post(self, request, scan_id):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)
        try:
            scan = HairScan.objects.get(pk=scan_id, user=request.user)
        except HairScan.DoesNotExist:
            return Response({"detail": "Topilmadi."}, status=404)

        ser = ConfirmIngredientsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        scan.ingredients_confirmed = normalize_ingredient_list(ser.validated_data["ingredients"])
        scan.ingredients_confirmed_at = timezone.now()
        scan.status = HairScan.Status.ANALYZING
        scan.save()

        profile = _require_profile(request.user)
        if isinstance(profile, Response):
            return profile

        analysis = run_analysis_for_scan(scan, profile, request.user)
        return Response(
            {
                "scan": _serialize_scan(scan, request),
                "analysis": HairAnalysisSerializer(analysis).data,
            }
        )


class HairProductDetailView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request, product_id: int):
        care = CareProduct.objects.filter(pk=product_id, is_published=True).first()
        if care is None:
            return Response({"detail": "Topilmadi."}, status=404)
        return Response(CareProductSerializer(care, context={"request": request}).data)


class IngredientDetailView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request):
        from urllib.parse import unquote

        inci = unquote((request.query_params.get("inci") or "").strip())
        product_name = (request.query_params.get("product_name") or "").strip()
        if not inci:
            return Response({"detail": "inci parametri kerak."}, status=400)
        payload = build_ingredient_detail(inci, product_name=product_name)
        if payload is None:
            return Response({"detail": "Topilmadi."}, status=404)
        return Response(payload)


class AnalyzeView(UnthrottledAPIView):
    """POST analyze without new scan — uses scan_id."""

    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def post(self, request):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)
        scan_id = request.data.get("scan_id")
        if not scan_id:
            return Response({"detail": "scan_id kerak."}, status=400)
        try:
            scan = HairScan.objects.get(pk=scan_id, user=request.user)
        except HairScan.DoesNotExist:
            return Response({"detail": "Topilmadi."}, status=404)
        if not (scan.ingredients_confirmed or scan.ingredients_draft):
            return Response({"detail": "Tarkib tasdiqlanmagan."}, status=400)
        profile = _require_profile(request.user)
        if isinstance(profile, Response):
            return profile
        analysis = run_analysis_for_scan(scan, profile, request.user)
        return Response(HairAnalysisSerializer(analysis).data)


class CompareView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def post(self, request):
        blocked = morph_care_block(user=request.user)
        if blocked:
            return Response(blocked, status=status.HTTP_403_FORBIDDEN)
        ser = CompareSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ids = ser.validated_data["care_product_ids"]
        products = list(CareProduct.objects.filter(pk__in=ids, is_published=True))
        if len(products) < 2:
            return Response({"detail": "Mahsulotlar topilmadi."}, status=404)
        profile = HairCareProfile.objects.filter(user=request.user).first()
        result = compare_care_products(products, profile)
        comp = ProductComparison.objects.create(
            user=request.user,
            care_product_ids=ids,
            result=result,
            data_quality_note=result.get("data_quality_note") or "",
        )
        return Response(ProductComparisonSerializer(comp).data)


class HistoryView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request):
        scans = (
            HairScan.objects.filter(user=request.user)
            .select_related("care_product")
            .order_by("-created_at")[:40]
        )
        return Response(HairScanSerializer(scans, many=True, context={"request": request}).data)


class RoutineCreateView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def post(self, request):
        ser = RoutineCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            item = add_product_to_routine(
                request.user,
                ser.validated_data["care_product_id"],
                slot=ser.validated_data.get("slot") or "other",
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=404)
        routine = item.routine
        return Response(HairRoutineSerializer(routine).data, status=201)


class RoutineCurrentView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def get(self, request):
        routine = get_or_create_current_routine(request.user)
        return Response(HairRoutineSerializer(routine).data)


class RoutinePatchView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def patch(self, request, routine_id: int):
        routine = HairRoutine.objects.filter(pk=routine_id, user=request.user).first()
        if routine is None:
            return Response({"detail": "Topilmadi."}, status=404)
        name = request.data.get("name")
        notes = request.data.get("notes")
        fields = []
        if isinstance(name, str) and name.strip():
            routine.name = name.strip()[:80]
            fields.append("name")
        if isinstance(notes, str):
            routine.notes = notes[:2000]
            fields.append("notes")
        if fields:
            fields.append("updated_at")
            routine.save(update_fields=fields)
        return Response(HairRoutineSerializer(routine).data)


class FeedbackView(UnthrottledAPIView):
    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def post(self, request):
        analysis_id = request.data.get("analysis_id")
        if not analysis_id:
            return Response({"detail": "analysis_id kerak."}, status=400)
        analysis = HairAnalysis.objects.filter(pk=analysis_id, user=request.user).first()
        if analysis is None:
            return Response({"detail": "Topilmadi."}, status=404)
        ser = FeedbackSerializer(
            data={
                "analysis": analysis.pk,
                "helpful": request.data.get("helpful"),
                "comment": request.data.get("comment") or "",
            }
        )
        ser.is_valid(raise_exception=True)
        fb = HairAnalysisFeedback.objects.create(
            analysis=analysis,
            user=request.user,
            helpful=ser.validated_data.get("helpful"),
            comment=ser.validated_data.get("comment") or "",
        )
        return Response(FeedbackSerializer(fb).data, status=201)


class HairAdvisorChatView(UnthrottledAPIView):
    """Contextual chat handoff — returns guidance to use main Morph chat."""

    permission_classes = [IsAuthenticated, IsAuthenticatedCustomer]

    def post(self, request):
        return Response(
            {
                "detail": "Asosiy Morph chatdan foydalaning.",
                "redirect": "/api/v1/ai/morph/chat/",
                "note_uz": "Skan natijasini chatga qo'shib savol bering.",
            }
        )