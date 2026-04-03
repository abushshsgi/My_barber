from django.conf import settings
from django.db import models


class BarberProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="barber_profile",
    )
    location_text = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"BarberProfile({self.user_id})"


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
    """Independent barber schedule (no salon)."""

    profile = models.ForeignKey(
        BarberProfile,
        on_delete=models.CASCADE,
        related_name="working_hours",
    )
    weekday = models.PositiveSmallIntegerField()  # 0=Monday
    open_time = models.TimeField()
    close_time = models.TimeField()
    is_day_off = models.BooleanField(default=False)

    class Meta:
        unique_together = [["profile", "weekday"]]
        ordering = ["weekday"]

