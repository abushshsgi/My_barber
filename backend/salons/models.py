from django.conf import settings
from django.db import models
from django.db.models import UniqueConstraint
from django.db.models.functions import Lower, Trim
from django.utils.text import slugify


class Salon(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_salons",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="salons/covers/", blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.TextField(blank=True)
    premium = models.BooleanField(default=False)
    languages = models.JSONField(default=list, blank=True)
    closed_weekdays = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=True)
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


class SalonHours(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="hours")
    weekday = models.PositiveSmallIntegerField()  # 0=Monday
    open_time = models.TimeField()
    close_time = models.TimeField()

    class Meta:
        unique_together = [["salon", "weekday"]]


class Service(models.Model):
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, related_name="services")
    barber = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="barber_services",
    )
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]


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

    class Meta:
        unique_together = [["user", "salon"]]


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

    class Meta:
        unique_together = [["membership", "weekday"]]
