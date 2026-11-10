from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class UserSubscription(models.Model):
    """Mijozning obuna davri — faqat to'lov / trial / admin orqali yaratiladi."""

    class Status(models.TextChoices):
        PENDING = "pending", "To'lov kutilmoqda"
        ACTIVE = "active", "Faol"
        EXPIRED = "expired", "Muddati tugagan"
        CANCELLED = "cancelled", "Bekor qilingan"
        DEACTIVATED = "deactivated", "O'chirilgan"
        REFUNDED = "refunded", "To'lov qaytarilgan"

    class Source(models.TextChoices):
        WALLET = "wallet", "Hamyon"
        CLICK = "click", "Click"
        PAYME = "payme", "Payme"
        REFERRAL_TRIAL = "referral_trial", "Referal sinov"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        db_index=True,
    )
    plan_code = models.CharField(max_length=32, db_index=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    source = models.CharField(max_length=32, choices=Source.choices, db_index=True)
    starts_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ends_at = models.DateTimeField(null=True, blank=True, db_index=True)
    price_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    auto_renew = models.BooleanField(default=False)
    # Snapshot of entitlements at activation (audit / freeze limits)
    entitlements = models.JSONField(default=dict, blank=True)
    payment_provider = models.CharField(max_length=16, blank=True, default="")
    payment_order_id = models.CharField(max_length=128, blank=True, default="", db_index=True)
    payment_transaction_id = models.CharField(max_length=128, blank=True, default="", db_index=True)
    wallet_entry_id = models.CharField(max_length=64, blank=True, default="")
    cancelled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivated_reason = models.CharField(max_length=255, blank=True, default="")
    deactivated_by = models.CharField(max_length=64, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status", "-ends_at"]),
            models.Index(fields=["status", "ends_at"]),
            models.Index(fields=["plan_code", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}:{self.plan_code}:{self.status}"

    @property
    def is_user_cancelled(self) -> bool:
        return self.status == self.Status.CANCELLED and self.cancelled_at is not None

    @property
    def is_currently_active(self) -> bool:
        """Muddat ichida Premium huquqi (faol yoki foydalanuvchi bekor qilgan)."""
        now = timezone.now()
        if self.status == self.Status.ACTIVE:
            pass
        elif self.is_user_cancelled:
            pass
        else:
            return False
        if self.starts_at and self.starts_at > now:
            return False
        if self.ends_at and now >= self.ends_at:
            return False
        return True

    def grants_premium_at(self, now=None) -> bool:
        """Status + muddat. To'lov yaroqliligini chaqiruvchi tekshiradi."""
        now = now or timezone.now()
        if self.status == self.Status.REFUNDED:
            return False
        if self.status == self.Status.ACTIVE:
            pass
        elif self.status == self.Status.CANCELLED and self.cancelled_at is not None:
            pass
        else:
            return False
        if self.starts_at and self.starts_at > now:
            return False
        if self.ends_at and now >= self.ends_at:
            return False
        return True


class SubscriptionPayment(models.Model):
    """Obuna to'lovi — faqat muvaffaqiyatli to'lovdan keyin aktivatsiya."""

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        PAID = "paid", "To'langan"
        FAILED = "failed", "Muvaffaqiyatsiz"
        CANCELLED = "cancelled", "Bekor qilingan"
        EXPIRED = "expired", "Muddati o'tgan"
        REFUNDED = "refunded", "Qaytarilgan"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription_payments",
    )
    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
    )
    plan_code = models.CharField(max_length=32, db_index=True)
    amount_uzs = models.DecimalField(max_digits=12, decimal_places=2)
    amount_tiyin = models.PositiveIntegerField(default=0)
    provider = models.CharField(max_length=16, db_index=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    order_id = models.CharField(max_length=128, unique=True, db_index=True)
    payme_receipt_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    payme_state = models.IntegerField(null=True, blank=True)
    transaction_id = models.CharField(max_length=128, blank=True, default="", db_index=True)
    idempotency_key = models.CharField(max_length=128, unique=True, db_index=True)
    checkout_url = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    visitor_key = models.CharField(max_length=64, blank=True, default="")
    session_key = models.CharField(max_length=64, blank=True, default="")
    redirect_attempted_at = models.DateTimeField(null=True, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True, default="")
    outcome_source = models.CharField(max_length=16, blank=True, default="")
    abandoned_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["payme_receipt_id"],
                condition=~models.Q(payme_receipt_id=""),
                name="uniq_subscription_payme_receipt_id",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "paid_at"], name="subpay_status_paid_idx"),
            models.Index(fields=["status", "created_at"], name="subpay_status_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.order_id}:{self.status}"


class SubscriptionUsagePeriod(models.Model):
    """Oylik foydalanish hisoblagichi — serverda atomic oshiriladi."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription_usage_periods",
    )
    period_start = models.DateField(db_index=True)
    period_end = models.DateField()
    # Hisoblagich qaysi tarifga tegishli. Tarif almashganda nolga tushadi.
    plan_code = models.CharField(max_length=32, blank=True, default="")
    morph_ai_used = models.PositiveIntegerField(default=0)
    morph_studio_used = models.PositiveIntegerField(default=0)
    morph_chat_tokens_used = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "period_start"],
                name="uniq_subscription_usage_user_period",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "-period_start"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id}@{self.period_start}"


class SubscriptionEvent(models.Model):
    """Batafsil audit — kim nima qildi, limitlar, status o'zgarishlari."""

    class Action(models.TextChoices):
        CHECKOUT = "checkout", "Checkout"
        PAYMENT_PAID = "payment_paid", "To'lov tasdiqlandi"
        ACTIVATED = "activated", "Faollashtirildi"
        RENEWED = "renewed", "Yangilandi"
        EXPIRED = "expired", "Muddati tugadi"
        CANCELLED = "cancelled", "Bekor"
        DEACTIVATED = "deactivated", "O'chirildi"
        REACTIVATED = "reactivated", "Qayta yoqildi"
        USAGE = "usage", "Foydalanish"
        LIMIT_HIT = "limit_hit", "Limit tugadi"
        REFERRAL_TRIAL = "referral_trial", "Referal sinov"
        ADMIN_GRANT = "admin_grant", "Admin berdi"
        ADMIN_NOTE = "admin_note", "Admin izoh"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription_events",
        null=True,
        blank=True,
    )
    subscription = models.ForeignKey(
        UserSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    action = models.CharField(max_length=32, choices=Action.choices, db_index=True)
    actor = models.CharField(max_length=64, blank=True, default="system")
    detail = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action}:{self.user_id}"


class FlashTryonPass(models.Model):
    """Yangi user: ro'yxatdan keyin 30 daqiqa, 1 marta, 1 rasm, 1 000 so'm.

    Narx va muddat serverda. Karta raqami saqlanmaydi — faqat Payme chek ID.
    Try-on faqat Payme state=4 tasdiqlangandan keyin ochiladi.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "To'lov kutilmoqda"
        PAID = "paid", "To'langan"
        USED = "used", "Rasm ishlatilgan"
        EXPIRED = "expired", "Muddati tugagan"
        CANCELLED = "cancelled", "Bekor qilingan"
        FAILED = "failed", "Muvaffaqiyatsiz"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="flash_tryon_pass",
    )
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    amount_uzs = models.DecimalField(max_digits=12, decimal_places=2, default=1000)
    amount_tiyin = models.PositiveIntegerField(default=100_000)
    expires_at = models.DateTimeField(db_index=True)
    order_id = models.CharField(max_length=128, blank=True, default="", db_index=True)
    payme_receipt_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    payment = models.ForeignKey(
        "subscriptions.SubscriptionPayment",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flash_passes",
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True, db_index=True)
    reserved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "expires_at"], name="subscriptio_status_7f0a1d_idx"),
        ]

    def __str__(self) -> str:
        return f"flash:{self.user_id}:{self.status}"

