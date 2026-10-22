"""Account deletion request model and service."""

from __future__ import annotations

import secrets
from datetime import timedelta

from django.db import models
from django.utils import timezone


class AccountDeletionRequest(models.Model):
    """Public account deletion request — verified via OTP before processing."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Verification"
        VERIFIED = "verified", "Verified — Awaiting Processing"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    email = models.EmailField(blank=True, null=True, db_index=True)
    phone = models.CharField(max_length=32, blank=True, null=True, db_index=True)
    explanation = models.TextField(blank=True, default="")

    # OTP verification
    verification_code = models.CharField(max_length=8, blank=True, default="")
    verification_expires_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    # Processing
    processed_at = models.DateTimeField(null=True, blank=True)
    user_id = models.PositiveIntegerField(null=True, blank=True, db_index=True)  # Set after verification

    # Meta
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["email", "status"]),
            models.Index(fields=["phone", "status"]),
        ]

    def __str__(self) -> str:
        contact = self.email or self.phone or "unknown"
        return f"DeletionRequest({contact}, {self.status})"

    @property
    def is_expired(self) -> bool:
        if self.verification_expires_at is None:
            return False
        return timezone.now() > self.verification_expires_at

    def generate_verification_code(self) -> str:
        """Generate 6-digit verification code valid for 24 hours."""
        code = f"{secrets.randbelow(1000000):06d}"
        self.verification_code = code
        self.verification_expires_at = timezone.now() + timedelta(hours=24)
        self.save(update_fields=["verification_code", "verification_expires_at"])
        return code

    def verify_code(self, code: str) -> bool:
        """Verify the OTP code."""
        if self.status != self.Status.PENDING:
            return False
        if self.is_expired:
            return False
        if not secrets.compare_digest(self.verification_code, code):
            return False
        self.status = self.Status.VERIFIED
        self.verified_at = timezone.now()
        self.save(update_fields=["status", "verified_at"])
        return True
