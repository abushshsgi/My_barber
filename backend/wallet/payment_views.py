import os
from decimal import Decimal, InvalidOperation

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import AuthIPThrottle, FriendlyThrottleMixin, WalletTopUpThrottle
from wallet.payments import init_checkout, list_available_providers


def _default_return_url() -> str:
    raw = os.environ.get("FRONTEND_USER_ORIGIN", "").strip()
    if raw:
        return raw.split(",")[0].strip().strip('"').strip("'").rstrip("/")
    return "http://localhost:3000"


class PaymentProvidersView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]

    def get(self, request):
        return Response({"providers": list_available_providers()})


class PaymentCheckoutView(FriendlyThrottleMixin, APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]
    throttle_detail = "Juda ko'p to'lov urinishi. Biroz kutib qayta urinib ko'ring."

    def post(self, request):
        provider = str(request.data.get("provider", "")).strip().lower()
        if provider not in ("click", "payme"):
            return Response({"detail": "provider must be click or payme."}, status=status.HTTP_400_BAD_REQUEST)

        raw_amount = request.data.get("amount")
        try:
            amount = Decimal(str(raw_amount))
        except (InvalidOperation, TypeError):
            return Response({"detail": "Invalid amount."}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"detail": "Amount must be positive."}, status=status.HTTP_400_BAD_REQUEST)

        order_id = str(request.data.get("order_id") or f"wallet-{request.user.id}")
        return_url = str(request.data.get("return_url") or _default_return_url())

        result = init_checkout(
            provider=provider,  # type: ignore[arg-type]
            amount=amount,
            order_id=order_id,
            return_url=return_url,
        )

        code = status.HTTP_200_OK if result.configured or settings.DEBUG else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(
            {
                "provider": result.provider,
                "configured": result.configured,
                "checkout_url": result.checkout_url,
                "transaction_id": result.transaction_id,
                "message": result.message,
            },
            status=code,
        )
