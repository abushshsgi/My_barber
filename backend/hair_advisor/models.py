"""AI Hair Care Advisor — scan workflow, ingredients, analysis, routines."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class HairProduct(models.Model):
    """Normalized product record; links to existing CareProduct when available."""

    class DataQuality(models.TextChoices):
        VERIFIED = "verified", "Verified"
        PARTIAL = "partial", "Partial"
        UNVERIFIED = "unverified", "Unverified"
        EXTERNAL = "external", "External"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    care_product = models.OneToOneField(
        "ai.CareProduct",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hair_advisor_product",
    )
    barcode = models.CharField(max_length=32, blank=True, default="", db_index=True)
    brand = models.CharField(max_length=120, blank=True, default="")
    name = models.CharField(max_length=160)
    product_line = models.CharField(max_length=120, blank=True, default="")
    category = models.CharField(max_length=32, blank=True, default="")
    product_variant = models.CharField(max_length=80, blank=True, default="")
    size = models.CharField(max_length=40, blank=True, default="")
    target_market = models.CharField(max_length=40, blank=True, default="")
    manufacturer = models.CharField(max_length=120, blank=True, default="")
    manufacturing_country = models.CharField(max_length=80, blank=True, default="")
    description = models.TextField(blank=True, default="")
    ingredient_list_raw = models.TextField(blank=True, default="")
    ingredient_list_normalized = models.JSONField(default=list, blank=True)
    formula_version = models.CharField(max_length=40, blank=True, default="")
    data_quality_status = models.CharField(
        max_length=16,
        choices=DataQuality.choices,
        default=DataQuality.UNVERIFIED,
        db_index=True,
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hair_products_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["barcode", "data_quality_status"]),
        ]

    def __str__(self) -> str:
        return f"{self.brand} {self.name}".strip() or f"HairProduct({self.pk})"


class Ingredient(models.Model):
    inci_name = models.CharField(max_length=200, db_index=True)
    normalized_name = models.CharField(max_length=200, db_index=True)
    synonyms = models.JSONField(default=list, blank=True)
    ingredient_functions = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True, default="")
    evidence_status = models.CharField(max_length=24, blank=True, default="pending")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["inci_name"]

    def __str__(self) -> str:
        return self.inci_name


class ProductIngredient(models.Model):
    product = models.ForeignKey(HairProduct, on_delete=models.CASCADE, related_name="product_ingredients")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="product_links")
    declared_position = models.PositiveSmallIntegerField(default=0)
    source_text = models.CharField(max_length=240, blank=True, default="")
    recognition_confidence = models.FloatField(default=1.0)

    class Meta:
        ordering = ["declared_position"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "ingredient", "declared_position"],
                name="uniq_hair_product_ingredient_pos",
            ),
        ]


class IngredientEvidence(models.Model):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="evidence")
    claim = models.CharField(max_length=280)
    source_title = models.CharField(max_length=200, blank=True, default="")
    source_url = models.URLField(max_length=500, blank=True, default="")
    evidence_type = models.CharField(max_length=40, blank=True, default="")
    evidence_strength = models.CharField(max_length=24, blank=True, default="moderate")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    limitations = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-reviewed_at", "id"]


class ProductSource(models.Model):
    class SourceType(models.TextChoices):
        INTERNAL = "internal", "Internal"
        OPEN_BEAUTY_FACTS = "open_beauty_facts", "Open Beauty Facts"
        UPCITEMDB = "upcitemdb", "UPCitemdb"
        USER_OCR = "user_ocr", "User OCR"
        MANUAL = "manual", "Manual"

    product = models.ForeignKey(HairProduct, on_delete=models.CASCADE, related_name="sources")
    source_type = models.CharField(max_length=32, choices=SourceType.choices)
    external_id = models.CharField(max_length=120, blank=True, default="")
    fetched_at = models.DateTimeField(auto_now_add=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-fetched_at"]


class HairScan(models.Model):
    """User scan job with explicit state machine."""

    class Status(models.TextChoices):
        IDLE = "idle", "Idle"
        REQUESTING_PERMISSION = "requesting_permission", "Requesting permission"
        SCANNING = "scanning", "Scanning"
        PRODUCT_FOUND = "product_found", "Product found"
        PRODUCT_NOT_FOUND = "product_not_found", "Product not found"
        INGREDIENTS_REQUIRED = "ingredients_required", "Ingredients required"
        PROCESSING_OCR = "processing_ocr", "Processing OCR"
        NEEDS_CONFIRMATION = "needs_confirmation", "Needs confirmation"
        ANALYZING = "analyzing", "Analyzing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    class InputMethod(models.TextChoices):
        BARCODE = "barcode", "Barcode"
        CAMERA_LABEL = "camera_label", "Camera label"
        GALLERY = "gallery", "Gallery"
        MANUAL_BARCODE = "manual_barcode", "Manual barcode"
        SEARCH = "search", "Search"
        MANUAL_INGREDIENTS = "manual_ingredients", "Manual ingredients"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hair_scans",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.IDLE,
        db_index=True,
    )
    input_method = models.CharField(max_length=24, choices=InputMethod.choices, blank=True, default="")
    barcode = models.CharField(max_length=32, blank=True, default="", db_index=True)
    search_query = models.CharField(max_length=160, blank=True, default="")
    label_image = models.ImageField(upload_to="hair-advisor/scans/%Y/%m/", blank=True, null=True)
    product = models.ForeignKey(
        HairProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scans",
    )
    care_product = models.ForeignKey(
        "ai.CareProduct",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hair_scans",
    )
    legacy_scan = models.ForeignKey(
        "ai.IngredientScanEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="hair_advisor_scans",
    )
    ingredients_draft = models.JSONField(default=list, blank=True)
    ingredients_confirmed = models.JSONField(default=list, blank=True)
    ingredients_confirmed_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=48, blank=True, default="")
    error_message = models.CharField(max_length=280, blank=True, default="")
    lookup_source = models.CharField(max_length=32, blank=True, default="")
    idempotency_key = models.CharField(max_length=64, blank=True, default="", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return f"HairScan({self.id}, {self.status})"


class HairAnalysis(models.Model):
    class Recommendation(models.TextChoices):
        POTENTIAL_MATCH = "POTENTIAL_MATCH", "Potential match"
        CAUTION = "CAUTION", "Caution"
        INSUFFICIENT_DATA = "INSUFFICIENT_DATA", "Insufficient data"

    scan = models.OneToOneField(HairScan, on_delete=models.CASCADE, related_name="analysis")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hair_analyses",
    )
    schema_version = models.CharField(max_length=16, default="1.0")
    algorithm_version = models.CharField(max_length=16, default="1.0")
    recommendation = models.CharField(
        max_length=24,
        choices=Recommendation.choices,
        default=Recommendation.INSUFFICIENT_DATA,
    )
    result = models.JSONField(default=dict, blank=True)
    explanation_uz = models.TextField(blank=True, default="")
    data_confidence = models.CharField(max_length=24, blank=True, default="low")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class HairAnalysisFeedback(models.Model):
    analysis = models.ForeignKey(HairAnalysis, on_delete=models.CASCADE, related_name="feedback")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    helpful = models.BooleanField(null=True)
    comment = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class HairRoutine(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hair_routines",
    )
    name = models.CharField(max_length=80, default="Asosiy")
    is_current = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]


class HairRoutineItem(models.Model):
    class Slot(models.TextChoices):
        SHAMPOO = "shampoo", "Shampoo"
        CONDITIONER = "conditioner", "Conditioner"
        MASK = "mask", "Mask"
        LEAVE_IN = "leave_in", "Leave-in"
        OTHER = "other", "Other"

    routine = models.ForeignKey(HairRoutine, on_delete=models.CASCADE, related_name="items")
    care_product = models.ForeignKey(
        "ai.CareProduct",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routine_items",
    )
    hair_product = models.ForeignKey(
        HairProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="routine_items",
    )
    slot = models.CharField(max_length=16, choices=Slot.choices, default=Slot.OTHER)
    usage_notes = models.CharField(max_length=240, blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]


class ProductComparison(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_comparisons",
    )
    title = models.CharField(max_length=120, blank=True, default="")
    product_ids = models.JSONField(default=list, blank=True)
    care_product_ids = models.JSONField(default=list, blank=True)
    result = models.JSONField(default=dict, blank=True)
    data_quality_note = models.CharField(max_length=280, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class ProductBarcode(models.Model):
    """Multiple barcode identifiers for one verified product."""

    product = models.ForeignKey(HairProduct, on_delete=models.CASCADE, related_name="barcodes")
    barcode = models.CharField(max_length=32, db_index=True)
    is_primary = models.BooleanField(default=False)
    source = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["barcode"], name="uniq_hair_product_barcode_value"),
        ]
        indexes = [
            models.Index(fields=["product", "is_primary"]),
        ]


class ProductFormula(models.Model):
    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        SUPERSEDED = "superseded", "Superseded"
        REJECTED = "rejected", "Rejected"

    product = models.ForeignKey(HairProduct, on_delete=models.CASCADE, related_name="formulas")
    formula_version = models.CharField(max_length=40, default="1")
    raw_inci = models.TextField(blank=True, default="")
    normalized_inci = models.JSONField(default=list, blank=True)
    target_market = models.CharField(max_length=40, blank=True, default="")
    source = models.CharField(max_length=64, blank=True, default="")
    effective_date = models.DateField(null=True, blank=True)
    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
        db_index=True,
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_formulas_verified",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "formula_version"],
                name="uniq_hair_product_formula_version",
            ),
        ]


class ProductSubmission(models.Model):
    """Crowdsourced product evidence — never auto-published."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SUBMITTED = "submitted", "Submitted"
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        LINKED = "linked", "Linked to candidate"
        REJECTED = "rejected", "Rejected"
        SPAM = "spam", "Spam"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_submissions",
    )
    hair_scan = models.ForeignKey(
        HairScan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_submissions",
    )
    barcode = models.CharField(max_length=32, blank=True, default="", db_index=True)
    submitted_product_name = models.CharField(max_length=160, blank=True, default="")
    submitted_brand = models.CharField(max_length=120, blank=True, default="")
    submitted_variant = models.CharField(max_length=80, blank=True, default="")
    front_image = models.ImageField(upload_to="hair-advisor/submissions/%Y/%m/", blank=True, null=True)
    back_image = models.ImageField(upload_to="hair-advisor/submissions/%Y/%m/", blank=True, null=True)
    ingredient_label_image = models.ImageField(
        upload_to="hair-advisor/submissions/%Y/%m/",
        blank=True,
        null=True,
    )
    barcode_image = models.ImageField(upload_to="hair-advisor/submissions/%Y/%m/", blank=True, null=True)
    raw_ocr_result = models.JSONField(default=dict, blank=True)
    normalized_ingredients = models.JSONField(default=list, blank=True)
    user_corrected_ingredients = models.JSONField(default=list, blank=True)
    product_size = models.CharField(max_length=40, blank=True, default="")
    claimed_country = models.CharField(max_length=80, blank=True, default="")
    observed_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=8, blank=True, default="")
    store_name = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    recognition_confidence = models.JSONField(default=dict, blank=True)
    content_fingerprint = models.CharField(max_length=64, blank=True, default="", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["barcode", "status"]),
        ]


class ProductCandidate(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        NEEDS_REVIEW = "needs_review", "Needs review"
        CONFLICT = "conflict", "Conflict"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        MERGED = "merged", "Merged"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    proposed_brand = models.CharField(max_length=120, blank=True, default="")
    proposed_product_name = models.CharField(max_length=160, blank=True, default="")
    proposed_variant = models.CharField(max_length=80, blank=True, default="")
    proposed_product_line = models.CharField(max_length=120, blank=True, default="")
    proposed_barcode = models.CharField(max_length=32, blank=True, default="", db_index=True)
    proposed_size = models.CharField(max_length=40, blank=True, default="")
    proposed_category = models.CharField(max_length=32, blank=True, default="")
    proposed_manufacturer = models.CharField(max_length=120, blank=True, default="")
    proposed_manufacturing_country = models.CharField(max_length=80, blank=True, default="")
    proposed_target_market = models.CharField(max_length=40, blank=True, default="")
    proposed_formula = models.ForeignKey(
        ProductFormula,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="candidates",
    )
    proposed_field_evidence = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    submission_count = models.PositiveIntegerField(default=0)
    duplicate_group = models.UUIDField(default=uuid.uuid4, db_index=True)
    confidence_signals = models.JSONField(default=dict, blank=True)
    conflicting_fields = models.JSONField(default=list, blank=True)
    admin_review_priority = models.PositiveSmallIntegerField(default=0, db_index=True)
    published_product = models.ForeignKey(
        HairProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="origin_candidates",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-admin_review_priority", "-updated_at"]


class CandidateSubmission(models.Model):
    candidate = models.ForeignKey(ProductCandidate, on_delete=models.CASCADE, related_name="submission_links")
    submission = models.OneToOneField(ProductSubmission, on_delete=models.CASCADE, related_name="candidate_link")
    match_stage = models.CharField(max_length=8, blank=True, default="")
    match_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "submission"],
                name="uniq_candidate_submission_pair",
            ),
        ]


class ProductVerification(models.Model):
    class Decision(models.TextChoices):
        APPROVE = "approve", "Approve"
        REJECT = "reject", "Reject"
        REQUEST_INFO = "request_info", "Request info"
        MERGE = "merge", "Merge"
        SPLIT = "split", "Split"
        LINK_EXISTING = "link_existing", "Link existing"
        FORMULA_VARIANT = "formula_variant", "Formula variation"

    candidate = models.ForeignKey(ProductCandidate, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="product_verification_reviews",
    )
    decision = models.CharField(max_length=24, choices=Decision.choices)
    evidence_reviewed = models.JSONField(default=list, blank=True)
    corrected_fields = models.JSONField(default=dict, blank=True)
    review_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class ProductPriceObservation(models.Model):
    class VerificationStatus(models.TextChoices):
        UNVERIFIED = "unverified", "Unverified"
        VERIFIED = "verified", "Verified"

    product = models.ForeignKey(HairProduct, on_delete=models.CASCADE, related_name="price_observations")
    submission = models.ForeignKey(
        ProductSubmission,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="price_observations",
    )
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="UZS")
    store_name = models.CharField(max_length=120, blank=True, default="")
    region = models.CharField(max_length=80, blank=True, default="")
    observation_date = models.DateField()
    source = models.CharField(max_length=64, blank=True, default="user_submission")
    verification_status = models.CharField(
        max_length=16,
        choices=VerificationStatus.choices,
        default=VerificationStatus.UNVERIFIED,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-observation_date", "-created_at"]
        indexes = [
            models.Index(fields=["product", "-observation_date"]),
        ]


class ProductConflict(models.Model):
    class ConflictType(models.TextChoices):
        INCI_MISMATCH = "inci_mismatch", "INCI mismatch"
        BARCODE_MISMATCH = "barcode_mismatch", "Barcode mismatch"
        METADATA = "metadata", "Metadata"
        DUPLICATE_CANDIDATE = "duplicate_candidate", "Duplicate candidate"

    candidate = models.ForeignKey(ProductCandidate, on_delete=models.CASCADE, related_name="conflicts")
    conflict_type = models.CharField(max_length=24, choices=ConflictType.choices)
    field_name = models.CharField(max_length=64, blank=True, default="")
    values = models.JSONField(default=list, blank=True)
    submission_ids = models.JSONField(default=list, blank=True)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ProductCatalogImage(models.Model):
    class ImageRole(models.TextChoices):
        FRONT = "front", "Front"
        BACK = "back", "Back"
        INGREDIENT_LABEL = "ingredient_label", "Ingredient label"
        BARCODE = "barcode", "Barcode"
        OTHER = "other", "Other"

    class Provenance(models.TextChoices):
        USER_SUBMISSION = "user_submission", "User submission"
        ADMIN_VERIFIED = "admin_verified", "Admin verified"
        MANUFACTURER = "manufacturer", "Manufacturer"

    product = models.ForeignKey(
        HairProduct,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="catalog_images",
    )
    submission = models.ForeignKey(
        ProductSubmission,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="catalog_images",
    )
    image = models.ImageField(upload_to="hair-advisor/catalog/%Y/%m/")
    role = models.CharField(max_length=24, choices=ImageRole.choices, default=ImageRole.OTHER)
    provenance = models.CharField(
        max_length=24,
        choices=Provenance.choices,
        default=Provenance.USER_SUBMISSION,
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class ProductVerificationAlert(models.Model):
    """In-app admin inbox for verification events."""

    class AlertType(models.TextChoices):
        NEW_CANDIDATE = "new_candidate", "New candidate"
        SUBMISSION_BURST = "submission_burst", "Submission burst"
        INCI_CONFLICT = "inci_conflict", "INCI conflict"
        VERIFIED_CONFLICT = "verified_conflict", "Verified product conflict"
        HIGH_PRIORITY = "high_priority", "High priority"

    alert_type = models.CharField(max_length=24, choices=AlertType.choices, db_index=True)
    candidate = models.ForeignKey(
        ProductCandidate,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="alerts",
    )
    title = models.CharField(max_length=160)
    body = models.CharField(max_length=400, blank=True, default="")
    payload = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class ProductAggregationJob(models.Model):
    """Durable queue row — survives process restart; thread is best-effort only."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    submission = models.OneToOneField(
        ProductSubmission,
        on_delete=models.CASCADE,
        related_name="aggregation_job",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.CharField(max_length=400, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]