"""Booking onlayn to'lov: escrow (hold) → sartarosh hisobiga release."""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from bookings.models import Booking
from wallet.models import LedgerEntry
from wallet.services.barber_wallet import BarberWalletService
from wallet.services.wallet_number import mask_wallet_number
from wallet.services.wallet_service import InsufficientBalanceError, WalletService, WalletServiceError


def charge_booking_wallet(*, customer, booking: Booking, amount: Decimal) -> None:
    """Mijoz hamyonidan yechadi va escrow (HELD) holatiga o'tkazadi."""
    wallet = WalletService.ensure_wallet(customer)
    barber_wallet = BarberWalletService.ensure_wallet(booking.barber)
    try:
        with transaction.atomic():
            WalletService.post_entry(
                wallet=wallet,
                entry_type=LedgerEntry.EntryType.BOOKING_PAY,
                amount=-amount,
                idempotency_key=f"booking-pay-{booking.id}",
                reference_type="booking",
                reference_id=str(booking.id),
                metadata={
                    "booking_id": booking.id,
                    "barber_id": booking.barber_id,
                    "escrow": True,
                    "sender_wallet_masked": mask_wallet_number(wallet.wallet_number),
                    "recipient_wallet_masked": mask_wallet_number(barber_wallet.account_number),
                    "sender_name": (customer.full_name or customer.phone or str(customer.pk)).strip(),
                    "recipient_name": (
                        booking.barber.full_name or booking.barber.username or ""
                    ).strip(),
                },
            )
    except InsufficientBalanceError as exc:
        raise WalletServiceError(str(exc)) from exc


def release_booking_escrow_to_barber(booking: Booking) -> bool:
    """Bron tugaganda escrow → sartarosh MySaloon hisobi (idempotent)."""
    if booking.payment_method != Booking.PaymentMethod.ONLINE:
        return False
    if booking.status != Booking.Status.COMPLETED:
        return False
    if booking.payment_status not in (
        Booking.PaymentStatus.HELD,
        Booking.PaymentStatus.PAID,
    ):
        return False

    amount = Decimal(str(booking.total_price))
    if amount <= 0:
        if booking.payment_status == Booking.PaymentStatus.HELD:
            booking.payment_status = Booking.PaymentStatus.PAID
            booking.paid_at = booking.paid_at or timezone.now()
            booking.save(update_fields=["payment_status", "paid_at", "updated_at"])
        return True

    customer_wallet = WalletService.ensure_wallet(booking.customer)
    barber_wallet = BarberWalletService.ensure_wallet(booking.barber)
    with transaction.atomic():
        BarberWalletService.credit_booking(
            barber=booking.barber,
            amount=amount,
            booking_id=booking.id,
            metadata={
                "booking_id": booking.id,
                "customer_id": booking.customer_id,
                "customer_wallet_masked": mask_wallet_number(customer_wallet.wallet_number),
                "barber_account_masked": mask_wallet_number(barber_wallet.account_number),
            },
        )
        if booking.payment_status == Booking.PaymentStatus.HELD:
            booking.payment_status = Booking.PaymentStatus.PAID
            booking.paid_at = timezone.now()
            booking.save(update_fields=["payment_status", "paid_at", "updated_at"])

        try:
            from control_panel.models import FinanceTransaction

            FinanceTransaction.objects.get_or_create(
                booking=booking,
                type=FinanceTransaction.Type.BOOKING,
                defaults={
                    "status": FinanceTransaction.Status.COMPLETED,
                    "amount": amount,
                    "barber": booking.barber,
                    "related_name": f"Booking #{booking.id}",
                },
            )
        except Exception:
            pass
    return True


def refund_booking_wallet(*, customer, booking: Booking, amount: Decimal) -> None:
    if amount <= 0:
        return

    with transaction.atomic():
        # Agar sartaroshga allaqachon chiqarilgan bo'lsa — clawback
        if booking.payment_status == Booking.PaymentStatus.PAID:
            try:
                BarberWalletService.clawback_booking(
                    barber=booking.barber,
                    amount=amount,
                    booking_id=booking.id,
                    metadata={"reason": "booking_refund"},
                )
            except InsufficientBalanceError as exc:
                raise WalletServiceError(
                    "Sartarosh hisobida qaytarish uchun mablag' yetarli emas."
                ) from exc

        wallet = WalletService.ensure_wallet(customer)
        WalletService.post_entry(
            wallet=wallet,
            entry_type=LedgerEntry.EntryType.REFUND,
            amount=amount,
            idempotency_key=f"booking-refund-{booking.id}",
            reference_type="booking",
            reference_id=str(booking.id),
            metadata={"booking_id": booking.id},
        )
        booking.payment_status = Booking.PaymentStatus.REFUNDED
        booking.save(update_fields=["payment_status", "updated_at"])


def apply_payment_on_create(*, booking: Booking, payment_method: str) -> None:
    if payment_method == Booking.PaymentMethod.CASH:
        booking.payment_method = Booking.PaymentMethod.CASH
        booking.payment_status = Booking.PaymentStatus.NOT_APPLICABLE
        booking.paid_at = None
        booking.save(update_fields=["payment_method", "payment_status", "paid_at", "updated_at"])
        return

    # Avval hisobni yaratib qo'yamiz (ro'yxatdan o'tgan sartarosh uchun)
    BarberWalletService.ensure_wallet(booking.barber)

    booking.payment_method = Booking.PaymentMethod.ONLINE
    charge_booking_wallet(customer=booking.customer, booking=booking, amount=booking.total_price)
    booking.payment_status = Booking.PaymentStatus.HELD
    booking.paid_at = timezone.now()
    booking.save(update_fields=["payment_method", "payment_status", "paid_at", "updated_at"])


def maybe_refund_booking(booking: Booking) -> None:
    if booking.payment_method != Booking.PaymentMethod.ONLINE:
        return
    if booking.payment_status not in (
        Booking.PaymentStatus.HELD,
        Booking.PaymentStatus.PAID,
    ):
        return
    refund_booking_wallet(
        customer=booking.customer,
        booking=booking,
        amount=booking.total_price,
    )
