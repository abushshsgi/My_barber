"""QR orqali mijoz → sartarosh to'lovi (faqat imzolangan QR payload)."""

from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import time
from datetime import timedelta
from decimal import Decimal, ROUND_DOWN
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from barbers.models import Barber
from control_panel.models import FinanceTransaction
from wallet.models import (
    BarberQrPayProfile,
    LedgerEntry,
    QrPayment,
    QrPaymentRequest,
    Wallet,
)
from wallet.services.barber_wallet import BarberWalletService
from wallet.services.wallet_number import mask_wallet_number
from wallet.services.wallet_service import (
    InsufficientBalanceError,
    WalletService,
    WalletServiceError,
)

MIN_QR_AMOUNT = Decimal("1000")
MAX_QR_AMOUNT = Decimal("5000000")
QR_PAYLOAD_PREFIX = "mysaloon:qrpay:v1:"
QR_PAYLOAD_PREFIX_V2 = "mysaloon:qrpay:v2:"
_CODE_RE = re.compile(r"^[a-z0-9]{8,24}$")
# Resolve / pay: payload muddati (soniyalar)
QR_TOKEN_TTL_SEC = 15 * 60


def _qr_hmac_secret() -> bytes:
    raw = getattr(settings, "WALLET_HMAC_SECRET", None) or settings.SECRET_KEY
    return f"qrpay:{raw}".encode("utf-8")


def _sign_parts(*parts: str) -> str:
    msg = "|".join(parts).encode("utf-8")
    return hmac.new(_qr_hmac_secret(), msg, hashlib.sha256).hexdigest()[:24]


def build_qr_payload(*, public_code: str, request_id: str | None = None) -> str:
    """Imzolangan QR payload — qo'lda yozib to'lov qilib bo'lmaydi."""
    code = (public_code or "").strip().lower()
    exp = str(int(time.time()) + QR_TOKEN_TTL_SEC)
    rid = (request_id or "").strip()
    sig = _sign_parts(code, rid, exp)
    if rid:
        return f"{QR_PAYLOAD_PREFIX_V2}{code}:{rid}:{exp}:{sig}"
    return f"{QR_PAYLOAD_PREFIX_V2}{code}::{exp}:{sig}"


def parse_qr_payload(raw: str) -> tuple[str, str | None]:
    """Return (public_code, request_id|None). Faqat QR payload qabul qilinadi."""
    text = (raw or "").strip()
    if not text:
        raise WalletServiceError("QR kod bo'sh.")

    # Faqat rasmiy prefix — oddiy kod yozib to'lov yo'q
    if text.startswith(QR_PAYLOAD_PREFIX_V2):
        body = text[len(QR_PAYLOAD_PREFIX_V2) :]
        parts = body.split(":")
        if len(parts) < 4:
            raise WalletServiceError("QR kod noto'g'ri yoki muddati o'tgan.")
        code = (parts[0] or "").strip().lower()
        request_id = parts[1].strip() or None
        exp_s = parts[2].strip()
        sig = parts[3].strip()
        if not _CODE_RE.match(code):
            raise WalletServiceError("QR kod noto'g'ri.")
        try:
            exp = int(exp_s)
        except ValueError as exc:
            raise WalletServiceError("QR kod muddati noto'g'ri.") from exc
        if exp < int(time.time()):
            raise WalletServiceError("QR kod muddati o'tgan — yangi QR skanerlang.")
        expected = _sign_parts(code, request_id or "", exp_s)
        if not hmac.compare_digest(sig, expected):
            raise WalletServiceError("QR imzo noto'g'ri — faqat skaner orqali to'lang.")
        return code, request_id

    if text.startswith(QR_PAYLOAD_PREFIX) or text.startswith("mysaloon:qrpay:"):
        # Eski format: yangi QR so'rang (xavfsizlik)
        raise WalletServiceError("Eski QR. Sartarosh yangi QR chiqarsin.")

    raise WalletServiceError("Faqat MySaloon QR skaner orqali to'lov qilinadi.")


def _new_public_code() -> str:
    return secrets.token_hex(5)  # 10 hex chars


class QrPayService:
    @classmethod
    def ensure_profile(cls, barber: Barber) -> BarberQrPayProfile:
        BarberWalletService.ensure_wallet(barber)
        existing = BarberQrPayProfile.objects.filter(barber=barber).first()
        if existing:
            return existing
        for _ in range(8):
            code = _new_public_code()
            try:
                return BarberQrPayProfile.objects.create(
                    barber=barber,
                    public_code=code,
                    is_active=True,
                )
            except Exception:
                if BarberQrPayProfile.objects.filter(barber=barber).exists():
                    return BarberQrPayProfile.objects.get(barber=barber)
        raise WalletServiceError("QR profil yaratib bo'lmadi.")

    @classmethod
    def create_request(
        cls,
        *,
        barber: Barber,
        amount: Decimal | None = None,
        note: str = "",
        expires_minutes: int = 60,
    ) -> QrPaymentRequest:
        profile = cls.ensure_profile(barber)
        if not profile.is_active:
            raise WalletServiceError("QR to'lov o'chirilgan.")
        amt = Decimal(str(amount or 0)).quantize(Decimal("1"), rounding=ROUND_DOWN)
        if amt < 0:
            raise WalletServiceError("Summa noto'g'ri.")
        if amt > 0 and (amt < MIN_QR_AMOUNT or amt > MAX_QR_AMOUNT):
            raise WalletServiceError(
                f"Summa {MIN_QR_AMOUNT}–{MAX_QR_AMOUNT} so'm oralig'ida bo'lishi kerak."
            )
        expires_at = timezone.now() + timedelta(minutes=max(5, min(expires_minutes, 24 * 60)))
        return QrPaymentRequest.objects.create(
            barber=barber,
            profile=profile,
            amount=amt,
            note=(note or "")[:200],
            status=QrPaymentRequest.Status.PENDING,
            expires_at=expires_at,
        )

    @classmethod
    def resolve(cls, *, raw: str) -> dict:
        code, request_id = parse_qr_payload(raw)
        profile = (
            BarberQrPayProfile.objects.select_related("barber")
            .filter(public_code=code, is_active=True)
            .first()
        )
        if not profile:
            raise WalletServiceError("QR topilmadi yoki o'chirilgan.")
        barber = profile.barber
        if not barber.is_active:
            raise WalletServiceError("Sartarosh faol emas.")
        BarberWalletService.ensure_wallet(barber)
        req = None
        if request_id:
            try:
                UUID(str(request_id))
            except Exception as exc:
                raise WalletServiceError("QR so'rov ID noto'g'ri.") from exc
            req = QrPaymentRequest.objects.filter(
                id=request_id, barber=barber, profile=profile
            ).first()
            if not req:
                raise WalletServiceError("QR so'rov topilmadi.")
            if req.status != QrPaymentRequest.Status.PENDING:
                raise WalletServiceError("Bu QR so'rov allaqachon yopilgan.")
            if req.expires_at and req.expires_at < timezone.now():
                req.status = QrPaymentRequest.Status.EXPIRED
                req.save(update_fields=["status"])
                raise WalletServiceError("QR so'rov muddati o'tgan.")

        # Har resolve da yangi imzoli payload (replay oynasini qisqartirish)
        fresh_payload = build_qr_payload(
            public_code=profile.public_code,
            request_id=str(req.id) if req else None,
        )
        return {
            "public_code": profile.public_code,
            "payload": fresh_payload,
            "barber": {
                "id": barber.id,
                "full_name": (barber.full_name or barber.username or "").strip() or "Sartarosh",
                "phone": barber.phone or "",
            },
            "request": (
                {
                    "id": str(req.id),
                    "amount": str(req.amount),
                    "note": req.note,
                    "expires_at": req.expires_at.isoformat() if req.expires_at else None,
                }
                if req
                else None
            ),
            "min_amount": str(MIN_QR_AMOUNT),
            "max_amount": str(MAX_QR_AMOUNT),
            "account_masked": mask_wallet_number(
                BarberWalletService.ensure_wallet(barber).account_number
            ),
        }

    @classmethod
    def pay(
        cls,
        *,
        payer,
        raw_or_code: str,
        amount: Decimal | None,
        note: str = "",
        idempotency_key: str,
    ) -> QrPayment:
        key = (idempotency_key or "").strip()[:128]
        if not key:
            raise WalletServiceError("Idempotency-Key kerak.")
        existing = QrPayment.objects.filter(idempotency_key=key).first()
        if existing:
            return existing

        # Faqat imzolangan QR
        resolved = cls.resolve(raw=raw_or_code)
        barber_id = resolved["barber"]["id"]
        barber = Barber.objects.get(pk=barber_id)
        request_id = resolved["request"]["id"] if resolved.get("request") else None

        if request_id and resolved["request"].get("amount"):
            locked_amt = Decimal(str(resolved["request"]["amount"]))
            if locked_amt > 0:
                pay_amount = locked_amt
            else:
                if amount is None:
                    raise WalletServiceError("Summani kiriting.")
                pay_amount = Decimal(str(amount)).quantize(Decimal("1"), rounding=ROUND_DOWN)
        else:
            if amount is None:
                raise WalletServiceError("Summani kiriting.")
            pay_amount = Decimal(str(amount)).quantize(Decimal("1"), rounding=ROUND_DOWN)

        if pay_amount < MIN_QR_AMOUNT or pay_amount > MAX_QR_AMOUNT:
            raise WalletServiceError(
                f"Summa {MIN_QR_AMOUNT}–{MAX_QR_AMOUNT} so'm oralig'ida bo'lishi kerak."
            )

        clean_note = (note or "")[:200]
        if not clean_note and resolved.get("request"):
            clean_note = (resolved["request"].get("note") or "")[:200]
        wallet = WalletService.ensure_wallet(payer)
        barber_wallet = BarberWalletService.ensure_wallet(barber)

        with transaction.atomic():
            locked = Wallet.objects.select_for_update().get(pk=wallet.pk)
            if locked.balance < pay_amount:
                raise InsufficientBalanceError("Balans yetarli emas.")

            req = None
            if request_id:
                req = QrPaymentRequest.objects.select_for_update().filter(id=request_id).first()
                if not req:
                    raise WalletServiceError("QR so'rov topilmadi.")
                if req.status != QrPaymentRequest.Status.PENDING:
                    raise WalletServiceError("Bu QR so'rov allaqachon yopilgan.")
                if req.expires_at and req.expires_at < timezone.now():
                    req.status = QrPaymentRequest.Status.EXPIRED
                    req.save(update_fields=["status"])
                    raise WalletServiceError("QR so'rov muddati o'tgan.")
                if req.amount > 0:
                    pay_amount = req.amount

            payment = QrPayment.objects.create(
                barber=barber,
                payer=payer,
                payer_wallet=locked,
                request=req,
                amount=pay_amount,
                note=clean_note,
                status=QrPayment.Status.COMPLETED,
                idempotency_key=key,
            )

            meta = {
                "barber_id": barber.id,
                "barber_name": (barber.full_name or barber.username or "").strip(),
                "payer_user_id": payer.pk,
                "payer_name": (payer.full_name or payer.phone or str(payer.pk)).strip(),
                "sender_name": (payer.full_name or payer.phone or str(payer.pk)).strip(),
                "recipient_name": (barber.full_name or barber.username or "").strip(),
                "sender_wallet_masked": mask_wallet_number(locked.wallet_number),
                "recipient_wallet_masked": mask_wallet_number(barber_wallet.account_number),
                "note": clean_note,
                "request_id": str(req.id) if req else "",
                "action": "qr_pay",
            }
            entry = WalletService.post_entry(
                wallet=locked,
                entry_type=LedgerEntry.EntryType.QR_PAY,
                amount=-pay_amount,
                idempotency_key=f"{key}:out",
                reference_type="qr_payment",
                reference_id=str(payment.id),
                metadata=meta,
            )
            BarberWalletService.credit_qr(
                barber=barber,
                amount=pay_amount,
                payment_id=payment.id,
                metadata={
                    "payer_id": payer.pk,
                    "payer_name": meta["payer_name"],
                    "payer_wallet_masked": meta["sender_wallet_masked"],
                    "barber_account_masked": meta["recipient_wallet_masked"],
                    "note": clean_note,
                },
            )
            fin = FinanceTransaction.objects.create(
                type=FinanceTransaction.Type.QR_PAY,
                status=FinanceTransaction.Status.COMPLETED,
                amount=pay_amount,
                related_name=f"QR · {(barber.full_name or barber.username)}",
                barber=barber,
            )
            payment.ledger_entry = entry
            payment.finance_transaction = fin
            payment.save(update_fields=["ledger_entry", "finance_transaction"])

            if req:
                req.status = QrPaymentRequest.Status.PAID
                req.save(update_fields=["status"])

            return payment

    @classmethod
    def barber_qr_income_total(cls, barber: Barber) -> Decimal:
        total = (
            QrPayment.objects.filter(barber=barber, status=QrPayment.Status.COMPLETED).aggregate(
                t=Sum("amount")
            )["t"]
            or 0
        )
        return Decimal(str(total))
