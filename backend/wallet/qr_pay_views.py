"""QR to'lov API — barber / user / admin."""

from decimal import Decimal, InvalidOperation

from django.db.models import Count, Sum
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from accounts.throttles import WalletQrPayThrottle, WalletQrResolveThrottle
from barbers.permissions import IsBarber
from wallet.models import QrPayment
from wallet.services.qr_pay import (
    QrPayService,
    build_qr_payload,
)
from wallet.services.wallet_service import InsufficientBalanceError, WalletServiceError


def _payment_row(p: QrPayment) -> dict:
    return {
        "id": str(p.id),
        "amount": str(p.amount),
        "note": p.note,
        "status": p.status,
        "barber_id": p.barber_id,
        "barber_name": (p.barber.full_name or p.barber.username or "").strip(),
        "payer_id": p.payer_id,
        "payer_name": (p.payer.full_name or p.payer.phone or str(p.payer_id)).strip(),
        "request_id": str(p.request_id) if p.request_id else None,
        "created_at": p.created_at.isoformat(),
    }


class BarberQrPayProfileView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        barber = request.user.barber
        profile = QrPayService.ensure_profile(barber)
        payload = build_qr_payload(public_code=profile.public_code)
        return Response(
            {
                "public_code": profile.public_code,
                "payload": payload,
                "is_active": profile.is_active,
                "qr_image_url": f"https://api.qrserver.com/v1/create-qr-code/?size=320x320&data={payload}",
                "barber_name": (barber.full_name or barber.username or "").strip(),
            }
        )

    def patch(self, request):
        barber = request.user.barber
        profile = QrPayService.ensure_profile(barber)
        if "is_active" in request.data:
            profile.is_active = bool(request.data.get("is_active"))
            profile.save(update_fields=["is_active", "updated_at"])
        payload = build_qr_payload(public_code=profile.public_code)
        return Response(
            {
                "public_code": profile.public_code,
                "payload": payload,
                "is_active": profile.is_active,
                "qr_image_url": f"https://api.qrserver.com/v1/create-qr-code/?size=320x320&data={payload}",
            }
        )


class BarberQrPayRequestCreateView(APIView):
    permission_classes = [IsBarber]

    def post(self, request):
        barber = request.user.barber
        raw_amount = request.data.get("amount", 0)
        try:
            amount = Decimal(str(raw_amount or 0).replace(",", ".").strip() or "0")
        except (InvalidOperation, TypeError):
            return Response({"detail": "Summa noto'g'ri."}, status=400)
        note = str(request.data.get("note") or "")[:200]
        try:
            expires = int(request.data.get("expires_minutes") or 60)
        except (TypeError, ValueError):
            expires = 60
        try:
            req = QrPayService.create_request(
                barber=barber,
                amount=amount,
                note=note,
                expires_minutes=expires,
            )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=400)
        payload = build_qr_payload(public_code=req.profile.public_code, request_id=str(req.id))
        return Response(
            {
                "id": str(req.id),
                "amount": str(req.amount),
                "note": req.note,
                "status": req.status,
                "expires_at": req.expires_at.isoformat() if req.expires_at else None,
                "payload": payload,
                "qr_image_url": f"https://api.qrserver.com/v1/create-qr-code/?size=320x320&data={payload}",
                "created_at": req.created_at.isoformat(),
            },
            status=201,
        )


class BarberQrPayPaymentsView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        barber = request.user.barber
        rows = (
            QrPayment.objects.filter(barber=barber)
            .select_related("payer", "barber")
            .order_by("-created_at")[:100]
        )
        agg = QrPayment.objects.filter(barber=barber, status=QrPayment.Status.COMPLETED).aggregate(
            total=Sum("amount"), count=Count("id")
        )
        return Response(
            {
                "total_received": str(agg["total"] or 0),
                "count": agg["count"] or 0,
                "results": [_payment_row(p) for p in rows],
            }
        )


class WalletQrPayResolveView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletQrResolveThrottle]

    def get(self, request):
        raw = (
            request.query_params.get("code")
            or request.query_params.get("payload")
            or request.query_params.get("q")
            or ""
        )
        try:
            data = QrPayService.resolve(raw=raw)
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(data)


class WalletQrPayView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletQrPayThrottle]

    def post(self, request):
        raw = (
            request.data.get("payload")
            or request.data.get("code")
            or request.data.get("qr")
            or ""
        )
        raw_amount = request.data.get("amount")
        amount = None
        if raw_amount is not None and str(raw_amount).strip() != "":
            try:
                amount = Decimal(str(raw_amount).replace(",", ".").strip())
            except (InvalidOperation, TypeError):
                return Response({"detail": "Summa noto'g'ri."}, status=400)
        note = str(request.data.get("note") or "")[:200]
        idem = (
            request.headers.get("Idempotency-Key")
            or request.data.get("idempotency_key")
            or ""
        )
        try:
            payment = QrPayService.pay(
                payer=request.user,
                raw_or_code=raw,
                amount=amount,
                note=note,
                idempotency_key=idem,
            )
        except InsufficientBalanceError as exc:
            return Response({"detail": str(exc)}, status=400)
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=400)
        payment = (
            QrPayment.objects.select_related("payer", "barber").filter(pk=payment.pk).first()
            or payment
        )
        return Response(_payment_row(payment), status=201)


class AdminQrPaymentListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = QrPayment.objects.select_related("payer", "barber").order_by("-created_at")
        q = (request.query_params.get("q") or "").strip()
        if q:
            from django.db.models import Q

            qs = qs.filter(
                Q(barber__full_name__icontains=q)
                | Q(payer__full_name__icontains=q)
                | Q(payer__phone__icontains=q)
                | Q(id__icontains=q)
                | Q(note__icontains=q)
            )
        status_f = (request.query_params.get("status") or "").strip()
        if status_f:
            qs = qs.filter(status=status_f)
        limit = min(int(request.query_params.get("page_size") or 50), 200)
        rows = list(qs[:limit])
        agg = QrPayment.objects.filter(status=QrPayment.Status.COMPLETED).aggregate(
            total=Sum("amount"), count=Count("id")
        )
        return Response(
            {
                "total_volume": str(agg["total"] or 0),
                "total_count": agg["count"] or 0,
                "results": [_payment_row(p) for p in rows],
            }
        )


class AdminQrPaymentDetailView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        p = QrPayment.objects.select_related("payer", "barber", "ledger_entry").filter(pk=pk).first()
        if not p:
            return Response({"detail": "Topilmadi."}, status=404)
        data = _payment_row(p)
        data["ledger_entry_id"] = str(p.ledger_entry_id) if p.ledger_entry_id else None
        data["finance_transaction_id"] = p.finance_transaction_id
        return Response(data)
