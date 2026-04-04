from django.contrib.auth.models import AbstractUser
from django.db import models

from .uz_regions import UzRegion


class User(AbstractUser):
    """Custom user: email login; optional phone."""

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

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


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


class BarberApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="barber_application",
        null=True,
        blank=True,
    )
    barber = models.OneToOneField(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="barber_application",
        null=True,
        blank=True,
    )
    shop_name = models.CharField(max_length=255)
    age = models.PositiveSmallIntegerField()
    region = models.CharField(max_length=64)
    address = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    staff_count_at_signup = models.PositiveSmallIntegerField(default=1)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.shop_name} ({self.status})"
