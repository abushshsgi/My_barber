from django.conf import settings
from django.db import models


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="customer_bookings",
    )
    salon = models.ForeignKey(
        "salons.Salon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="barber_bookings",
    )
    start_at = models.DateTimeField(db_index=True)
    end_at = models.DateTimeField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    customer_phone = models.CharField(max_length=32, blank=True, default="")
    reminder_1h_sent = models.BooleanField(default=False)
    appointment_reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Barber xizmatni boshlagan vaqt (taymer uchun).",
    )

    class Meta:
        ordering = ["-start_at"]
        indexes = [
            models.Index(fields=["barber", "start_at", "end_at"]),
        ]

    def __str__(self):
        return f"Booking {self.pk} {self.status}"


class BookingLine(models.Model):
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    barber_service = models.ForeignKey(
        "barbers.BarberService",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    service = models.ForeignKey(
        "salons.Service",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    service_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()


class BookingCompletion(models.Model):
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="completion",
    )
    result_image = models.ImageField(upload_to="completions/", blank=True, null=True)
    portfolio_allowed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(auto_now_add=True)
    actual_end_at = models.DateTimeField(null=True, blank=True)


class Review(models.Model):
    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name="review",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_written",
    )
    salon = models.ForeignKey(
        "salons.Salon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
    )
    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="reviews_about",
    )
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True)
    photo = models.ImageField(upload_to="reviews/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
