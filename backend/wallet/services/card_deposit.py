"""Manual card top-up: unique refs, rate limits, admin approval."""

from __future__ import annotations

import secrets
import string
from datetime import timedelta
from decimal import Decimal, ROUND_DOWN
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from notifications.utils import notify_user
from wallet.models import ManualCardDeposit
from wallet.services.wallet_service import MIN_TOPUP_AMOUNT, WalletService, WalletServiceError

MAX_TOPUP_AMOUNT = Decimal("5000000")
INIT_TTL_HOURS = 2
CLAIM_TTL_HOURS = 24
REF_ALPHABET = string.ascii_uppercase + string.digits
MAX_RECEIPT_BYTES = 8 * 1024 * 1024
ALLOWED_RECEIPT_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}


def _mask_card(number: str) -> str:
    digits = "".join(c for c in number if c.isdigit())
    if len(digits) < 8:
        return "****"
    return f"{digits[:4]} **** **** {digits[-4:]}"


def _receipt_url(deposit: ManualCardDeposit, request=None) -> str:
    if not getattr(deposit, "receipt_image", None):
        return ""
    try:
        url = deposit.receipt_image.url
    except Exception:
        return ""
    if request is not None:
        try:
            return request.build_absolute_uri(url)
        except Exception:
            return url
    return url


def _validate_receipt_file(receipt_file) -> None:
    if receipt_file is None:
        raise WalletServiceError("To'lov cheki (rasm) majburiy.")
    size = int(getattr(receipt_file, "size", 0) or 0)
    if size <= 0:
        raise WalletServiceError("Chek fayli bo'sh.")
    if size > MAX_RECEIPT_BYTES:
        raise WalletServiceError("Chek rasmi 8 MB dan oshmasligi kerak.")
    content_type = (getattr(receipt_file, "content_type", "") or "").lower().strip()
    name = (getattr(receipt_file, "name", "") or "").lower()
    ext_ok = name.endswith((".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"))
    if content_type and content_type not in ALLOWED_RECEIPT_CONTENT_TYPES and not ext_ok:
        raise WalletServiceError("Faqat rasm yuklash mumkin (JPG, PNG, WEBP).")
    if not content_type and not ext_ok:
        raise WalletServiceError("Faqat rasm yuklash mumkin (JPG, PNG, WEBP).")


def receiving_card_config() -> dict[str, str]:
    number = (getattr(settings, "WALLET_RECEIVING_CARD_NUMBER", "") or "").strip()
    holder = (getattr(settings, "WALLET_RECEIVING_CARDHOLDER", "") or "").strip()
    bank = (getattr(settings, "WALLET_RECEIVING_BANK", "") or "").strip()
    merchant = (getattr(settings, "WALLET_MERCHANT_REF", "") or "").strip() or "MYSALOON"
    if not number or not holder:
        if getattr(settings, "DEBUG", False):
            number = "8600123456789012"
            holder = "MYSALOON LLC"
            bank = bank or "Test Bank"
        else:
            raise WalletServiceError(
                "Karta orqali to'ldirish hozircha sozlanmagan. Keyinroq urinib ko'ring."
            )
    digits = "".join(c for c in number if c.isdigit())
    if len(digits) < 16:
        raise WalletServiceError("Qabul qiluvchi karta sozlamasi noto'g'ri.")
    return {
        "card_number": digits,
        "card_masked": _mask_card(digits),
        "cardholder": holder,
        "bank": bank,
        "merchant_ref": merchant[:64],
    }


def _generate_transaction_ref() -> str:
    for _ in range(12):
        body = "".join(secrets.choice(REF_ALPHABET) for _ in range(8))
        ref = f"MS{body}"
        if not ManualCardDeposit.objects.filter(transaction_ref=ref).exists():
            return ref
    raise WalletServiceError("Tranzaksiya raqami yaratib bo'lmadi.")


def _generate_merchant_ref(base: str) -> str:
    """Har bir to'lov uchun unikal merchant ID (admin tanishi uchun)."""
    prefix = "".join(c for c in (base or "MS").upper() if c.isalnum())[:8] or "MS"
    for _ in range(12):
        body = "".join(secrets.choice(REF_ALPHABET) for _ in range(8))
        ref = f"{prefix}-{body}"
        if not ManualCardDeposit.objects.filter(merchant_ref=ref).exists():
            return ref[:64]
    raise WalletServiceError("Merchant raqami yaratib bo'lmadi.")


def _normalize_amount(raw: Decimal) -> Decimal:
    amount = Decimal(raw).quantize(Decimal("1"), rounding=ROUND_DOWN)
    if amount < MIN_TOPUP_AMOUNT:
        raise WalletServiceError(f"Minimal to'ldirish: {MIN_TOPUP_AMOUNT} so'm.")
    if amount > MAX_TOPUP_AMOUNT:
        raise WalletServiceError(f"Maksimal to'ldirish: {MAX_TOPUP_AMOUNT} so'm.")
    return amount


def expire_stale_deposits(*, user: User | None = None) -> int:
    now = timezone.now()
    qs = ManualCardDeposit.objects.filter(
        status__in=[
            ManualCardDeposit.Status.AWAITING_PAYMENT,
            ManualCardDeposit.Status.CLAIMED,
        ],
        expires_at__lt=now,
    )
    if user is not None:
        qs = qs.filter(user=user)
    return qs.update(status=ManualCardDeposit.Status.EXPIRED, updated_at=now)


def deposit_to_dict(
    deposit: ManualCardDeposit,
    *,
    include_full_card: bool = False,
    request=None,
) -> dict[str, Any]:
    card_number = deposit.receiving_card_number if include_full_card else deposit.receiving_card_masked
    return {
        "id": str(deposit.pk),
        "amount": deposit.amount,
        "status": deposit.status,
        "transaction_ref": deposit.transaction_ref,
        "merchant_ref": deposit.merchant_ref,
        "receiving_card": {
            "number": card_number,
            "masked": deposit.receiving_card_masked,
            "cardholder": deposit.receiving_cardholder,
            "bank": deposit.receiving_bank,
        },
        "receipt_url": _receipt_url(deposit, request),
        "claimed_at": deposit.claimed_at.isoformat() if deposit.claimed_at else None,
        "reviewed_at": deposit.reviewed_at.isoformat() if deposit.reviewed_at else None,
        "review_note": deposit.review_note,
        "expires_at": deposit.expires_at.isoformat(),
        "created_at": deposit.created_at.isoformat(),
        "ledger_entry_id": str(deposit.ledger_entry_id) if deposit.ledger_entry_id else None,
    }


def admin_deposit_to_dict(deposit: ManualCardDeposit, request=None) -> dict[str, Any]:
    user = deposit.user
    payload = deposit_to_dict(deposit, include_full_card=True, request=request)
    payload.update(
        {
            "user": {
                "id": user.pk,
                "full_name": user.full_name or "",
                "phone": user.phone or "",
                "email": user.email or "",
            },
            "wallet_number": deposit.wallet.wallet_number,
            "client_ip": deposit.client_ip,
            "user_agent": deposit.user_agent[:200],
            "reviewed_by_admin_id": deposit.reviewed_by_admin_id,
            "reviewed_by_admin_email": deposit.reviewed_by_admin_email,
        }
    )
    return payload


def _alert_admins(deposit: ManualCardDeposit) -> None:
    emails_raw = (
        getattr(settings, "WALLET_DEPOSIT_ALERT_EMAIL", "")
        or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        or ""
    )
    emails = [e.strip() for e in str(emails_raw).split(",") if e.strip()]
    if not emails:
        return
    user = deposit.user
    subject = f"[mysaloon] Karta to'ldirish · {deposit.transaction_ref}"
    body = (
        f"Yangi karta to'ldirish so'rovi.\n\n"
        f"Tranzaksiya: {deposit.transaction_ref}\n"
        f"Merchant: {deposit.merchant_ref}\n"
        f"Summa: {deposit.amount} so'm\n"
        f"User ID: {user.pk}\n"
        f"Ism: {user.full_name or '—'}\n"
        f"Telefon: {user.phone or '—'}\n"
        f"Hamyon: {deposit.wallet.wallet_number}\n"
        f"Chek: {'bor' if deposit.receipt_image else 'yoq'}\n"
        f"IP: {deposit.client_ip or '—'}\n"
        f"Vaqt: {deposit.claimed_at or deposit.created_at}\n"
    )
    try:
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            emails,
            fail_silently=True,
        )
    except Exception:
        pass


class CardDepositService:
    @classmethod
    def get_open_deposit(cls, user: User) -> ManualCardDeposit | None:
        expire_stale_deposits(user=user)
        return (
            ManualCardDeposit.objects.filter(
                user=user,
                status__in=[
                    ManualCardDeposit.Status.AWAITING_PAYMENT,
                    ManualCardDeposit.Status.CLAIMED,
                ],
            )
            .select_related("wallet")
            .order_by("-created_at")
            .first()
        )

    @classmethod
    @transaction.atomic
    def init_deposit(
        cls,
        *,
        user: User,
        amount: Decimal,
        idempotency_key: str,
        client_ip: str | None = None,
        user_agent: str = "",
    ) -> tuple[ManualCardDeposit, bool]:
        """
        Yangi so'rov yaratadi yoki ochiq so'rovni qaytaradi.
        Returns: (deposit, resumed)
        """
        expire_stale_deposits(user=user)
        amount = _normalize_amount(amount)
        key = (idempotency_key or "").strip()[:128]
        if not key:
            raise WalletServiceError("Idempotency-Key header majburiy.")

        existing = ManualCardDeposit.objects.filter(idempotency_key=key).first()
        if existing:
            if existing.user_id != user.pk:
                raise WalletServiceError("Idempotency kaliti boshqa foydalanuvchiga tegishli.")
            return existing, False

        open_qs = ManualCardDeposit.objects.filter(
            user=user,
            status__in=[
                ManualCardDeposit.Status.AWAITING_PAYMENT,
                ManualCardDeposit.Status.CLAIMED,
            ],
        ).order_by("-created_at")
        if open_qs.exists():
            # Xato o'rniga ochiq so'rovni qayta ochamiz (resume)
            same_amount = open_qs.filter(
                amount=amount,
                status=ManualCardDeposit.Status.AWAITING_PAYMENT,
            ).first()
            return same_amount or open_qs.first(), True

        cfg = receiving_card_config()
        wallet = WalletService.ensure_wallet(user)
        WalletService.assert_not_frozen(wallet, action="to'ldirish")
        now = timezone.now()
        deposit = ManualCardDeposit.objects.create(
            user=user,
            wallet=wallet,
            amount=amount,
            status=ManualCardDeposit.Status.AWAITING_PAYMENT,
            transaction_ref=_generate_transaction_ref(),
            merchant_ref=_generate_merchant_ref(cfg["merchant_ref"]),
            receiving_card_number=cfg["card_number"],
            receiving_card_masked=cfg["card_masked"],
            receiving_cardholder=cfg["cardholder"],
            receiving_bank=cfg["bank"],
            client_ip=client_ip,
            user_agent=(user_agent or "")[:512],
            idempotency_key=key,
            expires_at=now + timedelta(hours=INIT_TTL_HOURS),
        )
        return deposit, False

    @classmethod
    @transaction.atomic
    def claim_deposit(
        cls,
        *,
        user: User,
        deposit_id: str,
        receipt_file=None,
    ) -> ManualCardDeposit:
        expire_stale_deposits(user=user)
        deposit = (
            ManualCardDeposit.objects.select_for_update()
            .select_related("wallet", "user")
            .filter(pk=deposit_id, user=user)
            .first()
        )
        if not deposit:
            raise WalletServiceError("To'ldirish so'rovi topilmadi.")

        if deposit.status == ManualCardDeposit.Status.APPROVED:
            raise WalletServiceError("Bu so'rov allaqachon tasdiqlangan.")
        if deposit.status in (
            ManualCardDeposit.Status.REJECTED,
            ManualCardDeposit.Status.EXPIRED,
            ManualCardDeposit.Status.CANCELLED,
        ):
            raise WalletServiceError("Bu so'rov endi faol emas.")
        if deposit.expires_at < timezone.now():
            deposit.status = ManualCardDeposit.Status.EXPIRED
            deposit.save(update_fields=["status", "updated_at"])
            raise WalletServiceError("So'rov muddati tugagan. Yangi so'rov yarating.")

        # Allaqachon claim + chek bor → qayta yubormaymiz
        if deposit.status == ManualCardDeposit.Status.CLAIMED and deposit.receipt_image:
            return deposit

        # Yangi claim yoki cheksiz eski claim — rasm majburiy
        if not deposit.receipt_image:
            _validate_receipt_file(receipt_file)
            deposit.receipt_image = receipt_file
        elif receipt_file is not None:
            # Ixtiyoriy qayta yuklash (yangi chek)
            _validate_receipt_file(receipt_file)
            deposit.receipt_image = receipt_file

        now = timezone.now()
        deposit.status = ManualCardDeposit.Status.CLAIMED
        deposit.claimed_at = deposit.claimed_at or now
        deposit.expires_at = now + timedelta(hours=CLAIM_TTL_HOURS)
        deposit.save(
            update_fields=[
                "status",
                "claimed_at",
                "expires_at",
                "receipt_image",
                "updated_at",
            ]
        )

        notify_user(
            user,
            "wallet_deposit_claimed",
            "To'lov tekshiruvda",
            f"{deposit.amount} so'm · {deposit.transaction_ref}. Admin tasdiqlagach balansga tushadi.",
            payload={
                "deposit_id": str(deposit.pk),
                "transaction_ref": deposit.transaction_ref,
                "amount": str(deposit.amount),
            },
        )
        _alert_admins(deposit)
        return deposit

    @classmethod
    @transaction.atomic
    def approve_deposit(
        cls,
        *,
        deposit_id: str,
        admin_id: int | None,
        admin_email: str,
        note: str = "",
    ) -> ManualCardDeposit:
        deposit = (
            ManualCardDeposit.objects.select_for_update()
            .select_related("wallet", "user")
            .filter(pk=deposit_id)
            .first()
        )
        if not deposit:
            raise WalletServiceError("So'rov topilmadi.")
        if deposit.status == ManualCardDeposit.Status.APPROVED and deposit.ledger_entry_id:
            return deposit
        if deposit.status not in (
            ManualCardDeposit.Status.CLAIMED,
            ManualCardDeposit.Status.AWAITING_PAYMENT,
        ):
            raise WalletServiceError("Faqat kutilayotgan so'rovlarni tasdiqlash mumkin.")

        entry = WalletService.top_up(
            wallet=deposit.wallet,
            amount=deposit.amount,
            idempotency_key=f"card-deposit-{deposit.pk}",
            metadata={
                "source": "card_manual",
                "transaction_ref": deposit.transaction_ref,
                "merchant_ref": deposit.merchant_ref,
                "deposit_id": str(deposit.pk),
                "admin_id": admin_id,
                "admin_email": admin_email,
            },
        )
        now = timezone.now()
        deposit.status = ManualCardDeposit.Status.APPROVED
        deposit.reviewed_at = now
        deposit.reviewed_by_admin_id = admin_id
        deposit.reviewed_by_admin_email = (admin_email or "")[:255]
        deposit.review_note = (note or "")[:500]
        deposit.ledger_entry = entry
        deposit.save(
            update_fields=[
                "status",
                "reviewed_at",
                "reviewed_by_admin_id",
                "reviewed_by_admin_email",
                "review_note",
                "ledger_entry",
                "updated_at",
            ]
        )

        notify_user(
            deposit.user,
            "wallet_topup",
            "Hamyon to'ldirildi",
            f"+{deposit.amount} so'm · {deposit.transaction_ref}",
            payload={
                "deposit_id": str(deposit.pk),
                "transaction_ref": deposit.transaction_ref,
                "amount": str(deposit.amount),
                "entry_id": str(entry.pk),
            },
        )
        return deposit

    @classmethod
    @transaction.atomic
    def reject_deposit(
        cls,
        *,
        deposit_id: str,
        admin_id: int | None,
        admin_email: str,
        note: str = "",
    ) -> ManualCardDeposit:
        deposit = (
            ManualCardDeposit.objects.select_for_update()
            .select_related("user")
            .filter(pk=deposit_id)
            .first()
        )
        if not deposit:
            raise WalletServiceError("So'rov topilmadi.")
        if deposit.status == ManualCardDeposit.Status.APPROVED:
            raise WalletServiceError("Tasdiqlangan so'rovni rad etib bo'lmaydi.")
        if deposit.status == ManualCardDeposit.Status.REJECTED:
            return deposit

        now = timezone.now()
        deposit.status = ManualCardDeposit.Status.REJECTED
        deposit.reviewed_at = now
        deposit.reviewed_by_admin_id = admin_id
        deposit.reviewed_by_admin_email = (admin_email or "")[:255]
        deposit.review_note = (note or "Rad etildi")[:500]
        deposit.save(
            update_fields=[
                "status",
                "reviewed_at",
                "reviewed_by_admin_id",
                "reviewed_by_admin_email",
                "review_note",
                "updated_at",
            ]
        )
        notify_user(
            deposit.user,
            "wallet_deposit_rejected",
            "To'ldirish rad etildi",
            deposit.review_note or f"{deposit.transaction_ref} rad etildi.",
            payload={
                "deposit_id": str(deposit.pk),
                "transaction_ref": deposit.transaction_ref,
                "amount": str(deposit.amount),
            },
        )
        return deposit

    @classmethod
    def list_for_user(cls, user: User, *, limit: int = 30) -> list[ManualCardDeposit]:
        expire_stale_deposits(user=user)
        return list(
            ManualCardDeposit.objects.filter(user=user)
            .select_related("wallet")
            .order_by("-created_at")[:limit]
        )

    @classmethod
    def list_for_admin(cls, *, status: str | None = None, q: str = "", limit: int = 100):
        expire_stale_deposits()
        qs = ManualCardDeposit.objects.select_related("user", "wallet").order_by("-created_at")
        if status:
            qs = qs.filter(status=status)
        else:
            qs = qs.filter(
                status__in=[
                    ManualCardDeposit.Status.CLAIMED,
                    ManualCardDeposit.Status.AWAITING_PAYMENT,
                    ManualCardDeposit.Status.APPROVED,
                    ManualCardDeposit.Status.REJECTED,
                ]
            )
        q = (q or "").strip()
        if q:
            qs = qs.filter(
                Q(transaction_ref__icontains=q)
                | Q(merchant_ref__icontains=q)
                | Q(user__phone__icontains=q)
                | Q(user__full_name__icontains=q)
                | Q(user__email__icontains=q)
                | Q(wallet__wallet_number__icontains=q)
            )
        return list(qs[:limit])
