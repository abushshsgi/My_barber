from django.conf import settings
from django.db import models
from django.db.models import UniqueConstraint
from django.db.models.functions import Lower, Trim
from django.utils.text import slugify


class Salon(models.Model):
    class BusinessKind(models.TextChoices):
        BARBERSHOP = "barbershop", "Sartaroshxona"
        BEAUTY_SALON = "beauty_salon", "Go'zallik saloni"

    class SubscriptionStatus(models.TextChoices):
        NONE = "none", "Yo'q"
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Faol"
        EXPIRED = "expired", "Tugagan"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_salons",
        null=True,
        blank=True,
    )
    owner_barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="owned_salons",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="salons/covers/", blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    premium = models.BooleanField(default=False)
    languages = models.JSONField(default=list, blank=True)
    closed_weekdays = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=True)
    business_kind = models.CharField(
        max_length=16,
        choices=BusinessKind.choices,
        blank=True,
        default="",
        db_index=True,
        help_text="Sartaroshxona yoki go'zallik saloni — egasi signup tanlovi.",
    )
    referred_by_agent = models.ForeignKey(
        "agents.FieldAgent",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="referred_salons",
        db_index=True,
    )
    subscription_status = models.CharField(
        max_length=16,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.NONE,
        blank=True,
        db_index=True,
    )
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    trial_value_uzs = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            UniqueConstraint(
                Lower(Trim("name")),
                name="salon_name_unique_ci_trim",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:200] or "salon"
            slug = base
            n = 0
            while Salon.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base}-{n}"
            self.slug = slug
        super().save(*args, **kwargs)


class SalonImage(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="salons/gallery/")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]


class FavoriteSalon(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favorite_salons",
    )
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="favorited_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "salon"], name="favorite_salon_unique_user_salon")
        ]
        ordering = ["-created_at"]


class SalonHours(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="hours")
    weekday = models.PositiveSmallIntegerField()  # 0=Monday
    open_time = models.TimeField()
    close_time = models.TimeField()

    class Meta:
        unique_together = [["salon", "weekday"]]


class CatalogService(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True, default="")
    image_url = models.TextField(blank=True, default="")
    duration_minutes = models.PositiveIntegerField(default=30)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    for_barbershop = models.BooleanField(default=True, db_index=True)
    for_beauty_salon = models.BooleanField(default=False, db_index=True)
    categories = models.ManyToManyField(
        "salons.Category",
        blank=True,
        related_name="catalog_services",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:200] or "service"
            slug = base
            n = 0
            while CatalogService.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base}-{n}"
            self.slug = slug
        super().save(*args, **kwargs)


class Service(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="services")
    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="salon_services",
    )
    catalog_service = models.ForeignKey(
        "salons.CatalogService",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_salon_services",
    )
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    # Admin panel categories (M2M)
    categories = models.ManyToManyField(
        "salons.Category",
        blank=True,
        related_name="services",
    )

    class Meta:
        ordering = ["name"]


class Category(models.Model):
    """Admin-managed service categories (shared across salons + independent barbers)."""

    name = models.CharField(max_length=120, unique=True)
    icon = models.CharField(max_length=16, blank=True, default="")
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    for_barbershop = models.BooleanField(default=True, db_index=True)
    for_beauty_salon = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self) -> str:
        return self.name


class SalonMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        WORKER = "worker", "Worker"

    class InviteState(models.TextChoices):
        NA = "na", "N/A"
        INVITED = "invited", "Invited"
        WORKER_ACCEPTED = "worker_accepted", "Worker accepted"
        ACTIVE = "active", "Active"
        DECLINED = "declined", "Declined"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="salon_memberships",
        null=True,
        blank=True,
    )
    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="salon_memberships",
        null=True,
        blank=True,
    )
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=16, choices=Role.choices)
    invite_state = models.CharField(
        max_length=32,
        choices=InviteState.choices,
        default=InviteState.NA,
    )
    owner_approved = models.BooleanField(default=False)
    experience_years = models.PositiveSmallIntegerField(null=True, blank=True)
    invited_at = models.DateTimeField(null=True, blank=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    booking_mode = models.CharField(
        max_length=16,
        choices=(
            ("daily", "Har kunlik"),
            ("advance", "Oldindan"),
        ),
        default="daily",
        help_text="Salon ichidagi ishchi bron qabul qilish rejimi.",
    )
    advance_min_days = models.PositiveSmallIntegerField(default=2)
    advance_max_days = models.PositiveSmallIntegerField(default=3)

    class Meta:
        pass


class BarberWorkingHours(models.Model):
    """Per-worker schedule inside a salon (membership)."""

    membership = models.ForeignKey(
        SalonMembership,
        on_delete=models.CASCADE,
        related_name="working_hours",
    )
    weekday = models.PositiveSmallIntegerField()
    open_time = models.TimeField()
    close_time = models.TimeField()
    is_day_off = models.BooleanField(default=False)
    breaks = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = [["membership", "weekday"]]


class BarberScheduleException(models.Model):
    """Salon ichidagi ishchi uchun sana bo'yicha bir martalik jadval o'zgarishi.

    Haftalik jadvaldan ustun turadi: butun kun dam olish, maxsus ish soati yoki
    bir martalik tanaffus belgilash uchun.
    """

    membership = models.ForeignKey(
        SalonMembership,
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
        unique_together = [["membership", "date"]]
        ordering = ["date"]


class Amenity(models.Model):
    """Salon qulayliklari katalogi (Wi‑Fi, parking, ...)."""

    class Scope(models.TextChoices):
        ALL = "all", "All venues"
        SOLO_STUDIO = "solo_studio", "Solo studio / brand"
        SALON = "salon", "Multi-staff salon"

    code = models.SlugField(max_length=64, unique=True)
    icon = models.CharField(max_length=64, help_text="Lucide icon nomi")
    labels = models.JSONField(default=dict, blank=True)
    scope = models.CharField(
        max_length=16,
        choices=Scope.choices,
        default=Scope.ALL,
        db_index=True,
    )

    class Meta:
        ordering = ["code"]
        verbose_name_plural = "amenities"

    def __str__(self):
        return self.code


class SalonAmenity(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="salon_amenities")
    amenity = models.ForeignKey(Amenity, on_delete=models.CASCADE, related_name="salon_links")

    class Meta:
        unique_together = [["salon", "amenity"]]
        ordering = ["amenity__code"]
