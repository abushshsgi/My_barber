"""Manual card top-up: unique refs, rate limits, admin approval."""

from __future__ import annotations

import logging
import secrets
import string
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_DOWN
from typing import Any

from django.conf import settings
from django.core.mail import send_mail
from django.core.signing import TimestampSigner
from django.db import transaction
from django.db.models import Count, DateTimeField, Q, Sum
from django.db.models.functions import Coalesce, ExtractHour, TruncDate
from django.utils import timezone

from accounts.models import User
from notifications.utils import notify_user
from wallet.models import ManualCardDeposit
from wallet.services.wallet_service import MIN_TOPUP_AMOUNT, WalletService, WalletServiceError

logger = logging.getLogger(__name__)

MAX_TOPUP_AMOUNT = Decimal("5000000")


def _format_som(amount: Decimal) -> str:
    whole = int(Decimal(amount).quantize(Decimal("1"), rounding=ROUND_DOWN))
    return f"{whole:,}".replace(",", " ")


def schedule_wallet_topup_notice(user, amount, *, payload: dict) -> None:
    """Pul tushgach: ilova yopiq bo'lsa ham tizim pushi. OTP SMS emas."""
    amount_label = _format_som(Decimal(amount))
    notice_payload = dict(payload)

    def _notify() -> None:
        try:
            notify_user(
                user,
                "wallet_topup",
                "Hamyoningiz to'ldirildi",
                f"+{amount_label} so'm hisobingizga tushdi.",
                payload=notice_payload,
            )
        except Exception:
            logger.exception("Hamyon to'ldirish pushi yuborilmadi")

    transaction.on_commit(_notify)
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
    "application/octet-stream",
    "binary/octet-stream",
}


def _mask_card(number: str) -> str:
    digits = "".join(c for c in number if c.isdigit())
    if len(digits) < 8:
        return "****"
    return f"{digits[:4]} **** **** {digits[-4:]}"


def receipt_signer() -> TimestampSigner:
    return TimestampSigner(salt="wallet-card-receipt")


def _receipt_url(deposit: ManualCardDeposit, request=None) -> str:
    if not getattr(deposit, "receipt_image", None):
        return ""
    token = receipt_signer().sign(str(deposit.pk))
    path = f"/api/v1/wallet/top-up/card/{deposit.pk}/receipt/?t={token}"
    if request is not None:
        try:
            return request.build_absolute_uri(path)
        except Exception:
            return path
    return path


def _read_head(receipt_file, n: int = 32) -> bytes:
    if not hasattr(receipt_file, "read"):
        return b""
    pos = receipt_file.tell() if hasattr(receipt_file, "tell") else None
    head = receipt_file.read(n) or b""
    if not isinstance(head, (bytes, bytearray)):
        head = bytes(head)
    if pos is not None and hasattr(receipt_file, "seek"):
        receipt_file.seek(pos)
    return bytes(head)


def _looks_like_image(head: bytes) -> bool:
    if head.startswith(b"\xff\xd8\xff"):
        return True
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if head.startswith(b"RIFF") and b"WEBP" in head[:16]:
        return True
    if len(head) >= 12 and head[4:8] == b"ftyp":
        brand = head[8:12]
        return brand in {b"heic", b"heif", b"mif1", b"msf1", b"heix", b"hevc"}
    return False


def _validate_receipt_file(receipt_file) -> None:
    if receipt_file is None:
        raise WalletServiceError("To'lov cheki (rasm) majburiy.")
    size = int(getattr(receipt_file, "size", 0) or 0)
    if size <= 0 and hasattr(receipt_file, "read"):
        blob = receipt_file.read(MAX_RECEIPT_BYTES + 1) or b""
        if hasattr(receipt_file, "seek"):
            receipt_file.seek(0)
        size = len(blob) if isinstance(blob, (bytes, bytearray)) else 0
    if size <= 0:
        raise WalletServiceError("Chek fayli bo'sh.")
    if size > MAX_RECEIPT_BYTES:
        raise WalletServiceError("Chek rasmi 8 MB dan oshmasligi kerak.")
    content_type = (getattr(receipt_file, "content_type", "") or "").lower().strip()
    name = (getattr(receipt_file, "name", "") or "").replace("\\", "/").split("/")[-1].lower()
    if any(part in name for part in ("..", "\x00", ".svg", ".html", ".htm", ".js", ".php")):
        raise WalletServiceError("Bu fayl turi qabul qilinmaydi.")
    ext_ok = name.endswith((".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"))
    generic = content_type in {"application/octet-stream", "binary/octet-stream", ""}
    if content_type.startswith(("text/", "application/javascript", "image/svg")):
        raise WalletServiceError("Faqat rasm yuklash mumkin (JPG, PNG, WEBP).")
    if not generic and content_type not in ALLOWED_RECEIPT_CONTENT_TYPES and not ext_ok:
        raise WalletServiceError("Faqat rasm yuklash mumkin (JPG, PNG, WEBP).")
    if not content_type and not ext_ok:
        raise WalletServiceError("Faqat rasm yuklash mumkin (JPG, PNG, WEBP).")
    head = _read_head(receipt_file)
    lowered = head.lstrip().lower()
    if lowered.startswith((b"<", b"%pdf", b"pk\x03\x04", b"<!doc", b"<?xml")):
        raise WalletServiceError("Chek haqiqiy rasm emas. JPG yoki PNG yuklang.")
    if head and not _looks_like_image(head):
        raise WalletServiceError("Chek haqiqiy rasm emas. JPG yoki PNG yuklang.")


def _env_text(value: object) -> str:
    text = str(value or "").strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {'"', "'"}:
        text = text[1:-1].strip()
    return text


def receiving_card_config() -> dict[str, str]:
    number = _env_text(getattr(settings, "WALLET_RECEIVING_CARD_NUMBER", ""))
    holder = _env_text(getattr(settings, "WALLET_RECEIVING_CARDHOLDER", ""))
    bank = _env_text(getattr(settings, "WALLET_RECEIVING_BANK", ""))
    merchant = _env_text(getattr(settings, "WALLET_MERCHANT_REF", "")) or "MYSALOON"
    if not number or not holder:
        if getattr(settings, "DEBUG", False):
            number = number or "8600123456789012"
            holder = holder or "MYSALOON LLC"
            bank = bank or "Test Bank"
        elif not number and not holder:
            raise WalletServiceError(
                "Qabul qiluvchi karta sozlanmagan. Railway da WALLET_RECEIVING_CARD_NUMBER va WALLET_RECEIVING_CARDHOLDER ni to'ldiring."
            )
        elif not number:
            raise WalletServiceError("WALLET_RECEIVING_CARD_NUMBER bo'sh.")
        else:
            raise WalletServiceError("WALLET_RECEIVING_CARDHOLDER bo'sh. Kartadagi ismni yozing.")
    digits = "".join(c for c in number if c.isdigit())
    if len(digits) < 16 or len(digits) > 19:
        raise WalletServiceError("Karta raqami 16–19 ta raqamdan iborat bo'lishi kerak. Bo'sh joy va chiziq hisobga olinmaydi.")
    return {
        "card_number": digits,
        "card_masked": _mask_card(digits),
        "cardholder": holder,
        "bank": bank or "Bank",
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
        "comment_code": deposit.transaction_ref,
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
        "client_channel": (deposit.client_channel or "") or _channel_from_user_agent(deposit.user_agent),
        "ledger_entry_id": str(deposit.ledger_entry_id) if deposit.ledger_entry_id else None,
    }


def _channel_from_user_agent(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "okhttp" in ua or "expo" in ua or "mysaloon-mobile" in ua:
        return "mobile"
    if ua:
        return "web"
    return ""


def admin_deposit_to_dict(deposit: ManualCardDeposit, request=None) -> dict[str, Any]:
    user = deposit.user
    wallet = deposit.wallet
    ledger = getattr(deposit, "ledger_entry", None)
    payload = deposit_to_dict(deposit, include_full_card=True, request=request)
    payload.update(
        {
            "user": {
                "id": user.pk,
                "full_name": user.full_name or "",
                "phone": user.phone or "",
                "email": user.email or "",
            },
            "wallet_id": wallet.pk,
            "wallet_number": wallet.wallet_number,
            "wallet_balance": wallet.balance,
            "wallet_frozen": bool(wallet.is_frozen),
            "idempotency_key": deposit.idempotency_key,
            "ledger_entry_hash": ledger.entry_hash if ledger else None,
            "client_ip": deposit.client_ip,
            "user_agent": (deposit.user_agent or "")[:200],
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
        f"Izoh kodi: {deposit.transaction_ref}\n"
        f"Tranzaksiya: {deposit.transaction_ref}\n"
        f"Merchant: {deposit.merchant_ref}\n"
        f"Summa: {deposit.amount} so'm\n"
        f"User ID: {user.pk}\n"
        f"Ism: {user.full_name or '—'}\n"
        f"Telefon: {user.phone or '—'}\n"
        f"Hamyon: {deposit.wallet.wallet_number}\n"
        f"Chek: {'bor' if deposit.receipt_image else 'yoq'}\n"
        f"Manba: {'Mobil ilova' if (deposit.client_channel or '') == 'mobile' else 'Web'}\n"
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
        client_channel: str = "",
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
        if open_qs.filter(status=ManualCardDeposit.Status.CLAIMED).exists():
            raise WalletServiceError(
                "Oldingi to'lov admin tasdiqlamaguncha yangi to'ldirish mumkin emas."
            )
        if open_qs.exists():
            # Xato o'rniga ochiq so'rovni qayta ochamiz (resume)
            same_amount = open_qs.filter(
                amount=amount,
                status=ManualCardDeposit.Status.AWAITING_PAYMENT,
            ).first()
            deposit = same_amount or open_qs.first()
            if deposit and deposit.status == ManualCardDeposit.Status.AWAITING_PAYMENT:
                cfg = receiving_card_config()
                deposit.receiving_card_number = cfg["card_number"]
                deposit.receiving_card_masked = cfg["card_masked"]
                deposit.receiving_cardholder = cfg["cardholder"]
                deposit.receiving_bank = cfg["bank"]
                deposit.save(
                    update_fields=[
                        "receiving_card_number",
                        "receiving_card_masked",
                        "receiving_cardholder",
                        "receiving_bank",
                        "updated_at",
                    ]
                )
            return deposit, True

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
            client_channel=(client_channel or "")[:16],
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
        elif receipt_file is not None:
            _validate_receipt_file(receipt_file)
        if receipt_file is not None:
            if hasattr(receipt_file, "seek"):
                receipt_file.seek(0)
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

        try:
            notify_user(
                user,
                "wallet_deposit_claimed",
                "To'lov tekshiruvda",
                f"{deposit.amount} so'm · izoh {deposit.transaction_ref}. Admin tasdiqlagach balansga tushadi.",
                payload={
                    "deposit_id": str(deposit.pk),
                    "transaction_ref": deposit.transaction_ref,
                    "comment_code": deposit.transaction_ref,
                    "amount": str(deposit.amount),
                },
            )
            _alert_admins(deposit)
        except Exception:
            # Chek va holat allaqachon saqlangan — xabar xatosi tranzaksiyani qaytarmasin.
            pass
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
        # Chek yuborilgan so'rov 24 soatdan keyin expired bo'lsa ham tasdiqlanadi.
        reviewable = deposit.status in (
            ManualCardDeposit.Status.CLAIMED,
            ManualCardDeposit.Status.EXPIRED,
        )
        if not reviewable or not deposit.receipt_image:
            raise WalletServiceError("Avval foydalanuvchi chek yuklashi kerak. Cheksiz so'rovni tasdiqlab bo'lmaydi.")
        if deposit.wallet.is_frozen:
            raise WalletServiceError("Hamyon muzlatilgan. Avval oching, keyin tasdiqlang.")

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

        schedule_wallet_topup_notice(
            deposit.user,
            deposit.amount,
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
    def list_for_admin(
        cls,
        *,
        status: str | None = None,
        q: str = "",
        limit: int = 100,
        overdue: bool = False,
    ):
        qs = _admin_deposit_queryset(status=status, q=q, overdue=overdue)
        if overdue:
            limit = max(limit, 200)
        return list(qs[:limit])

    @classmethod
    def page_for_admin(
        cls,
        *,
        status: str | None = None,
        q: str = "",
        overdue: bool = False,
        page: int = 1,
        page_size: int = 8,
    ):
        qs = _admin_deposit_queryset(status=status, q=q, overdue=overdue)
        try:
            page_n = max(int(page), 1)
        except (TypeError, ValueError):
            page_n = 1
        try:
            size = int(page_size)
        except (TypeError, ValueError):
            size = 8
        size = min(max(size, 1), 50)
        total = qs.count()
        start = (page_n - 1) * size
        return list(qs[start : start + size]), total, page_n, size

    @classmethod
    def status_counts(cls) -> dict[str, int]:
        labels = [
            ManualCardDeposit.Status.AWAITING_PAYMENT,
            ManualCardDeposit.Status.CLAIMED,
            ManualCardDeposit.Status.APPROVED,
            ManualCardDeposit.Status.REJECTED,
            ManualCardDeposit.Status.EXPIRED,
            ManualCardDeposit.Status.CANCELLED,
        ]
        out = {status: 0 for status in labels}
        for row in ManualCardDeposit.objects.values("status").annotate(n=Count("pk")):
            key = row["status"]
            if key in out:
                out[key] = row["n"]
        return out

    @classmethod
    def overview(cls) -> dict[str, Any]:
        """Admin karta to'ldirish statistikasi: kun, jami, odamlar, rad."""
        today = timezone.localdate()
        approved = ManualCardDeposit.objects.filter(status=ManualCardDeposit.Status.APPROVED)
        settled = approved.annotate(
            settled_at=Coalesce("reviewed_at", "created_at", output_field=DateTimeField())
        )
        today_created = ManualCardDeposit.objects.filter(created_at__date=today)
        today_approved = settled.filter(settled_at__date=today)
        today_rejected = ManualCardDeposit.objects.filter(
            status=ManualCardDeposit.Status.REJECTED,
            reviewed_at__date=today,
        )
        today_pending = ManualCardDeposit.objects.filter(
            created_at__date=today,
            status__in=[
                ManualCardDeposit.Status.CLAIMED,
                ManualCardDeposit.Status.AWAITING_PAYMENT,
            ],
        )
        month_start = today.replace(day=1)
        if month_start.month == 1:
            previous_month_start = date(month_start.year - 1, 12, 1)
        else:
            previous_month_start = date(month_start.year, month_start.month - 1, 1)
        previous_month_end = month_start - timedelta(days=1)
        week_start = today - timedelta(days=6)
        previous_week_start = today - timedelta(days=13)
        previous_week_end = today - timedelta(days=7)
        month_window = today - timedelta(days=29)
        top_rows = list(
            approved.values("user_id", "user__full_name", "user__phone")
            .annotate(n=Count("pk"), amount=Sum("amount"))
            .order_by("-amount", "-n")[:12]
        )
        frequent_rows = list(
            approved.values("user_id", "user__full_name", "user__phone")
            .annotate(n=Count("pk"), amount=Sum("amount"))
            .order_by("-n", "-amount")[:8]
        )
        day_rows = {
            _stats_day_key(row["day"]): row
            for row in settled.annotate(day=TruncDate("settled_at"))
            .filter(settled_at__date__gte=month_window)
            .values("day")
            .annotate(n=Count("pk"), amount=Sum("amount"), people=Count("user_id", distinct=True))
        }
        days = []
        for offset in range(29, -1, -1):
            day = today - timedelta(days=offset)
            row = day_rows.get(day.isoformat())
            days.append(
                {
                    "date": day.isoformat(),
                    "count": (row or {}).get("n") or 0,
                    "amount": _stats_money((row or {}).get("amount")),
                    "people": (row or {}).get("people") or 0,
                }
            )
        hour_rows = {
            int(row["hour"]): row
            for row in settled.filter(settled_at__date=today)
            .annotate(hour=ExtractHour("settled_at"))
            .values("hour")
            .annotate(n=Count("pk"), amount=Sum("amount"))
            if row["hour"] is not None
        }
        hours = []
        for hour in range(24):
            row = hour_rows.get(hour)
            hours.append(
                {
                    "hour": hour,
                    "count": (row or {}).get("n") or 0,
                    "amount": _stats_money((row or {}).get("amount")),
                }
            )
        approved_bucket = _stats_bucket(approved)
        rejected_bucket = _stats_bucket(
            ManualCardDeposit.objects.filter(status=ManualCardDeposit.Status.REJECTED)
        )
        decided = approved_bucket["count"] + rejected_bucket["count"]
        average = approved_bucket["amount"] // approved_bucket["count"] if approved_bucket["count"] else 0
        repeat_people = approved.values("user_id").annotate(n=Count("pk")).filter(n__gt=1).count()
        once_people = approved.values("user_id").annotate(n=Count("pk")).filter(n=1).count()
        largest = approved.select_related("user").order_by("-amount", "-created_at").first()
        recent = [
            _stats_event(row)
            for row in approved.select_related("user").order_by("-reviewed_at", "-created_at")[:12]
        ]
        channels = [
            {
                "channel": row["client_channel"] or "",
                "count": row["n"] or 0,
                "amount": _stats_money(row["amount"]),
                "people": row["people"] or 0,
            }
            for row in approved.values("client_channel")
            .annotate(n=Count("pk"), amount=Sum("amount"), people=Count("user_id", distinct=True))
            .order_by("-amount")
        ]
        reject_notes = [
            {
                "note": row["review_note"],
                "count": row["n"] or 0,
                "amount": _stats_money(row["amount"]),
            }
            for row in ManualCardDeposit.objects.filter(status=ManualCardDeposit.Status.REJECTED)
            .exclude(review_note="")
            .values("review_note")
            .annotate(n=Count("pk"), amount=Sum("amount"))
            .order_by("-n", "-amount")[:8]
        ]
        return {
            "today": {
                "requests": today_created.count(),
                "people": today_created.values("user_id").distinct().count(),
                "approved_count": today_approved.count(),
                "approved_amount": _stats_money(today_approved.aggregate(amount=Sum("amount"))["amount"]),
                "approved_people": today_approved.values("user_id").distinct().count(),
                "rejected_count": today_rejected.count(),
                "rejected_amount": _stats_money(today_rejected.aggregate(amount=Sum("amount"))["amount"]),
                "pending_count": today_pending.count(),
            },
            "week": _stats_bucket(settled.filter(settled_at__date__gte=week_start)),
            "previous_week": _stats_bucket(
                settled.filter(
                    settled_at__date__gte=previous_week_start,
                    settled_at__date__lte=previous_week_end,
                )
            ),
            "month": _stats_bucket(settled.filter(settled_at__date__gte=month_start)),
            "previous_month": _stats_bucket(
                settled.filter(
                    settled_at__date__gte=previous_month_start,
                    settled_at__date__lte=previous_month_end,
                )
            ),
            "approved": approved_bucket,
            "rejected": rejected_bucket,
            "pending": _stats_bucket(
                ManualCardDeposit.objects.filter(
                    status__in=[
                        ManualCardDeposit.Status.CLAIMED,
                        ManualCardDeposit.Status.AWAITING_PAYMENT,
                    ]
                )
            ),
            "claimed": _stats_bucket(
                ManualCardDeposit.objects.filter(status=ManualCardDeposit.Status.CLAIMED)
            ),
            "awaiting": _stats_bucket(
                ManualCardDeposit.objects.filter(status=ManualCardDeposit.Status.AWAITING_PAYMENT)
            ),
            "expired": _stats_bucket(
                ManualCardDeposit.objects.filter(status=ManualCardDeposit.Status.EXPIRED)
            ),
            "cancelled": _stats_bucket(
                ManualCardDeposit.objects.filter(status=ManualCardDeposit.Status.CANCELLED)
            ),
            "average_approved": average,
            "approval_rate": round(100 * approved_bucket["count"] / decided) if decided else 0,
            "repeat_people": repeat_people,
            "once_people": once_people,
            "average_review_minutes": _stats_review_minutes(approved),
            "largest": _stats_event(largest) if largest else None,
            "top_user": _stats_person(top_rows[0]) if top_rows else None,
            "top_users": [_stats_person(row) for row in top_rows],
            "frequent_users": [_stats_person(row) for row in frequent_rows],
            "channels": channels,
            "hours": hours,
            "reject_notes": reject_notes,
            "recent": recent,
            "days": days,
        }


def _stats_money(value) -> int:
    if value is None:
        return 0
    return int(Decimal(value).quantize(Decimal("1"), rounding=ROUND_DOWN))


def _stats_bucket(qs) -> dict[str, int]:
    row = qs.aggregate(n=Count("pk"), amount=Sum("amount"), people=Count("user_id", distinct=True))
    return {
        "count": row["n"] or 0,
        "amount": _stats_money(row["amount"]),
        "people": row["people"] or 0,
    }


def _stats_event(deposit: ManualCardDeposit | None) -> dict[str, Any] | None:
    if deposit is None:
        return None
    stamp = deposit.reviewed_at or deposit.created_at
    user = deposit.user
    return {
        "full_name": (getattr(user, "full_name", "") or "").strip(),
        "phone": getattr(user, "phone", "") or "",
        "amount": _stats_money(deposit.amount),
        "at": stamp.isoformat() if stamp else "",
        "channel": deposit.client_channel or "",
    }


def _stats_review_minutes(approved) -> int | None:
    waits = approved.exclude(claimed_at__isnull=True).exclude(reviewed_at__isnull=True)
    total = 0.0
    count = 0
    for claimed_at, reviewed_at in waits.values_list("claimed_at", "reviewed_at").iterator():
        if not claimed_at or not reviewed_at or reviewed_at < claimed_at:
            continue
        total += (reviewed_at - claimed_at).total_seconds()
        count += 1
    if not count:
        return None
    return int(total / count // 60)


def _stats_person(row: dict) -> dict[str, Any]:
    return {
        "id": row["user_id"],
        "full_name": (row.get("user__full_name") or "").strip(),
        "phone": row.get("user__phone") or "",
        "count": row["n"] or 0,
        "amount": _stats_money(row["amount"]),
    }


def _stats_day_key(value) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)[:10]


def _admin_deposit_queryset(*, status: str | None, q: str, overdue: bool):
    expire_stale_deposits()
    qs = ManualCardDeposit.objects.select_related("user", "wallet", "ledger_entry").order_by(
        "-created_at"
    )
    if overdue:
        now = timezone.now()
        qs = (
            qs.filter(
                Q(status=ManualCardDeposit.Status.EXPIRED)
                | Q(status=ManualCardDeposit.Status.CLAIMED, expires_at__lt=now)
            )
            .exclude(receipt_image="")
            .exclude(receipt_image__isnull=True)
            .order_by("claimed_at", "created_at")
        )
    elif status:
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
        filters = (
            Q(transaction_ref__icontains=q)
            | Q(merchant_ref__icontains=q)
            | Q(idempotency_key__icontains=q)
            | Q(user__phone__icontains=q)
            | Q(user__full_name__icontains=q)
            | Q(user__email__icontains=q)
            | Q(wallet__wallet_number__icontains=q)
        )
        if q.isdigit():
            filters |= Q(user_id=int(q)) | Q(wallet_id=int(q))
        try:
            uuid.UUID(q)
        except ValueError:
            pass
        else:
            filters |= Q(pk=q) | Q(ledger_entry_id=q)
        qs = qs.filter(filters)
    return qs
