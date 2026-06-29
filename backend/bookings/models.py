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

    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        ONLINE = "online", "Online"

    class PaymentStatus(models.TextChoices):
        NOT_APPLICABLE = "not_applicable", "N/A"
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        REFUNDED = "refunded", "Refunded"

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
    payment_method = models.CharField(
        max_length=16,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        db_index=True,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.NOT_APPLICABLE,
        db_index=True,
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    customer_phone = models.CharField(max_length=32, blank=True, default="")
    reminder_1h_sent = models.BooleanField(default=False)
    appointment_reminder_sent = models.BooleanField(default=False)
    family_member = models.ForeignKey(
        "accounts.FamilyMember",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Barber xizmatni boshlagan vaqt (taymer uchun).",
    )
    checked_in_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Mijoz kelgan vaqt (barber check-in).",
    )
    portfolio_consent = models.BooleanField(
        null=True,
        blank=True,
        help_text="Mijoz portfolio uchun rasmga ruxsat berishi (null = hali javob bermagan).",
    )
    order_number = models.CharField(
        max_length=32,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Support uchun doimiy buyurtma raqami (MS-YYYYMMDD-XXXX).",
    )
    check_in_token = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Mijoz QR kodi uchun maxfiy token. Bir marta ishlatiladi.",
    )
    check_in_short_code = models.CharField(
        max_length=12,
        null=True,
        blank=True,
        help_text="Qo'lda kiritish uchun qisqa kod (token bilan birga).",
    )
    check_in_token_issued_at = models.DateTimeField(null=True, blank=True)
    check_in_token_used_at = models.DateTimeField(null=True, blank=True)

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
    # `rating` — sartarosh uchun umumiy baho (eski mantiq saqlanadi).
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True)
    # Salon uchun alohida umumiy baho va izoh (Yandex Go uslubidagi so'rovnoma).
    salon_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    salon_text = models.TextField(blank=True, default="")
    photo = models.ImageField(upload_to="reviews/", blank=True, null=True)
    barber_reply = models.TextField(blank=True, default="")
    barber_replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class ReviewDimensionScore(models.Model):
    """So'rovnoma o'lchovlari: sartarosh xushmuomalaligi, salon tozaligi va h.k."""

    class Target(models.TextChoices):
        BARBER = "barber", "Barber"
        SALON = "salon", "Salon"

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="dimensions",
    )
    target = models.CharField(max_length=10, choices=Target.choices)
    dimension = models.CharField(max_length=32)
    score = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ("review", "target", "dimension")
        indexes = [
            models.Index(fields=["target", "dimension"]),
        ]

    def __str__(self):
        return f"{self.target}:{self.dimension}={self.score}"
