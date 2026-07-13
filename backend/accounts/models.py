from django.contrib.auth.models import AbstractUser
from django.db import models

from .uz_regions import UzRegion


class User(AbstractUser):
    """Mijoz: telefon + OTP orqali kirish; ichki email sintetik bo'lishi mumkin."""

    class Role(models.TextChoices):
        """Faqat mijoz (mijoz app). Sartarosh — barbers.Barber; admin — AdminAccount."""

        USER = "USER", "User"

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, null=True, unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.USER, db_index=True
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    region = models.CharField(
        max_length=32,
        choices=UzRegion.choices,
        blank=True,
        default="",
        db_index=True,
    )
    birth_year = models.PositiveSmallIntegerField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    onboarding_completed = models.BooleanField(default=False, db_index=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    google_sub = models.CharField(
        max_length=64, blank=True, null=True, unique=True, db_index=True
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


class UserAddress(models.Model):
    """Mijoz saqlangan manzillari — asosiy manzil profil region/GPS bilan sinxron."""

    class Label(models.TextChoices):
        HOME = "home", "Uy"
        WORK = "work", "Ofis"
        OTHER = "other", "Boshqa"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=16, choices=Label.choices, default=Label.HOME)
    custom_label = models.CharField(max_length=64, blank=True, default="")
    address_line = models.CharField(max_length=512)
    region = models.CharField(max_length=32, choices=UzRegion.choices, db_index=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_default = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def __str__(self) -> str:
        return f"{self.user_id}: {self.address_line[:40]}"


class LaunchInterest(models.Model):
    """Viloyatda salon yo'q — foydalanuvchi talabi (tez orada Mysaloon)."""

    class Source(models.TextChoices):
        ONBOARDING = "onboarding", "Onboarding"
        ADDRESS = "address", "Manzil"
        HOME = "home", "Bosh sahifa"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="launch_interests")
    region = models.CharField(max_length=32, choices=UzRegion.choices, db_index=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    city_label = models.CharField(max_length=128, blank=True, default="")
    message = models.TextField(blank=True, default="")
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.ONBOARDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "region"], name="uniq_launch_interest_user_region"),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} @ {self.region}"


class FamilyMember(models.Model):
    """Oilaviy profil — tez bron qilish uchun yaqinlar."""

    class Relation(models.TextChoices):
        SPOUSE = "spouse", "Turmush o'rtog'i"
        CHILD = "child", "Farzand"
        PARENT = "parent", "Ota-ona"
        SIBLING = "sibling", "Aka/uka"
        OTHER = "other", "Boshqa"

    class Audience(models.TextChoices):
        MEN = "men", "Erkaklar"
        WOMEN = "women", "Ayollar"
        UNISEX = "unisex", "Hammasi"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="family_members")
    name = models.CharField(max_length=128)
    relation = models.CharField(max_length=16, choices=Relation.choices, default=Relation.OTHER)
    audience = models.CharField(max_length=16, choices=Audience.choices, default=Audience.UNISEX)
    phone = models.CharField(max_length=32, blank=True, default="")
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name", "id"]

    def __str__(self) -> str:
        return f"{self.user_id}: {self.name}"


class UserSession(models.Model):
    """Mijoz kirish sessiyasi — qurilma va refresh token jti."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    refresh_jti = models.CharField(max_length=64, blank=True, default="", db_index=True)
    device_name = models.CharField(max_length=128, blank=True, default="")
    platform = models.CharField(max_length=32, blank=True, default="")
    user_agent = models.CharField(max_length=512, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_seen_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-last_seen_at", "-id"]

    def __str__(self) -> str:
        return f"{self.user_id}: {self.device_name or self.platform}"


class AdminAccount(models.Model):
    """Platform admin login — alohida jadval; User jadvalidagi mijoz/sartarosh bilan aralashmaydi."""

    email = models.EmailField(unique=True, db_index=True)
    password = models.CharField(max_length=128)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.email

    def set_password(self, raw_password: str) -> None:
        from django.contrib.auth.hashers import make_password

        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        from django.contrib.auth.hashers import check_password

        return check_password(raw_password, self.password)
