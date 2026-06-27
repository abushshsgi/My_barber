"""Booking onlayn to'lov: hamyon yechish va qaytarish."""

from decimal import Decimal

from django.utils import timezone

from bookings.models import Booking
from wallet.models import LedgerEntry
from wallet.services.wallet_service import InsufficientBalanceError, WalletService, WalletServiceError


def charge_booking_wallet(*, customer, booking: Booking, amount: Decimal) -> None:
    wallet = WalletService.ensure_wallet(customer)
    try:
        WalletService.post_entry(
            wallet=wallet,
            entry_type=LedgerEntry.EntryType.BOOKING_PAY,
            amount=-amount,
            idempotency_key=f"booking-pay-{booking.id}",
            reference_type="booking",
            reference_id=str(booking.id),
            metadata={"booking_id": booking.id},
        )
    except InsufficientBalanceError as exc:
        raise WalletServiceError(str(exc)) from exc


def refund_booking_wallet(*, customer, booking: Booking, amount: Decimal) -> None:
    if amount <= 0:
        return
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

    booking.payment_method = Booking.PaymentMethod.ONLINE
    charge_booking_wallet(customer=booking.customer, booking=booking, amount=booking.total_price)
    booking.payment_status = Booking.PaymentStatus.PAID
    booking.paid_at = timezone.now()
    booking.save(update_fields=["payment_method", "payment_status", "paid_at", "updated_at"])


def maybe_refund_booking(booking: Booking) -> None:
    if (
        booking.payment_method == Booking.PaymentMethod.ONLINE
        and booking.payment_status == Booking.PaymentStatus.PAID
    ):
        refund_booking_wallet(
            customer=booking.customer,
            booking=booking,
            amount=booking.total_price,
        )
