from django.db import models


class AuditLog(models.Model):
    admin = models.ForeignKey(
        "accounts.AdminAccount",
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=64, db_index=True)
    target_type = models.CharField(max_length=64, db_index=True)
    target_id = models.CharField(max_length=64, blank=True, default="")
    target_name = models.CharField(max_length=255, blank=True, default="")
    before_json = models.JSONField(default=dict, blank=True)
    after_json = models.JSONField(default=dict, blank=True)
    ip = models.CharField(max_length=64, blank=True, default="")
    user_agent = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class FinanceTransaction(models.Model):
    class Type(models.TextChoices):
        BOOKING = "booking", "Booking"
        COMMISSION = "commission", "Commission"
        PAYOUT = "payout", "Payout"
        REFUND = "refund", "Refund"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    type = models.CharField(max_length=24, choices=Type.choices, db_index=True)
    status = models.CharField(max_length=24, choices=Status.choices, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    related_name = models.CharField(max_length=255, blank=True, default="")
    booking = models.ForeignKey(
        "bookings.Booking",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="finance_transactions",
    )
    barber = models.ForeignKey(
        "barbers.Barber",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="finance_transactions",
    )
    salon = models.ForeignKey(
        "salons.Salon",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="finance_transactions",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class Payout(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"

    barber = models.ForeignKey(
        "barbers.Barber",
        on_delete=models.CASCADE,
        related_name="payouts",
    )
    period = models.CharField(max_length=64, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING, db_index=True)
    reference = models.CharField(max_length=120, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class SupportTicket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        PENDING = "pending", "Pending"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        NORMAL = "normal", "Normal"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    subject = models.CharField(max_length=255)
    body = models.TextField(blank=True, default="")
    category = models.CharField(max_length=64, blank=True, default="general")
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.OPEN, db_index=True)
    priority = models.CharField(max_length=24, choices=Priority.choices, default=Priority.NORMAL, db_index=True)
    assignee = models.ForeignKey(
        "accounts.AdminAccount",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_tickets",
    )
    created_by_user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="support_tickets",
    )
    created_by_barber = models.ForeignKey(
        "barbers.Barber",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="support_tickets",
    )
    unread = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        ordering = ["-updated_at"]


class SupportReply(models.Model):
    class AuthorRole(models.TextChoices):
        ADMIN = "admin", "Admin"
        USER = "user", "User"
        BARBER = "barber", "Barber"

    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    author_role = models.CharField(max_length=16, choices=AuthorRole.choices, db_index=True)
    author_name = models.CharField(max_length=255, blank=True, default="")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]


class BroadcastCampaign(models.Model):
    class Audience(models.TextChoices):
        ALL = "all", "All"
        USERS = "users", "Users"
        BARBERS = "barbers", "Barbers"
        REGION = "region", "Region"

    class Channel(models.TextChoices):
        PUSH = "push", "Push"
        SMS = "sms", "SMS"
        BOTH = "both", "Both"

    created_by = models.ForeignKey(
        "accounts.AdminAccount",
        on_delete=models.CASCADE,
        related_name="broadcasts",
    )
    audience = models.CharField(max_length=24, choices=Audience.choices, db_index=True)
    region = models.CharField(max_length=32, blank=True, default="", db_index=True)
    channel = models.CharField(max_length=16, choices=Channel.choices, default=Channel.PUSH)
    title = models.CharField(max_length=120)
    body = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    sent_count = models.PositiveIntegerField(default=0)
    read_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

