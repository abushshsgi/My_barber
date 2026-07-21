import uuid

from django.conf import settings
from django.db import models


class Wallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet",
    )
    wallet_number = models.CharField(max_length=19, unique=True, db_index=True)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.wallet_number} ({self.user_id})"


class WalletCard(models.Model):
    wallet = models.OneToOneField(
        Wallet,
        on_delete=models.CASCADE,
        related_name="card",
    )
    cardholder_name = models.CharField(max_length=255)
    card_display = models.CharField(max_length=32)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.card_display} — {self.cardholder_name}"


class LedgerEntry(models.Model):
    class EntryType(models.TextChoices):
        TOPUP = "topup", "Top-up"
        GIFT_OUT = "gift_out", "Gift sent"
        GIFT_IN = "gift_in", "Gift received"
        GIFT_DESIGN_FEE = "gift_design_fee", "Gift card design fee"
        BOOKING_PAY = "booking_pay", "Booking payment"
        SUBSCRIPTION = "subscription", "Subscription"
        REFUND = "refund", "Refund"
        ADJUSTMENT = "adjustment", "Adjustment"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name="ledger_entries",
    )
    entry_type = models.CharField(max_length=32, choices=EntryType.choices, db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    reference_type = models.CharField(max_length=64, blank=True, default="")
    reference_id = models.CharField(max_length=64, blank=True, default="")
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    prev_hash = models.CharField(max_length=64)
    entry_hash = models.CharField(max_length=64, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["wallet", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and LedgerEntry.objects.filter(pk=self.pk).exists():
            raise PermissionError("Ledger entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Ledger entries are immutable.")

    def __str__(self) -> str:
        return f"{self.entry_type} {self.amount} ({self.wallet_id})"


class GiftTransfer(models.Model):
    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender_wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name="gifts_sent",
    )
    recipient_wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name="gifts_received",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)  # qabul qiluvchiga
    design_id = models.CharField(max_length=32, blank=True, default="", db_index=True)
    design_fee = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_charged = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    message = models.TextField(blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True,
    )
    sender_entry = models.ForeignKey(
        LedgerEntry,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="gift_as_sender",
    )
    recipient_entry = models.ForeignKey(
        LedgerEntry,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="gift_as_recipient",
    )
    design_fee_entry = models.ForeignKey(
        LedgerEntry,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="gift_as_design_fee",
    )
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Gift {self.amount} {self.sender_wallet_id} → {self.recipient_wallet_id}"


class ManualCardDeposit(models.Model):
    """Karta orqali to'ldirish — foydalanuvchi kompaniya kartasiga o'tkazadi, admin tasdiqlaydi."""

    class Status(models.TextChoices):
        AWAITING_PAYMENT = "awaiting_payment", "To'lov kutilmoqda"
        CLAIMED = "claimed", "To'ladim deb yuborildi"
        APPROVED = "approved", "Tasdiqlangan"
        REJECTED = "rejected", "Rad etilgan"
        EXPIRED = "expired", "Muddati o'tgan"
        CANCELLED = "cancelled", "Bekor qilingan"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="card_deposits",
    )
    wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name="card_deposits",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.AWAITING_PAYMENT,
        db_index=True,
    )
    # Foydalanuvchi o'tkazmada izohga yozadigan unikal kod
    transaction_ref = models.CharField(max_length=24, unique=True, db_index=True)
    merchant_ref = models.CharField(max_length=64, db_index=True)
    receiving_card_number = models.CharField(max_length=32)
    receiving_card_masked = models.CharField(max_length=32)
    receiving_cardholder = models.CharField(max_length=255)
    receiving_bank = models.CharField(max_length=128, blank=True, default="")
    client_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")
    claimed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    receipt_image = models.ImageField(
        upload_to="wallet/card_receipts/%Y/%m/",
        blank=True,
        null=True,
        help_text="Foydalanuvchi yuklagan to'lov cheki (rasm).",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by_admin_id = models.PositiveIntegerField(null=True, blank=True)
    reviewed_by_admin_email = models.CharField(max_length=255, blank=True, default="")
    review_note = models.CharField(max_length=500, blank=True, default="")
    ledger_entry = models.OneToOneField(
        LedgerEntry,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="card_deposit",
    )
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["user", "status"]),
        ]

    def __str__(self) -> str:
        return f"CardDeposit {self.transaction_ref} {self.amount} ({self.status})"
