from rest_framework import serializers

from ai.care_serializers import CareProductSerializer
from hair_advisor.models import (
    HairAnalysis,
    HairAnalysisFeedback,
    HairRoutine,
    HairRoutineItem,
    HairScan,
    ProductComparison,
    ProductSubmission,
)


class HairScanSerializer(serializers.ModelSerializer):
    analysis_id = serializers.SerializerMethodField()
    care_product = CareProductSerializer(read_only=True)
    product_candidates = serializers.SerializerMethodField()
    recognition_meta = serializers.JSONField(read_only=True)

    class Meta:
        model = HairScan
        fields = [
            "id",
            "status",
            "input_method",
            "barcode",
            "search_query",
            "ingredients_draft",
            "ingredients_confirmed",
            "ingredients_confirmed_at",
            "lookup_source",
            "error_code",
            "error_message",
            "care_product",
            "product_id",
            "recognition_meta",
            "product_candidates",
            "created_at",
            "updated_at",
            "analysis_id",
        ]
        read_only_fields = fields

    def get_product_candidates(self, obj: HairScan) -> list[dict]:
        from ai.models import CareProduct

        meta = obj.recognition_meta if isinstance(obj.recognition_meta, dict) else {}
        from hair_advisor.services.hybrid_recognition.constants import PICK_STATUSES

        status = meta.get("recognition_status")
        if status not in PICK_STATUSES:
            return []
        ids = meta.get("candidate_ids") or []
        if not ids:
            return []
        order = {pk: idx for idx, pk in enumerate(ids)}
        rows = CareProduct.objects.filter(pk__in=ids, is_published=True)
        sorted_rows = sorted(rows, key=lambda c: order.get(c.pk, 999))
        return CareProductSerializer(sorted_rows, many=True, context=self.context).data

    def get_analysis_id(self, obj: HairScan) -> int | None:
        analysis = getattr(obj, "analysis", None)
        if analysis is None:
            try:
                analysis = obj.analysis
            except HairAnalysis.DoesNotExist:
                return None
        return analysis.pk if analysis else None


class HairScanCreateSerializer(serializers.Serializer):
    input_method = serializers.ChoiceField(choices=HairScan.InputMethod.choices)
    barcode = serializers.CharField(required=False, allow_blank=True, max_length=32)
    search_query = serializers.CharField(required=False, allow_blank=True, max_length=160)
    ingredients = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        allow_empty=True,
    )
    image = serializers.CharField(required=False, allow_blank=True)
    idempotency_key = serializers.CharField(required=False, allow_blank=True, max_length=64)


class ConfirmIngredientsSerializer(serializers.Serializer):
    ingredients = serializers.ListField(child=serializers.CharField(max_length=200), min_length=1)


class ConfirmProductSerializer(serializers.Serializer):
    care_product_id = serializers.IntegerField(min_value=1)


class HairAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = HairAnalysis
        fields = [
            "id",
            "scan_id",
            "schema_version",
            "algorithm_version",
            "recommendation",
            "result",
            "explanation_uz",
            "data_confidence",
            "created_at",
        ]
        read_only_fields = fields


class CompareSerializer(serializers.Serializer):
    care_product_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        min_length=2,
        max_length=4,
    )


class RoutineItemSerializer(serializers.ModelSerializer):
    care_product = CareProductSerializer(read_only=True)

    class Meta:
        model = HairRoutineItem
        fields = ["id", "slot", "usage_notes", "sort_order", "care_product", "hair_product_id"]


class HairRoutineSerializer(serializers.ModelSerializer):
    items = RoutineItemSerializer(many=True, read_only=True)

    class Meta:
        model = HairRoutine
        fields = ["id", "name", "is_current", "notes", "items", "created_at", "updated_at"]


class RoutineCreateSerializer(serializers.Serializer):
    care_product_id = serializers.IntegerField(min_value=1)
    slot = serializers.ChoiceField(choices=HairRoutineItem.Slot.choices, default=HairRoutineItem.Slot.OTHER)
    name = serializers.CharField(required=False, allow_blank=True, max_length=80)


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = HairAnalysisFeedback
        fields = ["id", "analysis", "helpful", "comment", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductComparisonSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductComparison
        fields = ["id", "title", "care_product_ids", "result", "data_quality_note", "created_at"]
        read_only_fields = fields


class ProductSubmissionSerializer(serializers.ModelSerializer):
    candidate_id = serializers.SerializerMethodField()

    class Meta:
        model = ProductSubmission
        fields = [
            "id",
            "hair_scan",
            "barcode",
            "submitted_product_name",
            "submitted_brand",
            "submitted_variant",
            "normalized_ingredients",
            "user_corrected_ingredients",
            "product_size",
            "claimed_country",
            "observed_price",
            "currency",
            "store_name",
            "status",
            "recognition_confidence",
            "created_at",
            "updated_at",
            "candidate_id",
        ]
        read_only_fields = fields

    def get_candidate_id(self, obj: ProductSubmission) -> str | None:
        try:
            return str(obj.candidate_link.candidate_id)
        except Exception:
            return None


class ProductSubmissionCreateSerializer(serializers.Serializer):
    hair_scan_id = serializers.UUIDField(required=False)
    barcode = serializers.CharField(required=False, allow_blank=True, max_length=32)
    submitted_product_name = serializers.CharField(required=False, allow_blank=True, max_length=160)
    submitted_brand = serializers.CharField(required=False, allow_blank=True, max_length=120)
    submitted_variant = serializers.CharField(required=False, allow_blank=True, max_length=80)
    product_size = serializers.CharField(required=False, allow_blank=True, max_length=40)
    claimed_country = serializers.CharField(required=False, allow_blank=True, max_length=80)
    observed_price = serializers.DecimalField(required=False, max_digits=12, decimal_places=2)
    currency = serializers.CharField(required=False, allow_blank=True, max_length=8)
    store_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    front_image = serializers.CharField(required=False, allow_blank=True)
    back_image = serializers.CharField(required=False, allow_blank=True)
    ingredient_label_image = serializers.CharField(required=False, allow_blank=True)
    barcode_image = serializers.CharField(required=False, allow_blank=True)
    image = serializers.CharField(required=False, allow_blank=True)
    user_corrected_ingredients = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False,
        allow_empty=True,
    )
    finalize = serializers.BooleanField(required=False, default=True)