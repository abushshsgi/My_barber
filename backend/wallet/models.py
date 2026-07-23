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
        QR_PAY = "qr_pay", "QR payment to barber"

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
        ON_HOLD = "on_hold", "On hold"
        REFUNDED = "refunded", "Refunded"

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
    # Admin tuzatish qurollari
    held_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    admin_note = models.CharField(max_length=500, blank=True, default="")
    remediation_log = models.JSONField(default=list, blank=True)
    held_at = models.DateTimeField(null=True, blank=True)
    held_by_admin_id = models.PositiveIntegerField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    refunded_by_admin_id = models.PositiveIntegerField(null=True, blank=True)
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


class BarberQrPayProfile(models.Model):
    """Sartaroshning doimiy QR to'lov identifikatori."""

    barber = models.OneToOneField(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="qr_pay_profile",
    )
    public_code = models.CharField(max_length=32, unique=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"QR {self.public_code} → barber {self.barber_id}"


class QrPaymentRequest(models.Model):
    """Sartarosh yaratgan summali (yoki ochiq) QR so'rov."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="qr_payment_requests",
    )
    profile = models.ForeignKey(
        BarberQrPayProfile,
        on_delete=models.CASCADE,
        related_name="requests",
    )
    # 0 = mijoz summani o'zi kiritadi
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    note = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"QrReq {self.id} {self.amount} ({self.status})"


class QrPayment(models.Model):
    """Mijoz → sartarosh QR to'lovi (hamyondan)."""

    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.PROTECT,
        related_name="qr_payments",
    )
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="qr_payments_sent",
    )
    payer_wallet = models.ForeignKey(
        Wallet,
        on_delete=models.PROTECT,
        related_name="qr_payments_sent",
    )
    request = models.ForeignKey(
        QrPaymentRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    note = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True,
    )
    ledger_entry = models.ForeignKey(
        LedgerEntry,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="qr_payment",
    )
    finance_transaction = models.ForeignKey(
        "control_panel.FinanceTransaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="qr_payments",
    )
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["barber", "created_at"]),
            models.Index(fields=["payer", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"QrPay {self.amount} → barber {self.barber_id}"


class BarberWallet(models.Model):
    """Sartaroshning MySaloon ichidagi yagona himoyalangan hisob raqami."""

    barber = models.OneToOneField(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="mysaloon_wallet",
    )
    account_number = models.CharField(max_length=19, unique=True, db_index=True)
    account_hash = models.CharField(max_length=64, unique=True, db_index=True)
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    is_locked = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"BarberWallet {self.account_number} (barber {self.barber_id})"


class BarberLedgerEntry(models.Model):
    class EntryType(models.TextChoices):
        BOOKING_IN = "booking_in", "Booking release"
        QR_IN = "qr_in", "QR payment in"
        PAYOUT_OUT = "payout_out", "Payout request"
        PAYOUT_REFUND = "payout_refund", "Payout rejected refund"
        OPENING = "opening", "Opening balance"
        ADJUSTMENT = "adjustment", "Adjustment"
        REFUND_OUT = "refund_out", "Booking refund clawback"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(
        BarberWallet,
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
            models.Index(fields=["entry_type", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk and BarberLedgerEntry.objects.filter(pk=self.pk).exists():
            raise PermissionError("Barber ledger entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("Barber ledger entries are immutable.")

    def __str__(self) -> str:
        return f"{self.entry_type} {self.amount} (barber_wallet {self.wallet_id})"
