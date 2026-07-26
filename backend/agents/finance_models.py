"""Agent hamyon — avans/komissiya/payout ledger."""

from __future__ import annotations

import uuid
from decimal import Decimal

from django.db import models


class AgentWallet(models.Model):
    agent = models.OneToOneField(
        "agents.FieldAgent",
        on_delete=models.CASCADE,
        related_name="wallet",
    )
    account_number = models.CharField(max_length=24, unique=True, db_index=True)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"AgentWallet({self.agent_id})"


class AgentLedgerEntry(models.Model):
    class EntryType(models.TextChoices):
        ADVANCE_OUT = "advance_out", "Salon avansi (chiqim)"
        COMMISSION_IN = "commission_in", "Komissiya"
        PAYOUT_OUT = "payout_out", "Payout"
        PAYOUT_REFUND = "payout_refund", "Payout qaytarildi"
        ADJUSTMENT = "adjustment", "Tuzatish"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        AgentWallet,
        on_delete=models.PROTECT,
        related_name="ledger_entries",
    )
    entry_type = models.CharField(max_length=32, choices=EntryType.choices, db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    reference_type = models.CharField(max_length=64, blank=True, default="")
    reference_id = models.CharField(max_length=64, blank=True, default="")
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    prev_hash = models.CharField(max_length=64, blank=True, default="")
    entry_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["wallet", "created_at"])]

    def save(self, *args, **kwargs):
        if self.pk and AgentLedgerEntry.objects.filter(pk=self.pk).exists():
            raise PermissionError("Ledger entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Ledger entries are immutable.")


class AgentPayout(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        PAID = "paid", "To'landi"
        FAILED = "failed", "Rad etildi"

    agent = models.ForeignKey(
        "agents.FieldAgent",
        on_delete=models.CASCADE,
        related_name="payouts",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    holder_name = models.CharField(max_length=255, blank=True, default="")
    bank_name = models.CharField(max_length=128, blank=True, default="")
    card_last4 = models.CharField(max_length=4, blank=True, default="")
    reference = models.CharField(max_length=128, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    ledger_entry_id = models.UUIDField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class AgentCommissionEvent(models.Model):
    """Audit: avans / komissiya har bir salon uchun."""

    class Kind(models.TextChoices):
        SALON_ADVANCE = "salon_advance", "Salon avansi"
        COMMISSION = "commission", "Agent komissiyasi"

    agent = models.ForeignKey(
        "agents.FieldAgent",
        on_delete=models.CASCADE,
        related_name="commission_events",
    )
    salon = models.ForeignKey(
        "salons.Salon",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agent_commission_events",
    )
    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agent_commission_events",
    )
    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    amount_uzs = models.DecimalField(max_digits=12, decimal_places=2)
    subscription_id = models.UUIDField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
