"""Payment completion — faqat haqiqiy provider (webhook) orqali.

Client JWT orqali /payments/confirm/ chaqirish endi pul tushirmaydi.
Click/Payme ulanishi va webhook imzo tekshiruvi bo'lguncha endpoint yopiq.
"""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import AuthIPThrottle, FriendlyThrottleMixin, WalletTopUpThrottle
from wallet.services.wallet_service import MIN_TOPUP_AMOUNT


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
    """
    Legacy client confirm — XAVFSIZ EMAS, o'chirilgan.

    Hamyonga pul faqat:
    - Click/Payme webhook (imzo tekshiruvi bilan), yoki
    - admin karta deposit tasdiqi, yoki
    - DEBUG-only /wallet/top-up/
    orqali tushishi kerak.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]
    throttle_detail = "Juda ko'p so'rov. Biroz kutib qayta urinib ko'ring."

    def post(self, request):
        provider = str(request.data.get("provider") or "").strip().lower()
        label = provider.upper() if provider in ("click", "payme") else "To'lov"
        return Response(
            {
                "detail": (
                    f"{label} orqali to'ldirish hali ulanmagan. "
                    "Hozircha faqat karta o'tkazmasi ishlaydi (admin tasdiqlaydi)."
                ),
                "credited": False,
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
