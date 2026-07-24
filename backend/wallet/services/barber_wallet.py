"""Sartarosh MySaloon hisob raqami — hash-zanjirli ledger."""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from barbers.models import Barber
from control_panel.models import Payout
from wallet.models import BarberLedgerEntry, BarberWallet
from wallet.services.ledger import (
    GENESIS_HASH,
    canonical_entry_payload,
    compute_entry_hash,
)
from wallet.services.wallet_number import (
    account_hash,
    generate_barber_account_number,
    mask_wallet_number,
)
from wallet.services.wallet_service import InsufficientBalanceError, WalletServiceError


def last_barber_entry_hash(wallet_id) -> str:
    last = (
        BarberLedgerEntry.objects.filter(wallet_id=wallet_id)
        .order_by("-created_at", "-pk")
        .only("entry_hash")
        .first()
    )
    return last.entry_hash if last else GENESIS_HASH


class BarberWalletService:
    @classmethod
    def ensure_wallet(cls, barber: Barber, *, seed_legacy: bool = True) -> BarberWallet:
        existing = BarberWallet.objects.filter(barber=barber).first()
        if existing:
            return existing

        for attempt in range(8):
            number = generate_barber_account_number(barber.pk, attempt=attempt)
            digest = account_hash(number)
            try:
                with transaction.atomic():
                    wallet = BarberWallet.objects.create(
                        barber=barber,
                        account_number=number,
                        account_hash=digest,
                        balance=Decimal("0"),
                    )
                    if seed_legacy:
                        cls._seed_opening_balance(wallet, barber)
                    return wallet
            except Exception as exc:
                if BarberWallet.objects.filter(barber=barber).exists():
                    return BarberWallet.objects.get(barber=barber)
                if attempt >= 7:
                    raise WalletServiceError("Sartarosh hisobi yaratib bo'lmadi.") from exc
        raise WalletServiceError("Sartarosh hisobi yaratib bo'lmadi.")

    @classmethod
    def _legacy_available(cls, barber: Barber) -> Decimal:
        from bookings.earnings import barber_platform_earnings_qs
        from barbers.models import BarberExpense
        from wallet.services.qr_pay import QrPayService

        income = barber_platform_earnings_qs(barber).aggregate(t=Sum("total_price"))["t"] or 0
        expenses = (
            BarberExpense.objects.filter(barber=barber).aggregate(t=Sum("amount"))["t"] or 0
        )
        pending = (
            Payout.objects.filter(barber=barber, status=Payout.Status.PENDING).aggregate(
                t=Sum("amount")
            )["t"]
            or 0
        )
        paid = (
            Payout.objects.filter(barber=barber, status=Payout.Status.PAID).aggregate(
                t=Sum("amount")
            )["t"]
            or 0
        )
        qr_income = QrPayService.barber_qr_income_total(barber)
        gross = (
            Decimal(str(income))
            + Decimal(str(qr_income))
            - Decimal(str(expenses))
            - Decimal(str(paid))
            - Decimal(str(pending))
        )
        return max(Decimal("0"), gross)

    @classmethod
    def _seed_opening_balance(cls, wallet: BarberWallet, barber: Barber) -> None:
        legacy = cls._legacy_available(barber)
        if legacy <= 0:
            return
        cls.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.OPENING,
            amount=legacy,
            idempotency_key=f"barber-wallet-opening:{barber.pk}",
            reference_type="opening",
            reference_id=str(barber.pk),
            metadata={"source": "legacy_earnings_seed"},
        )

    @classmethod
    @transaction.atomic
    def post_entry(
        cls,
        *,
        wallet: BarberWallet,
        entry_type: str,
        amount: Decimal,
        idempotency_key: str,
        reference_type: str = "",
        reference_id: str = "",
        metadata: dict | None = None,
    ) -> BarberLedgerEntry:
        existing = BarberLedgerEntry.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        locked = BarberWallet.objects.select_for_update().get(pk=wallet.pk)
        if locked.is_locked and amount < 0:
            raise WalletServiceError("Hisob vaqtincha bloklangan.")

        new_balance = locked.balance + amount
        if new_balance < 0:
            raise InsufficientBalanceError("Sartarosh hisobida mablag' yetarli emas.")

        prev_hash = last_barber_entry_hash(locked.pk)
        payload = canonical_entry_payload(
            wallet_id=locked.pk,
            entry_type=entry_type,
            amount=amount,
            balance_after=new_balance,
            reference_type=reference_type,
            reference_id=reference_id,
            idempotency_key=idempotency_key,
        )
        entry_hash = compute_entry_hash(prev_hash, payload)
        entry = BarberLedgerEntry.objects.create(
            wallet=locked,
            entry_type=entry_type,
            amount=amount,
            balance_after=new_balance,
            reference_type=reference_type,
            reference_id=reference_id,
            idempotency_key=idempotency_key,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            metadata=metadata or {},
        )
        locked.balance = new_balance
        locked.save(update_fields=["balance", "updated_at"])
        return entry

    @classmethod
    def public_snapshot(cls, barber: Barber) -> dict:
        wallet = cls.ensure_wallet(barber)
        return {
            "account_number": wallet.account_number,
            "account_masked": mask_wallet_number(wallet.account_number),
            "account_hash": wallet.account_hash[:16],
            "balance": str(wallet.balance),
            "is_locked": wallet.is_locked,
            "created_at": wallet.created_at.isoformat(),
        }

    @classmethod
    def credit_booking(
        cls,
        *,
        barber: Barber,
        amount: Decimal,
        booking_id,
        metadata: dict | None = None,
    ) -> BarberLedgerEntry:
        wallet = cls.ensure_wallet(barber)
        return cls.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.BOOKING_IN,
            amount=amount,
            idempotency_key=f"barber-booking-in:{booking_id}",
            reference_type="booking",
            reference_id=str(booking_id),
            metadata=metadata or {},
        )

    @classmethod
    def credit_qr(
        cls,
        *,
        barber: Barber,
        amount: Decimal,
        payment_id,
        metadata: dict | None = None,
    ) -> BarberLedgerEntry:
        wallet = cls.ensure_wallet(barber)
        return cls.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.QR_IN,
            amount=amount,
            idempotency_key=f"barber-qr-in:{payment_id}",
            reference_type="qr_payment",
            reference_id=str(payment_id),
            metadata=metadata or {},
        )

    @classmethod
    def debit_payout(
        cls,
        *,
        barber: Barber,
        amount: Decimal,
        payout_id,
        metadata: dict | None = None,
    ) -> BarberLedgerEntry:
        wallet = cls.ensure_wallet(barber)
        return cls.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.PAYOUT_OUT,
            amount=-amount,
            idempotency_key=f"barber-payout-out:{payout_id}",
            reference_type="payout",
            reference_id=str(payout_id),
            metadata=metadata or {},
        )

    @classmethod
    def debit_subscription(
        cls,
        *,
        barber: Barber,
        amount: Decimal,
        order_id: str,
        plan_code: str,
        idempotency_key: str,
        metadata: dict | None = None,
    ) -> BarberLedgerEntry:
        wallet = cls.ensure_wallet(barber)
        if wallet.balance < amount:
            from wallet.services.wallet_service import InsufficientBalanceError

            raise InsufficientBalanceError("Hisobda mablag' yetarli emas.")
        meta = {"plan_code": plan_code, **(metadata or {})}
        return cls.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.SUBSCRIPTION_OUT,
            amount=-amount,
            idempotency_key=idempotency_key,
            reference_type="shop_subscription",
            reference_id=str(order_id),
            metadata=meta,
        )

    @classmethod
    def refund_payout(
        cls,
        *,
        barber: Barber,
        amount: Decimal,
        payout_id,
        metadata: dict | None = None,
    ) -> BarberLedgerEntry | None:
        # Faqat haqiqatan debit qilingan payoutlar uchun
        if not BarberLedgerEntry.objects.filter(
            idempotency_key=f"barber-payout-out:{payout_id}"
        ).exists():
            return None
        wallet = cls.ensure_wallet(barber)
        return cls.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.PAYOUT_REFUND,
            amount=amount,
            idempotency_key=f"barber-payout-refund:{payout_id}",
            reference_type="payout",
            reference_id=str(payout_id),
            metadata=metadata or {},
        )

    @classmethod
    def clawback_booking(
        cls,
        *,
        barber: Barber,
        amount: Decimal,
        booking_id,
        metadata: dict | None = None,
    ) -> BarberLedgerEntry:
        wallet = cls.ensure_wallet(barber)
        return cls.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.REFUND_OUT,
            amount=-amount,
            idempotency_key=f"barber-booking-clawback:{booking_id}",
            reference_type="booking",
            reference_id=str(booking_id),
            metadata=metadata or {},
        )
