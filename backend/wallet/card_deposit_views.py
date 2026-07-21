"""User + admin APIs for manual card wallet top-up."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from rest_framework import status
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
from wallet.services.card_deposit import (
    CardDepositService,
    admin_deposit_to_dict,
    deposit_to_dict,
    receiving_card_config,
)
from wallet.services.wallet_service import WalletServiceError
from wallet.views import _idempotency_key


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

        payload = deposit_to_dict(deposit, include_full_card=True)
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
        try:
            deposit = CardDepositService.claim_deposit(user=request.user, deposit_id=deposit_id)
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(deposit_to_dict(deposit, include_full_card=True))


class WalletCardDepositListView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]

    def get(self, request):
        rows = CardDepositService.list_for_user(request.user)
        # O'z so'rovlari — to'liq karta raqami kerak (resume uchun)
        return Response([deposit_to_dict(d, include_full_card=True) for d in rows])


class AdminWalletDepositsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        status_q = (request.query_params.get("status") or "").strip() or None
        q = (request.query_params.get("q") or "").strip()
        rows = CardDepositService.list_for_admin(status=status_q, q=q)
        return Response(
            {
                "count": len(rows),
                "results": [admin_deposit_to_dict(d) for d in rows],
            }
        )


class AdminWalletDepositApproveView(FriendlyThrottleMixin, APIView):
    permission_classes = [IsAdmin]
    throttle_classes = [WalletTopUpThrottle]
    throttle_detail = "Juda ko'p tasdiqlash urinishi."

    def post(self, request, deposit_id: str):
        note = str(request.data.get("note") or "").strip()
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

        deposit.wallet.refresh_from_db()
        return Response(
            {
                "deposit": admin_deposit_to_dict(deposit),
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
        return Response({"deposit": admin_deposit_to_dict(deposit)})
