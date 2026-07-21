"""Payment completion — wallet top-up crediting after provider checkout."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.throttles import AuthIPThrottle, FriendlyThrottleMixin, WalletTopUpThrottle
from django.db import transaction
from wallet.payments import _provider_configured
from wallet.services.wallet_service import MIN_TOPUP_AMOUNT, WalletService, WalletServiceError


_WALLET_ORDER_RE = re.compile(r"^wallet-topup-(?P<user_id>\d+)-(?P<amount>\d+)-")


def parse_wallet_topup_order(order_id: str) -> tuple[int, Decimal] | None:
    match = _WALLET_ORDER_RE.match((order_id or "").strip())
    if not match:
        return None
    try:
        amount = Decimal(match.group("amount"))
        user_id = int(match.group("user_id"))
    except (InvalidOperation, ValueError):
        return None
    if amount < MIN_TOPUP_AMOUNT:
        return None
    return user_id, amount


class PaymentConfirmView(FriendlyThrottleMixin, APIView):
    """POST { order_id, provider, transaction_id? } — wallet top-up tasdiqlash."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]
    throttle_detail = "Juda ko'p tasdiqlash urinishi. Biroz kutib qayta urinib ko'ring."

    def post(self, request):
        order_id = str(request.data.get("order_id") or "").strip()
        provider = str(request.data.get("provider") or "").strip().lower()
        transaction_id = str(request.data.get("transaction_id") or order_id).strip()

        if provider not in ("click", "payme"):
            return Response({"detail": "provider must be click or payme."}, status=status.HTTP_400_BAD_REQUEST)

        parsed = parse_wallet_topup_order(order_id)
        if not parsed:
            return Response({"detail": "Noto'g'ri buyurtma identifikatori."}, status=status.HTTP_400_BAD_REQUEST)

        user_id, amount = parsed
        if request.user.pk != user_id:
            return Response({"detail": "Buyurtma boshqa foydalanuvchiga tegishli."}, status=status.HTTP_403_FORBIDDEN)

        configured = _provider_configured(provider)  # type: ignore[arg-type]
        if not configured:
            from django.conf import settings

            if not settings.DEBUG:
                return Response(
                    {"detail": f"{provider.upper()} hali sozlanmagan."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        user = User.objects.filter(pk=user_id, role=User.Role.USER).first()
        if not user:
            return Response({"detail": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        wallet = WalletService.ensure_wallet(user)
        idempotency_key = f"payment-{provider}-{transaction_id}"[:128]

        try:
            with transaction.atomic():
                if wallet.ledger_entries.filter(idempotency_key=idempotency_key).exists():
                    wallet.refresh_from_db()
                    return Response({"balance": wallet.balance, "already_processed": True})

                entry = WalletService.top_up(
                    wallet=wallet,
                    amount=amount,
                    idempotency_key=idempotency_key,
                    metadata={"source": f"{provider}_checkout", "order_id": order_id},
                )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        wallet.refresh_from_db()
        return Response(
            {
                "balance": wallet.balance,
                "entry_id": str(entry.pk),
                "already_processed": False,
            }
        )
