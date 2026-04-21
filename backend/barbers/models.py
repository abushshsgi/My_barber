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
    onboarding_completed_at = models.DateTimeField(null=True, blank=True)
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
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
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
