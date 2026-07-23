"""Admin: sartarosh MySaloon hisob raqamlari va tranzaksiyalar."""

from __future__ import annotations

from django.db.models import Count, Q, Sum
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from barbers.models import Barber
from control_panel.models import Payout
from wallet.models import BarberLedgerEntry, BarberWallet, QrPayment
from wallet.services.barber_wallet import BarberWalletService
from wallet.services.wallet_number import mask_wallet_number


class AdminBarberAccountsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = BarberWallet.objects.select_related("barber").order_by("-balance", "-updated_at")
        if q:
            qs = qs.filter(
                Q(account_number__icontains=q)
                | Q(account_hash__icontains=q)
                | Q(barber__full_name__icontains=q)
                | Q(barber__phone__icontains=q)
                | Q(barber__email__icontains=q)
                | Q(barber__username__icontains=q)
            )
        missing = Barber.objects.filter(mysaloon_wallet__isnull=True).order_by("-id")[:50]
        for b in missing:
            try:
                BarberWalletService.ensure_wallet(b)
            except Exception:
                pass

        limit = min(int(request.query_params.get("page_size") or 50), 200)
        rows = list(qs[:limit])
        agg = BarberWallet.objects.aggregate(
            total_balance=Sum("balance"),
            count=Count("id"),
            locked=Count("id", filter=Q(is_locked=True)),
        )
        pending_payouts = Payout.objects.filter(status=Payout.Status.PENDING).aggregate(
            t=Sum("amount"), c=Count("id")
        )
        qr_vol = QrPayment.objects.filter(status=QrPayment.Status.COMPLETED).aggregate(
            t=Sum("amount"), c=Count("id")
        )
        results = []
        for w in rows:
            b = w.barber
            results.append(
                {
                    "barber_id": b.id,
                    "barber_name": (b.full_name or b.username or b.email or "").strip(),
                    "barber_phone": b.phone or "",
                    "barber_email": b.email or "",
                    "account_number": w.account_number,
                    "account_masked": mask_wallet_number(w.account_number),
                    "account_hash": w.account_hash[:16],
                    "balance": str(w.balance),
                    "is_locked": w.is_locked,
                    "created_at": w.created_at.isoformat(),
                    "updated_at": w.updated_at.isoformat(),
                }
            )
        return Response(
            {
                "summary": {
                    "total_balance": str(agg["total_balance"] or 0),
                    "accounts_count": agg["count"] or 0,
                    "locked_count": agg["locked"] or 0,
                    "pending_payout_total": str(pending_payouts["t"] or 0),
                    "pending_payout_count": pending_payouts["c"] or 0,
                    "qr_volume": str(qr_vol["t"] or 0),
                    "qr_count": qr_vol["c"] or 0,
                },
                "results": results,
            }
        )


class AdminBarberAccountDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, barber_id: int):
        barber = Barber.objects.filter(pk=barber_id).first()
        if not barber:
            return Response({"detail": "Sartarosh topilmadi."}, status=404)
        wallet = BarberWalletService.ensure_wallet(barber)
        entries = BarberLedgerEntry.objects.filter(wallet=wallet).order_by("-created_at")[:200]
        payouts = Payout.objects.filter(barber=barber).order_by("-created_at")[:50]
        qr_rows = (
            QrPayment.objects.filter(barber=barber)
            .select_related("payer")
            .order_by("-created_at")[:50]
        )
        return Response(
            {
                "account": BarberWalletService.public_snapshot(barber),
                "barber": {
                    "id": barber.id,
                    "full_name": (barber.full_name or "").strip(),
                    "phone": barber.phone or "",
                    "email": barber.email,
                    "work_mode": barber.work_mode,
                    "is_active": barber.is_active,
                },
                "ledger": [
                    {
                        "id": str(e.id),
                        "entry_type": e.entry_type,
                        "amount": str(e.amount),
                        "balance_after": str(e.balance_after),
                        "reference_type": e.reference_type,
                        "reference_id": e.reference_id,
                        "entry_hash": e.entry_hash[:16],
                        "metadata": e.metadata,
                        "created_at": e.created_at.isoformat(),
                    }
                    for e in entries
                ],
                "payouts": [
                    {
                        "id": p.id,
                        "amount": str(p.amount),
                        "status": p.status,
                        "reference": p.reference,
                        "created_at": p.created_at.isoformat(),
                        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                    }
                    for p in payouts
                ],
                "qr_payments": [
                    {
                        "id": str(r.id),
                        "amount": str(r.amount),
                        "payer_name": (
                            r.payer.full_name or r.payer.phone or str(r.payer_id)
                        ).strip(),
                        "status": r.status,
                        "created_at": r.created_at.isoformat(),
                    }
                    for r in qr_rows
                ],
            }
        )


class AdminBarberAccountLockView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, barber_id: int):
        barber = Barber.objects.filter(pk=barber_id).first()
        if not barber:
            return Response({"detail": "Sartarosh topilmadi."}, status=404)
        wallet = BarberWalletService.ensure_wallet(barber)
        lock = request.data.get("is_locked")
        if lock is None:
            return Response({"detail": "is_locked kerak."}, status=400)
        wallet.is_locked = bool(lock)
        wallet.save(update_fields=["is_locked", "updated_at"])
        return Response(BarberWalletService.public_snapshot(barber))
