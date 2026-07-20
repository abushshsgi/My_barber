from django.conf import settings
from django.db import models

from accounts.uz_regions import UzRegion


class Barber(models.Model):
    """
    Sartarosh akkaunti — User (mijoz) jadvalidan mustaqil.
    Login / parol faqat shu jadvalda; API orqali mijoz bilan bog‘lanadi (booking va hokazo).
    """

    class WorkMode(models.TextChoices):
        """Salon asosidagi yoki salonsiz (mustaqil) ish rejimi — UI va analitika uchun."""

        SALON = "salon", "Salon"
        INDEPENDENT = "independent", "Independent"

    class OnboardingFlow(models.TextChoices):
        OWNER = "owner", "Owner"
        EMPLOYEE = "employee", "Employee"
        MYBARBER = "mybarber", "MyBarber"
        INDEPENDENT = "independent", "Independent"

    class BusinessKind(models.TextChoices):
        BARBERSHOP = "barbershop", "Sartaroshxona"
        BEAUTY_SALON = "beauty_salon", "Go'zallik saloni"

    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=32, blank=True, null=True, unique=True)
    avatar = models.ImageField(upload_to="barbers/avatars/", blank=True, null=True)
    region = models.CharField(
        max_length=32,
        choices=UzRegion.choices,
        blank=True,
        default="",
        db_index=True,
    )
    work_mode = models.CharField(
        max_length=16,
        choices=WorkMode.choices,
        default=WorkMode.SALON,
        db_index=True,
    )
    onboarding_flow = models.CharField(
        max_length=16,
        choices=OnboardingFlow.choices,
        blank=True,
        default="",
        db_index=True,
    )
    business_kind = models.CharField(
        max_length=16,
        choices=BusinessKind.choices,
        blank=True,
        default="",
        db_index=True,
        help_text="Sartaroshxona yoki go'zallik saloni — signup birinchi savoli.",
    )
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
    email_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Email tasdiqlangan vaqt. Mijozlarga ko‘rinish va to‘liq panel uchun talab.",
    )
    email_verification_invite_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Tasdiq havolasi avtomatik yuborilgan vaqt (profil sozlamalari tugaganida, bir marta).",
    )
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return self.email

    def set_password(self, raw_password: str) -> None:
        from django.contrib.auth.hashers import make_password

        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        from django.contrib.auth.hashers import check_password

        return check_password(raw_password, self.password)


class BarberProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="barber_profile",
        null=True,
        blank=True,
    )
    barber = models.OneToOneField(
        Barber,
        on_delete=models.CASCADE,
        related_name="profile",
        null=True,
        blank=True,
    )
    location_text = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    # Mijoz bilan muloqot tillari (masalan: ["uz","ru"]) — salon tillaridan mustaqil.
    spoken_languages = models.JSONField(default=list, blank=True)
    work_location_type = models.CharField(
        max_length=16,
        blank=True,
        default="",
        help_text="Mustaqil usta: studio | home | mobile",
    )
    payment_methods = models.JSONField(
        default=list,
        blank=True,
        help_text="Mustaqil usta to'lov usullari: cash, card, payme, ...",
    )
    class BookingMode(models.TextChoices):
        DAILY = "daily", "Har kunlik"
        ADVANCE = "advance", "Oldindan"

    booking_mode = models.CharField(
        max_length=16,
        choices=BookingMode.choices,
        default=BookingMode.DAILY,
        help_text="daily — bugundan bron; advance — faqat N kun oldindan.",
    )
    advance_min_days = models.PositiveSmallIntegerField(
        default=2,
        help_text="Oldindan rejimda: eng kamida necha kun oldin bron qilish mumkin.",
    )
    advance_max_days = models.PositiveSmallIntegerField(
        default=3,
        help_text="Oldindan rejimda: eng ko'pi bilan necha kun oldin bron qilish mumkin.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"BarberProfile({self.barber_id})"


class BarberWorkPhoto(models.Model):
    profile = models.ForeignKey(
        BarberProfile,
        on_delete=models.CASCADE,
        related_name="work_photos",
    )
    image = models.ImageField(upload_to="barbers/work_photos/")
    title = models.CharField(max_length=255, blank=True, default="")
    service_name = models.CharField(max_length=255, blank=True, default="")
    likes = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]


class BarberService(models.Model):
    profile = models.ForeignKey(
        BarberProfile,
        on_delete=models.CASCADE,
        related_name="services",
    )
    catalog_service = models.ForeignKey(
        "salons.CatalogService",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_barber_services",
    )
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    categories = models.ManyToManyField(
        "salons.Category",
        blank=True,
        related_name="barber_services",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class BarberWorkingHours(models.Model):
    """Mustaqil sartarosh jadvali (salonsiz)."""

    profile = models.ForeignKey(
        BarberProfile,
        on_delete=models.CASCADE,
        related_name="working_hours",
    )
    weekday = models.PositiveSmallIntegerField()  # 0=Monday
    open_time = models.TimeField()
    close_time = models.TimeField()
    is_day_off = models.BooleanField(default=False)
    # [{"start": "12:00", "end": "13:00"}, ...] — tushlik / tanaffus oralig‘lari
    breaks = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = [["profile", "weekday"]]
        ordering = ["weekday"]


class BarberScheduleException(models.Model):
    """Sana bo'yicha bir martalik jadval o'zgarishi (mustaqil sartarosh).

    Haftalik jadvaldan ustun turadi: butun kun dam olish, maxsus ish soati yoki
    bir martalik tanaffus (tushlik / ishi chiqib qolgan vaqt) belgilash uchun.
    """

    profile = models.ForeignKey(
        BarberProfile,
        on_delete=models.CASCADE,
        related_name="schedule_exceptions",
    )
    date = models.DateField()
    is_day_off = models.BooleanField(default=False)
    open_time = models.TimeField(null=True, blank=True)
    close_time = models.TimeField(null=True, blank=True)
    breaks = models.JSONField(default=list, blank=True)
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["profile", "date"]]
        ordering = ["date"]


class BarberInventoryItem(models.Model):
    class Category(models.TextChoices):
        TOOL = "tool", "Tool"
        PRODUCT = "product", "Product"
        CONSUMABLE = "consumable", "Consumable"

    barber = models.ForeignKey(
        Barber,
        on_delete=models.CASCADE,
        related_name="inventory_items",
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=16, choices=Category.choices)
    stock = models.IntegerField(default=0)
    min_stock = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=32, default="dona")
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    supplier = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]


class BarberInventoryMovement(models.Model):
    item = models.ForeignKey(
        BarberInventoryItem,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    delta = models.IntegerField()
    note = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class BarberExpense(models.Model):
    class Category(models.TextChoices):
        RENT = "rent", "Rent"
        SUPPLIES = "supplies", "Supplies"
        MARKETING = "marketing", "Marketing"
        UTILITY = "utility", "Utility"
        SALARY = "salary", "Salary"
        OTHER = "other", "Other"

    barber = models.ForeignKey(
        Barber,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    category = models.CharField(max_length=16, choices=Category.choices)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    spent_on = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-spent_on", "-id"]


class BarberGoal(models.Model):
    barber = models.ForeignKey(
        Barber,
        on_delete=models.CASCADE,
        related_name="goals",
    )
    title = models.CharField(max_length=255)
    target = models.DecimalField(max_digits=12, decimal_places=2)
    current = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=32, default="ta")
    deadline = models.DateField()
    done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["done", "deadline", "-id"]


class BarberPromo(models.Model):
    barber = models.ForeignKey(
        Barber,
        on_delete=models.CASCADE,
        related_name="promos",
    )
    code = models.CharField(max_length=64)
    description = models.CharField(max_length=255, blank=True, default="")
    discount_pct = models.PositiveSmallIntegerField(default=0)
    uses = models.PositiveIntegerField(default=0)
    max_uses = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    expires = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [["barber", "code"]]


class BarberSetting(models.Model):
    class Language(models.TextChoices):
        UZ = "uz", "Uzbek"
        RU = "ru", "Russian"
        EN = "en", "English"

    class Theme(models.TextChoices):
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"

    barber = models.OneToOneField(
        Barber,
        on_delete=models.CASCADE,
        related_name="settings",
    )
    notifications_email = models.BooleanField(default=True)
    notifications_push = models.BooleanField(default=True)
    notifications_sms = models.BooleanField(default=False)
    auto_accept = models.BooleanField(default=False)
    language = models.CharField(max_length=8, choices=Language.choices, default=Language.UZ)
    theme = models.CharField(max_length=8, choices=Theme.choices, default=Theme.LIGHT)
    payout_holder_name = models.CharField(max_length=120, blank=True, default="")
    payout_bank_name = models.CharField(max_length=120, blank=True, default="")
    payout_account_last4 = models.CharField(max_length=4, blank=True, default="")
    payout_account_encrypted = models.CharField(max_length=64, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)


class BarberPromotion(models.Model):
    class Type(models.TextChoices):
        TOP_LISTING = "top_listing", "Top listing"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        CANCELLED = "cancelled", "Cancelled"

    barber = models.ForeignKey(
        Barber,
        on_delete=models.CASCADE,
        related_name="promotions",
    )
    promotion_type = models.CharField(max_length=32, choices=Type.choices, db_index=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField(db_index=True)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    region = models.CharField(max_length=32, blank=True, default="", db_index=True)
    notes = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class BarberSupportTicket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        CLOSED = "closed", "Closed"

    barber = models.ForeignKey(
        Barber,
        on_delete=models.CASCADE,
        related_name="barber_support_tickets",
    )
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class BarberSignupSnapshot(models.Model):
    """
    Barber ro‘yxatdan o‘tish paytidagi (signup) ma’lumotlarining snapshot’i.
    Admin panelda tekshirish va support uchun ishlatiladi.
    """

    barber = models.OneToOneField(
        Barber,
        on_delete=models.CASCADE,
        related_name="signup_snapshot",
    )

    has_salon = models.BooleanField(default=False)
    shop_name = models.CharField(max_length=255, blank=True, default="")
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    address = models.CharField(max_length=255, blank=True, default="")
    staff_count_at_signup = models.PositiveSmallIntegerField(null=True, blank=True)

    # Keep whatever frontend/backend sent at signup time (future-proof).
    raw_payload = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"BarberSignupSnapshot({self.barber_id})"
