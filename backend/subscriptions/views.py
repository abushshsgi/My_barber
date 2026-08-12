import os

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny

from accounts.customer_permissions import IsAuthenticatedCustomer
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.payment import (
    confirm_provider_payment,
    pay_with_wallet,
    start_provider_checkout,
)
from subscriptions.plans import PLAN_CODES, list_plans, serialize_plan
from subscriptions.promos import list_public_promos, resolve_checkout_price
from subscriptions.services import build_me_payload, can_use_morph_care, serialize_subscription
from subscriptions.throttles import (
    SubscriptionCheckoutThrottle,
    SubscriptionConfirmThrottle,
    SubscriptionIPThrottle,
)
from wallet.services.wallet_service import InsufficientBalanceError, WalletServiceError


def _default_return_url() -> str:
    raw = os.environ.get("FRONTEND_USER_ORIGIN", "").strip()
    if raw:
        return raw.split(",")[0].strip().strip('"').strip("'").rstrip("/")
    return "http://localhost:3000"


class SubscriptionPlansView(APIView):
    """Tarif katalogi — narxlarni ko‘rish uchun login shart emas."""

    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "plans": [serialize_plan(p) for p in list_plans()],
                "promos": list_public_promos(),
            }
        )


class SubscriptionPromoPreviewView(APIView):
    """Promokod + tarif → yakuniy narx (checkout oldidan)."""

    permission_classes = [IsAuthenticatedCustomer]
    throttle_classes = [SubscriptionCheckoutThrottle, SubscriptionIPThrottle]

    def post(self, request):
        plan_code = str(request.data.get("plan_code") or "").strip().lower()
        promo_code = str(request.data.get("promo_code") or "").strip()
        if plan_code not in PLAN_CODES:
            return Response(
                {"detail": "plan_code starter, plus yoki pro bo'lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            priced = resolve_checkout_price(
                plan_code=plan_code,
                promo_code=promo_code or None,
                user=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"ok": True, **priced})


class SubscriptionMeView(APIView):
    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        return Response(build_me_payload(request.user))


class SubscriptionCheckoutView(APIView):
    permission_classes = [IsAuthenticatedCustomer]
    throttle_classes = [SubscriptionCheckoutThrottle, SubscriptionIPThrottle]
    throttle_detail = "Obuna so'rovlari limiti. Biroz kutib qayta urinib ko'ring."

    def post(self, request):
        plan_code = str(request.data.get("plan_code") or "").strip().lower()
        if plan_code not in PLAN_CODES:
            return Response(
                {"detail": "plan_code starter, plus yoki pro bo'lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method = str(request.data.get("method") or request.data.get("provider") or "wallet").strip().lower()
        promo_code = str(request.data.get("promo_code") or "").strip() or None
        return_url = str(request.data.get("return_url") or _default_return_url()).strip()
        if not return_url.startswith(("http://", "https://")):
            return Response({"detail": "return_url noto'g'ri."}, status=status.HTTP_400_BAD_REQUEST)

        if method == "wallet":
            try:
                sub = pay_with_wallet(
                    user=request.user,
                    plan_code=plan_code,
                    request=request,
                    promo_code=promo_code,
                )
            except InsufficientBalanceError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_402_PAYMENT_REQUIRED)
            except WalletServiceError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {
                    "ok": True,
                    "method": "wallet",
                    "subscription": serialize_subscription(sub),
                    "me": build_me_payload(request.user),
                    "promo_code": promo_code,
                },
                status=status.HTTP_201_CREATED,
            )

        if method in ("click", "payme"):
            try:
                payload = start_provider_checkout(
                    user=request.user,
                    plan_code=plan_code,
                    provider=method,
                    return_url=return_url,
                    request=request,
                    promo_code=promo_code,
                )
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

            code = (
                status.HTTP_200_OK
                if payload.get("ok")
                else status.HTTP_503_SERVICE_UNAVAILABLE
            )
            return Response(payload, status=code)

        return Response(
            {"detail": "method wallet, click yoki payme bo'lishi kerak."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class SubscriptionConfirmView(APIView):
    permission_classes = [IsAuthenticatedCustomer]
    throttle_classes = [SubscriptionConfirmThrottle, SubscriptionIPThrottle]
    throttle_detail = "To'lov tasdiqlash limiti."

    def post(self, request):
        order_id = str(request.data.get("order_id") or "").strip()
        provider = str(request.data.get("provider") or "").strip().lower()
        transaction_id = str(request.data.get("transaction_id") or "").strip()

        if not order_id:
            return Response({"detail": "order_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sub = confirm_provider_payment(
                user=request.user,
                order_id=order_id,
                provider=provider,
                transaction_id=transaction_id,
                request=request,
            )
        except PermissionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(
            {
                "ok": True,
                "subscription": serialize_subscription(sub),
                "me": build_me_payload(request.user),
            }
        )


class SubscriptionCareAccessView(APIView):
    """Morph AI Parvarish — faqat Pro (yoki care entitlements)."""

    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        allowed = can_use_morph_care(request.user)
        return Response(
            {
                "allowed": allowed,
                "detail": None
                if allowed
                else "Morph AI Parvarish Pro obunasida mavjud.",
            }
        )
