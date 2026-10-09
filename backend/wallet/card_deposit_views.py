"""User + admin APIs for manual card wallet top-up."""

from __future__ import annotations

import logging
import math
from decimal import Decimal, InvalidOperation

from django.core.signing import BadSignature, SignatureExpired
from django.http import FileResponse
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from accounts.throttles import (
    AuthIPThrottle,
    FriendlyThrottleMixin,
    WalletCardClaimThrottle,
    WalletCardInitThrottle,
    WalletTopUpThrottle,
)
from wallet.models import ManualCardDeposit
from wallet.services.card_deposit import (
    MAX_RECEIPT_BYTES,
    CardDepositService,
    admin_deposit_to_dict,
    deposit_to_dict,
    receipt_signer,
    receiving_card_config,
)
from wallet.services.deposit_abuse import claim_locked, clear_claim_failures, register_claim_failure
from wallet.services.wallet_service import WalletServiceError
from wallet.views import _idempotency_key

logger = logging.getLogger(__name__)


def _client_ip(request) -> str | None:
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    return forwarded or request.META.get("REMOTE_ADDR") or None


def _user_agent(request) -> str:
    return (request.META.get("HTTP_USER_AGENT") or "")[:512]


class WalletReceivingCardView(FriendlyThrottleMixin, APIView):
    """Kompaniya kartasi rekvizitlari (to'liq raqam faqat autentifikatsiyadan keyin)."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]
    throttle_detail = "Juda ko'p so'rov. Biroz kutib qayta urinib ko'ring."

    def get(self, request):
        try:
            cfg = receiving_card_config()
        except WalletServiceError as exc:
            return Response({"detail": str(exc), "configured": False}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(
            {
                "configured": True,
                "card_number": cfg["card_number"],
                "card_masked": cfg["card_masked"],
                "cardholder": cfg["cardholder"],
                "bank": cfg["bank"],
                "merchant_ref": cfg["merchant_ref"],
            }
        )


class WalletCardDepositInitView(FriendlyThrottleMixin, APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletCardInitThrottle, AuthIPThrottle]
    throttle_detail = "Juda ko'p to'ldirish urinishi. Keyinroq qayta urinib ko'ring."

    def post(self, request):
        raw_amount = request.data.get("amount")
        try:
            amount = Decimal(str(raw_amount))
        except (InvalidOperation, TypeError):
            return Response({"detail": "Noto'g'ri summa."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            deposit, resumed = CardDepositService.init_deposit(
                user=request.user,
                amount=amount,
                idempotency_key=_idempotency_key(request, required=True),
                client_ip=_client_ip(request),
                user_agent=_user_agent(request),
            )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payload = deposit_to_dict(deposit, include_full_card=True, request=request)
        payload["resumed"] = resumed
        return Response(
            payload,
            status=status.HTTP_200_OK if resumed else status.HTTP_201_CREATED,
        )


class WalletCardDepositClaimView(FriendlyThrottleMixin, APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletCardClaimThrottle, AuthIPThrottle]
    throttle_detail = "Juda ko'p 'to'ladim' so'rovi. Biroz kutib qayta urinib ko'ring."

    def post(self, request, deposit_id: str):
        if claim_locked(request.user.pk):
            return Response(
                {"detail": "Juda ko'p muvaffaqiyatsiz urinish. Biroz kutib qayta urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except (TypeError, ValueError):
            length = 0
        if length > MAX_RECEIPT_BYTES + 256 * 1024:
            register_claim_failure(request.user.pk)
            return Response(
                {"detail": "Chek hajmi 8 MB dan oshmasin."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        receipt = request.FILES.get("receipt") or request.FILES.get("receipt_image")
        try:
            deposit = CardDepositService.claim_deposit(
                user=request.user,
                deposit_id=deposit_id,
                receipt_file=receipt,
            )
        except WalletServiceError as exc:
            register_claim_failure(request.user.pk)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            register_claim_failure(request.user.pk)
            logger.exception("card deposit claim failed deposit_id=%s", deposit_id)
            return Response(
                {"detail": "Chek saqlanmadi. Rasmni qayta yuboring."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        clear_claim_failures(request.user.pk)
        return Response(deposit_to_dict(deposit, include_full_card=True, request=request))


class WalletCardReceiptView(APIView):
    """Chek faqat imzolangan havola bilan ochiladi. /media/ orqali ochiq emas."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, deposit_id: str):
        token = (request.query_params.get("t") or "").strip()
        try:
            raw = receipt_signer().unsign(token, max_age=6 * 60 * 60)
        except (BadSignature, SignatureExpired):
            return Response({"detail": "Chek havolasi yaroqsiz yoki eskirgan."}, status=status.HTTP_403_FORBIDDEN)
        if raw != str(deposit_id):
            return Response({"detail": "Chek havolasi yaroqsiz."}, status=status.HTTP_403_FORBIDDEN)
        deposit = ManualCardDeposit.objects.filter(pk=deposit_id).first()
        if not deposit or not deposit.receipt_image:
            return Response({"detail": "Chek topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        name = (deposit.receipt_image.name or "").lower()
        content_type = "image/jpeg"
        if name.endswith(".png"):
            content_type = "image/png"
        elif name.endswith(".webp"):
            content_type = "image/webp"
        handle = deposit.receipt_image.open("rb")
        response = FileResponse(handle, content_type=content_type)
        response["Cache-Control"] = "private, max-age=300"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class WalletCardDepositListView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]

    def get(self, request):
        rows = CardDepositService.list_for_user(request.user)
        return Response(
            [
                deposit_to_dict(
                    d,
                    include_full_card=d.status == ManualCardDeposit.Status.AWAITING_PAYMENT,
                    request=request,
                )
                for d in rows
            ]
        )


class AdminWalletDepositsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        status_q = (request.query_params.get("status") or "").strip() or None
        q = (request.query_params.get("q") or "").strip()
        overdue = str(request.query_params.get("overdue") or "").strip().lower() in {"1", "true", "yes"}
        try:
            page = int(request.query_params.get("page") or 1)
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = int(request.query_params.get("page_size") or 8)
        except (TypeError, ValueError):
            page_size = 8
        rows, total, page, page_size = CardDepositService.page_for_admin(
            status=status_q,
            q=q,
            overdue=overdue,
            page=page,
            page_size=page_size,
        )
        total_pages = max(1, math.ceil(total / page_size)) if page_size else 1
        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "counts": CardDepositService.status_counts(),
                "results": [admin_deposit_to_dict(d, request=request) for d in rows],
            }
        )


class AdminWalletDepositApproveView(FriendlyThrottleMixin, APIView):
    permission_classes = [IsAdmin]
    throttle_classes = [WalletTopUpThrottle]
    throttle_detail = "Juda ko'p tasdiqlash urinishi."

    def post(self, request, deposit_id: str):
        note = str(request.data.get("note") or "").strip()
        confirm_ref = "".join(str(request.data.get("confirm_ref") or "").split()).upper()
        pending = (
            ManualCardDeposit.objects.filter(pk=deposit_id)
            .only("transaction_ref", "status")
            .first()
        )
        if not pending:
            return Response({"detail": "So'rov topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        expected = "".join(str(pending.transaction_ref or "").split()).upper()
        if pending.status != ManualCardDeposit.Status.APPROVED and confirm_ref != expected:
            return Response(
                {"detail": "Tasdiqlash uchun izoh kodini qayta kiriting. Kod mos kelmadi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        admin = getattr(request.user, "admin_account", None)
        try:
            deposit = CardDepositService.approve_deposit(
                deposit_id=deposit_id,
                admin_id=getattr(admin, "pk", None) or getattr(request.user, "pk", None),
                admin_email=getattr(admin, "email", "") or "",
                note=note,
            )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from config.api_cache import bust_prefix

            bust_prefix("admin:finance:overview")
            bust_prefix("admin:stats:wallet")
        except Exception:
            pass

        deposit.wallet.refresh_from_db()
        return Response(
            {
                "deposit": admin_deposit_to_dict(deposit, request=request),
                "balance": deposit.wallet.balance,
            }
        )


class AdminWalletDepositRejectView(FriendlyThrottleMixin, APIView):
    permission_classes = [IsAdmin]
    throttle_classes = [WalletTopUpThrottle]
    throttle_detail = "Juda ko'p rad etish urinishi."

    def post(self, request, deposit_id: str):
        note = str(request.data.get("note") or "").strip()
        admin = getattr(request.user, "admin_account", None)
        try:
            deposit = CardDepositService.reject_deposit(
                deposit_id=deposit_id,
                admin_id=getattr(admin, "pk", None) or getattr(request.user, "pk", None),
                admin_email=getattr(admin, "email", "") or "",
                note=note,
            )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from config.api_cache import bust_prefix

            bust_prefix("admin:finance:overview")
            bust_prefix("admin:stats:wallet")
        except Exception:
            pass

        return Response({"deposit": admin_deposit_to_dict(deposit, request=request)})
