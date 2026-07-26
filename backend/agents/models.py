from __future__ import annotations

from django.db import models


class FieldAgent(models.Model):
    """Sotuv agenti — salonlarni MySaloon ga olib kiradi (QR / kod orqali)."""

    email = models.EmailField(unique=True, db_index=True)
    password = models.CharField(max_length=128)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32, blank=True, default="")
    code = models.CharField(max_length=12, unique=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.code})"

    def set_password(self, raw_password: str) -> None:
        from django.contrib.auth.hashers import make_password

        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        from django.contrib.auth.hashers import check_password

        return check_password(raw_password, self.password)


class AgentReferralAttribution(models.Model):
    """Agent → barber/salon attribution (bir barber bir marta)."""

    agent = models.ForeignKey(
        FieldAgent,
        on_delete=models.PROTECT,
        related_name="attributions",
    )
    barber = models.OneToOneField(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="agent_attribution",
    )
    salon = models.ForeignKey(
        "salons.Salon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agent_attributions",
    )
    code_used = models.CharField(max_length=12, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    salon_attributed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.code_used} → barber#{self.barber_id}"
