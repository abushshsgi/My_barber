import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models

HISTORY_MAX_PER_USER = 6
GENERATION_HISTORY_MAX_PER_USER = 60
CHAT_THREADS_MAX_PER_USER = 40
CHAT_MESSAGES_MAX_PER_THREAD = 200


class Hairstyle(models.Model):
    class Audience(models.TextChoices):
        MEN = "men", "Men"
        WOMEN = "women", "Women"

    class Category(models.TextChoices):
        BARBER = "barber", "Barber"
        BEAUTY = "beauty", "Beauty"

    class HairLength(models.TextChoices):
        SHORT = "short", "Short"
        MEDIUM = "medium", "Medium"
        LONG = "long", "Long"

    style_id = models.CharField(max_length=64, primary_key=True)
    slug = models.CharField(max_length=64, db_index=True)
    audience = models.CharField(max_length=8, choices=Audience.choices, db_index=True)
    category = models.CharField(max_length=16, choices=Category.choices)
    title = models.CharField(max_length=120)
    title_uz = models.CharField(max_length=120)
    face_shapes = models.JSONField(default=list)
    hair_length = models.CharField(max_length=8, choices=HairLength.choices)
    image_path = models.CharField(max_length=255)
    description_uz = models.TextField(blank=True, default="")
    tags = models.JSONField(default=list)
    age_groups = models.JSONField(
        default=list,
        help_text="Mos yosh guruhlari: kids, teen, young, adult, mature",
    )
    is_published = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["audience", "sort_order", "style_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["audience", "slug"],
                name="uniq_hairstyle_audience_slug",
            ),
        ]

    def __str__(self) -> str:
        return self.style_id


class AiStyleHistoryEntry(models.Model):
    class Source(models.TextChoices):
        CAMERA_SCAN = "camera_scan", "Camera scan"
        GALLERY = "gallery", "Gallery"
        AI_ANALYSIS = "ai_analysis", "AI analysis"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_style_history",
    )
    photo = models.ImageField(upload_to="ai-style/history/%Y/%m/", blank=True, null=True)
    face_shape_key = models.CharField(max_length=16, blank=True, default="")
    hair_type_key = models.CharField(max_length=16, blank=True, default="")
    hair_color_key = models.CharField(max_length=16, blank=True, default="")
    hair_texture_key = models.CharField(max_length=16, blank=True, default="")
    beard_key = models.CharField(max_length=16, blank=True, default="")
    source = models.CharField(max_length=16, choices=Source.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"AiStyleHistory({self.user_id}, {self.source}, {self.created_at})"


class AiGenerationUsage(models.Model):
    """Morph AI (AI Style / try-on) — har bir generatsiya/token/xarajat yozuvi."""

    class Kind(models.TextChoices):
        TRYON = "tryon", "Try-on"
        ANALYZE = "analyze", "Style analyze"
        FACE_CHECK = "face_check", "Face check"
        STUDIO = "studio", "Studio edit"
        INGREDIENT = "ingredient", "Ingredient scan"
        CHAT = "chat", "Morf AI chat"
        VOICE_STT = "voice_stt", "Morf AI voice STT"
        VOICE_TTS = "voice_tts", "Morf AI voice TTS"

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_generations",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices, db_index=True)
    status = models.CharField(max_length=16, choices=Status.choices, db_index=True)
    prompt = models.TextField(blank=True, default="")
    style_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    style_title = models.CharField(max_length=120, blank=True, default="")
    model = models.CharField(max_length=80, blank=True, default="")
    provider = models.CharField(max_length=32, blank=True, default="")
    job_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    prompt_tokens = models.PositiveIntegerField(default=0)
    candidates_tokens = models.PositiveIntegerField(default=0)
    thoughts_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=12, decimal_places=6, default=Decimal("0"))
    tokens_estimated = models.BooleanField(default=False)
    latency_ms = models.PositiveIntegerField(default=0)
    error_detail = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["kind", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"AiGeneration({self.kind}, {self.status}, user={self.user_id})"


class MorphAiSettings(models.Model):
    """Singleton — Morph AI limit, byudjet, prompt va A/B sozlamalari."""

    daily_tryon_limit_per_user = models.PositiveIntegerField(
        default=20,
        help_text="0 = cheklov yo'q. User uchun kunlik try-on limiti.",
    )
    daily_analyze_limit_per_user = models.PositiveIntegerField(
        default=30,
        help_text="0 = cheklov yo'q.",
    )
    daily_budget_usd = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("50"),
        help_text="0 = byudjet cheklovi yo'q. Kunlik soft-cap (USD).",
    )
    budget_enforce = models.BooleanField(
        default=False,
        help_text="True bo'lsa byudjet yetganda yangi generatsiya to'xtatiladi.",
    )
    alert_success_rate_below = models.PositiveSmallIntegerField(
        default=80,
        help_text="Success rate shu foizdan past bo'lsa ogohlantirish.",
    )
    tryon_enabled = models.BooleanField(default=True)
    analyze_enabled = models.BooleanField(default=True)
    custom_tryon_prompt = models.TextField(
        blank=True,
        default="",
        help_text="Bo'sh bo'lsa default prompt ishlatiladi.",
    )
    custom_tryon_prompt_b = models.TextField(
        blank=True,
        default="",
        help_text="A/B variant B prompti.",
    )
    ab_enabled = models.BooleanField(default=False)
    ab_traffic_percent_b = models.PositiveSmallIntegerField(
        default=50,
        help_text="0–100. Variant B ga yo'naltiriladigan so'rovlar foizi.",
    )
    preferred_model = models.CharField(
        max_length=80,
        blank=True,
        default="",
        help_text="Bo'sh = env / Django settings modeli.",
    )
    gallery_public = models.BooleanField(
        default=False,
        help_text="Admin galleryda faqat opt-in tarix (hozir history yozuvlari).",
    )
    referral_generation_enabled = models.BooleanField(
        default=True,
        help_text="True bo'lsa 1 referal = 1 Morph AI generatsiya krediti ishlaydi va UI da ko'rinadi.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Morph AI settings"
        verbose_name_plural = "Morph AI settings"

    def __str__(self) -> str:
        return "Morph AI settings"

    @classmethod
    def load(cls) -> "MorphAiSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class MorphAiLookShare(models.Model):
    """Public shareable Morf AI before/after look (viral link)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="morph_look_shares",
    )
    style_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    title = models.CharField(max_length=160, blank=True, default="")
    before_photo = models.ImageField(
        upload_to="ai-style/shares/%Y/%m/",
        blank=True,
        null=True,
    )
    after_photo = models.ImageField(upload_to="ai-style/shares/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    view_count = models.PositiveIntegerField(default=0)
    last_viewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"MorphAiLookShare({self.id}, {self.style_id})"


class MorphAiGenerationEntry(models.Model):
    """User try-on / studio result history (before + after) — media via DB storage."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="morph_generations",
    )
    style_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    title = models.CharField(max_length=160, blank=True, default="")
    persona_id = models.CharField(max_length=64, blank=True, default="")
    before_photo = models.ImageField(
        upload_to="ai-style/generations/%Y/%m/",
        blank=True,
        null=True,
    )
    after_photo = models.ImageField(upload_to="ai-style/generations/%Y/%m/")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "-created_at"],
                name="ai_morphgen_user_created_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"MorphAiGeneration({self.user_id}, {self.style_id}, {self.created_at})"


class MorphAiChatThread(models.Model):
    """Morf AI chatbot suhbat (client_id = mobil/local thread id)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="morph_chat_threads",
    )
    client_id = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=200, blank=True, default="")
    preview = models.CharField(max_length=280, blank=True, default="")
    context = models.JSONField(default=dict, blank=True)
    message_count = models.PositiveIntegerField(default=0)
    total_prompt_tokens = models.PositiveIntegerField(default=0)
    total_candidates_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    total_cost_usd = models.DecimalField(max_digits=12, decimal_places=6, default=Decimal("0"))
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "client_id"],
                name="uniq_morph_chat_thread_user_client",
            ),
        ]
        indexes = [
            models.Index(
                fields=["user", "-updated_at"],
                name="ai_morphchat_user_upd_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"MorphAiChatThread({self.user_id}, {self.client_id})"


class MorphAiChatMessage(models.Model):
    """Morf AI chatbot xabari — to'liq transcript admin va sync uchun."""

    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    thread = models.ForeignKey(
        MorphAiChatThread,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    client_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    role = models.CharField(max_length=16, choices=Role.choices, db_index=True)
    content = models.TextField()
    context = models.JSONField(default=dict, blank=True)
    prompt_tokens = models.PositiveIntegerField(default=0)
    candidates_tokens = models.PositiveIntegerField(default=0)
    thoughts_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    cost_usd = models.DecimalField(max_digits=12, decimal_places=6, default=Decimal("0"))
    model = models.CharField(max_length=80, blank=True, default="")
    provider = models.CharField(max_length=32, blank=True, default="")
    usage = models.ForeignKey(
        AiGenerationUsage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_messages",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["thread", "created_at"],
                name="ai_morphchat_msg_thread_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"MorphAiChatMessage({self.thread_id}, {self.role})"


class MorphAiUserPrefs(models.Model):
    """Foydalanuvchi Morph AI maxfiylik va limit sozlamalari."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="morph_ai_prefs",
    )
    privacy_local_only = models.BooleanField(
        default=False,
        help_text="True bo'lsa chat tarixi serverga yozilmaydi va Gemini ga yuborilmaydi.",
    )
    save_chat_history = models.BooleanField(default=True)
    persist_looks = models.BooleanField(
        default=True,
        help_text="False bo'lsa try-on/studio/selfie tarixi serverga yozilmaydi.",
    )
    limit_notify = models.BooleanField(default=True)
    use_tryon_context = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Morph AI user prefs"
        verbose_name_plural = "Morph AI user prefs"

    def __str__(self) -> str:
        return f"MorphAiUserPrefs({self.user_id})"


class Gs1CountryCode(models.Model):
    """GS1 barcode prefiksi → davlat. 114 ta kod seed qilinadi."""

    prefix_label = models.CharField(max_length=16, unique=True, db_index=True)
    country_name = models.CharField(max_length=80)
    prefix_start = models.PositiveSmallIntegerField(db_index=True)
    prefix_end = models.PositiveSmallIntegerField(db_index=True)

    class Meta:
        ordering = ["prefix_start", "prefix_end"]
        indexes = [
            models.Index(fields=["prefix_start", "prefix_end"]),
        ]
        verbose_name = "GS1 country code"
        verbose_name_plural = "GS1 country codes"

    def __str__(self) -> str:
        return f"{self.prefix_label} — {self.country_name}"


class CareProduct(models.Model):
    """Admin kiritadigan soch parvarishi mahsuloti — user katalogida ko'rinadi."""

    class Category(models.TextChoices):
        SHAMPOO = "shampoo", "Shampun"
        BALSAM = "balsam", "Balzam"
        CONDITIONER = "conditioner", "Konditsioner"
        MASK = "mask", "Maska"
        SERUM = "serum", "Sarum"
        OIL = "oil", "Yog'"
        SPRAY = "spray", "Sprey"
        OTHER = "other", "Boshqa"

    class Audience(models.TextChoices):
        MEN = "men", "Men"
        WOMEN = "women", "Women"
        UNISEX = "unisex", "Unisex"

    name = models.CharField(max_length=160)
    brand = models.CharField(max_length=120, blank=True, default="")
    slug = models.SlugField(max_length=180, unique=True, db_index=True)
    category = models.CharField(
        max_length=16,
        choices=Category.choices,
        default=Category.SHAMPOO,
        db_index=True,
    )
    audience = models.CharField(
        max_length=8,
        choices=Audience.choices,
        default=Audience.UNISEX,
        db_index=True,
    )
    barcode = models.CharField(
        max_length=32,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="GS1 / EAN / UPC raqami (faqat raqamlar).",
    )
    country_of_origin = models.CharField(max_length=80, blank=True, default="")
    country_code_prefix = models.CharField(max_length=16, blank=True, default="")
    is_verified = models.BooleanField(default=True)
    image = models.ImageField(upload_to="care/products/%Y/%m/", blank=True, null=True)
    external_image_url = models.URLField(max_length=500, blank=True, default="")
    ingredients_text = models.TextField(blank=True, default="")
    ingredients = models.JSONField(default=list, blank=True)
    usage_uz = models.TextField(blank=True, default="")
    purpose_uz = models.TextField(blank=True, default="")
    suitable_for = models.JSONField(default=list, blank=True)
    not_suitable_for = models.JSONField(default=list, blank=True)
    scalp_types = models.JSONField(default=list, blank=True)
    concerns = models.JSONField(default=list, blank=True)
    pros_uz = models.TextField(blank=True, default="")
    cons_uz = models.TextField(blank=True, default="")
    warnings_uz = models.TextField(blank=True, default="")
    is_published = models.BooleanField(default=True, db_index=True)
    views_count = models.PositiveIntegerField(default=0)
    clicks_count = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_products_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["is_published", "category", "sort_order"]),
        ]

    def __str__(self) -> str:
        return f"{self.brand} {self.name}".strip() or self.slug


class CareProductInsight(models.Model):
    """User mahsulotni ko'rdi / ochdi — unique auditoriya."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_product_insights",
    )
    product = models.ForeignKey(
        CareProduct,
        on_delete=models.CASCADE,
        related_name="insights",
    )
    views = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="uniq_care_product_insight_user_product",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "-last_seen_at"]),
            models.Index(fields=["user", "-last_seen_at"]),
        ]

    def __str__(self) -> str:
        return f"CareProductInsight(user={self.user_id}, product={self.product_id})"


class CareProductLike(models.Model):
    """Userning CareProduct like'i — public count + admin audit."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_product_likes",
    )
    product = models.ForeignKey(
        CareProduct,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="uniq_care_product_like_user_product",
            ),
        ]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"CareProductLike(user={self.user_id}, product={self.product_id})"


class CareUserProduct(models.Model):
    """Foydalanuvchi «Mening mahsulotlarim» — DB + admin audit."""

    class Source(models.TextChoices):
        SCAN = "scan", "Scan"
        CATALOG = "catalog", "Catalog"
        RECOMMENDED = "recommended", "Recommended"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_user_products",
    )
    product = models.ForeignKey(
        CareProduct,
        on_delete=models.CASCADE,
        related_name="user_saves",
    )
    source = models.CharField(
        max_length=16,
        choices=Source.choices,
        default=Source.CATALOG,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"],
                name="uniq_care_user_product_user_product",
            ),
        ]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["product", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"CareUserProduct(user={self.user_id}, product={self.product_id})"


class CareShelfItem(models.Model):
    """Parvarish vositasi lifecycle tracking (tugash + PAO muddati)."""

    class Category(models.TextChoices):
        HAIR = "hair", "Soch"
        FACE = "face", "Yuz"
        SCALP = "scalp", "Bosh terisi"
        BEARD = "beard", "Soqol"
        OTHER = "other", "Boshqa"

    PAO_CHOICES = (
        (3, "3M"),
        (6, "6M"),
        (12, "12M"),
        (24, "24M"),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_shelf_items",
    )
    product = models.ForeignKey(
        CareProduct,
        on_delete=models.SET_NULL,
        related_name="shelf_items",
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=120)
    brand = models.CharField(max_length=80, blank=True, default="")
    category = models.CharField(max_length=16, choices=Category.choices, default=Category.HAIR)
    volume_ml = models.PositiveIntegerField(default=100)
    usage_frequency = models.CharField(max_length=48, default="kuniga_1")
    uses_per_day = models.FloatField(default=1.0)
    dose_ml_per_use = models.FloatField(default=1.0)
    opened_at = models.DateField()
    pao_months = models.PositiveSmallIntegerField(choices=PAO_CHOICES, default=12)
    ai_advice = models.CharField(max_length=240, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user", "-updated_at"]),
            models.Index(fields=["user", "opened_at"]),
            models.Index(fields=["user", "pao_months"]),
        ]

    def __str__(self) -> str:
        return f"CareShelfItem(user={self.user_id}, name={self.name})"


class HairCareProfile(models.Model):
    """Mijoz soch profili — parvarish reja va INCI skani uchun."""

    class Condition(models.TextChoices):
        OILY = "oily", "Oily"
        DRY = "dry", "Dry"
        NORMAL = "normal", "Normal"
        DAMAGED = "damaged", "Damaged"

    class Texture(models.TextChoices):
        STRAIGHT = "straight", "Straight"
        WAVY = "wavy", "Wavy"
        CURLY = "curly", "Curly"

    class ColorStatus(models.TextChoices):
        NATURAL = "natural", "Natural"
        COLORED = "colored", "Colored"
        BLEACHED = "bleached", "Bleached"

    class Scalp(models.TextChoices):
        OILY = "oily", "Oily"
        DRY = "dry", "Dry"
        NORMAL = "normal", "Normal"
        SENSITIVE = "sensitive", "Sensitive"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hair_care_profile",
    )
    condition = models.CharField(
        max_length=16, choices=Condition.choices, blank=True, default=""
    )
    texture = models.CharField(
        max_length=16, choices=Texture.choices, blank=True, default=""
    )
    color_status = models.CharField(
        max_length=16, choices=ColorStatus.choices, blank=True, default=""
    )
    scalp = models.CharField(
        max_length=16, choices=Scalp.choices, blank=True, default=""
    )
    concerns = models.JSONField(default=list, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"HairCareProfile(user={self.user_id}, {self.condition})"

    @property
    def is_complete(self) -> bool:
        return bool(self.condition and self.texture and self.color_status)

    def profile_label(self, gender: str = "") -> str:
        cond = self.get_condition_display() if self.condition else "Unknown"
        tex = self.get_texture_display() if self.texture else "Unknown"
        color = self.get_color_status_display() if self.color_status else "Unknown"
        scalp = self.get_scalp_display() if self.scalp else "Unknown"
        raw_concerns = self.concerns if isinstance(self.concerns, list) else []
        concerns = ", ".join(str(x) for x in raw_concerns if str(x).strip()) or "none"
        g = (gender or "").strip().lower()
        gender_line = ""
        if g in ("male", "female"):
            gender_line = f"User gender: {'male' if g == 'male' else 'female'}\n"
        return (
            f"{gender_line}"
            f"Hair condition: {cond}\n"
            f"Hair texture: {tex}\n"
            f"Color status: {color}\n"
            f"Scalp: {scalp}\n"
            f"Concerns: {concerns}"
        )

    def tag_set(self) -> set[str]:
        tags = {self.condition, self.texture, self.color_status}
        return {t for t in tags if t}


class IngredientScanEntry(models.Model):
    """User mahsulot tarkibi skani — audit va moslash tarixi."""

    class Verdict(models.TextChoices):
        GOOD = "good", "Good"
        CAUTION = "caution", "Caution"
        BAD = "bad", "Bad"
        DANGEROUS = "dangerous", "Dangerous"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ingredient_scans",
    )
    photo = models.ImageField(
        upload_to="care/scans/%Y/%m/", blank=True, null=True
    )
    extracted_name = models.CharField(max_length=160, blank=True, default="")
    ingredients = models.JSONField(default=list, blank=True)
    matched_product = models.ForeignKey(
        CareProduct,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scans",
    )
    verdict = models.CharField(
        max_length=16, choices=Verdict.choices, default=Verdict.CAUTION, db_index=True
    )
    safety_score = models.PositiveSmallIntegerField(default=0)
    result = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["verdict", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"IngredientScan({self.user_id}, {self.verdict})"
