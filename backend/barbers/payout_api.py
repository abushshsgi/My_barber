"""Barber payout request and balance APIs."""

from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import BarberPayoutThrottle, BarberWriteThrottle
from barbers.permissions import IsBarber
from bookings.models import Booking
from control_panel.models import Payout

MIN_WITHDRAWAL_UZS = Decimal("50000")


def _barber_available_balance(barber) -> Decimal:
    income = (
        Booking.objects.filter(
            barber=barber,
            status=Booking.Status.COMPLETED,
        ).aggregate(t=Sum("total_price"))["t"]
        or 0
    )
    from barbers.models import BarberExpense

    expenses = (
        BarberExpense.objects.filter(barber=barber).aggregate(t=Sum("amount"))["t"] or 0
    )
    pending = (
        Payout.objects.filter(
            barber=barber,
            status=Payout.Status.PENDING,
        ).aggregate(t=Sum("amount"))["t"]
        or 0
    )
    gross = Decimal(str(income)) - Decimal(str(expenses))
    return max(Decimal("0"), gross - Decimal(str(pending)))


class BarberPayoutBalanceView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        barber = request.user.barber
        pending = (
            Payout.objects.filter(barber=barber, status=Payout.Status.PENDING).aggregate(
                t=Sum("amount")
            )["t"]
            or 0
        )
        return Response(
            {
                "available_balance": str(_barber_available_balance(barber)),
                "pending_payouts": str(pending),
                "min_withdrawal": str(MIN_WITHDRAWAL_UZS),
            }
        )


class BarberPayoutListView(generics.ListAPIView):
    permission_classes = [IsBarber]

    def list(self, request, *args, **kwargs):
        barber = request.user.barber
        rows = Payout.objects.filter(barber=barber).order_by("-created_at")[:100]
        data = [
            {
                "id": p.id,
                "period": p.period,
                "amount": str(p.amount),
                "status": p.status,
                "reference": p.reference,
                "created_at": p.created_at.isoformat(),
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
            }
            for p in rows
        ]
        return Response(data)


class BarberPayoutRequestView(APIView):
    permission_classes = [IsBarber]
    throttle_classes = [BarberPayoutThrottle]

    def post(self, request):
        barber = request.user.barber
        try:
            amount = Decimal(str(request.data.get("amount", "")).replace(",", ".").strip())
        except Exception:
            return Response({"detail": "Summa noto'g'ri."}, status=400)
        if amount < MIN_WITHDRAWAL_UZS:
            return Response(
                {"detail": f"Minimal yechish summasi {MIN_WITHDRAWAL_UZS} so'm."},
                status=400,
            )
        available = _barber_available_balance(barber)
        if amount > available:
            return Response({"detail": "Balans yetarli emas."}, status=400)

        account_ref = str(request.data.get("account_reference", "") or "").strip()
        if len(account_ref) < 4:
            return Response({"detail": "Hisob raqami yoki karta ma'lumotini kiriting."}, status=400)

        idempotency = str(request.data.get("idempotency_key", "") or "").strip()
        if idempotency:
            existing = Payout.objects.filter(
                barber=barber,
                reference=idempotency,
            ).first()
            if existing:
                return Response(
                    {
                        "id": existing.id,
                        "status": existing.status,
                        "amount": str(existing.amount),
                    },
                    status=200,
                )

        period = timezone.now().strftime("%Y-%m-%d")
        payout = Payout.objects.create(
            barber=barber,
            period=period,
            amount=amount,
            status=Payout.Status.PENDING,
            reference=idempotency or account_ref[:120],
        )

        try:
            from notifications.utils import notify_barber

            notify_barber(
                barber,
                "payout_requested",
                "Pul yechish so'rovi yuborildi",
                f"{amount} so'm admin tasdiqini kutmoqda.",
                {"payout_id": payout.id},
            )
        except Exception:
            pass

        return Response(
            {
                "id": payout.id,
                "status": payout.status,
                "amount": str(payout.amount),
            },
            status=201,
        )


class BarberPayoutDetailsView(APIView):
    permission_classes = [IsBarber]
    throttle_classes = [BarberWriteThrottle]

    def patch(self, request):
        from barbers.models import BarberSetting

        barber = request.user.barber
        settings, _ = BarberSetting.objects.get_or_create(barber=barber)
        holder = str(request.data.get("payout_holder_name", "") or "").strip()
        bank = str(request.data.get("payout_bank_name", "") or "").strip()
        account = str(request.data.get("payout_account", "") or "").strip()
        if account and len(account) < 8:
            return Response({"detail": "Hisob raqami juda qisqa."}, status=400)
        if holder:
            settings.payout_holder_name = holder[:120]
        if bank:
            settings.payout_bank_name = bank[:120]
        if account:
            settings.payout_account_last4 = account[-4:]
            settings.payout_account_encrypted = account[:64]
        settings.save()
        return Response(
            {
                "payout_holder_name": settings.payout_holder_name,
                "payout_bank_name": settings.payout_bank_name,
                "payout_account_last4": settings.payout_account_last4,
            }
        )
