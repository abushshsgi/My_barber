import logging
import os

from rest_framework import status
from rest_framework.permissions import AllowAny

from accounts.customer_permissions import IsAuthenticatedCustomer
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.payment import (
    confirm_provider_payment,
    start_provider_checkout,
)
from subscriptions.payme_client import PaymeError, PaymeNotConfigured
from subscriptions.payme_service import PaymePaymentError, serialize_payme_payment, sync_payme_payment
from subscriptions.plans import PLAN_CODES, list_plans, serialize_plan
from subscriptions.promos import list_public_promos, resolve_checkout_price
from subscriptions.services import (
    CARE_PLUS_REQUIRED,
    CANCEL_STILL_PREMIUM_MESSAGE,
    build_me_payload,
    can_use_morph_care,
    can_use_morph_care_pro,
    cancel_user_subscription,
    checkout_plan_error,
    has_premium_access,
    serialize_subscription,
)
from subscriptions.throttles import (
    SubscriptionCancelThrottle,
    SubscriptionCheckoutThrottle,
    SubscriptionConfirmThrottle,
    SubscriptionIPThrottle,
    SubscriptionPaymentStatusThrottle,
)

logger = logging.getLogger(__name__)


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


class SubscriptionCancelView(APIView):
    """Obunani bekor qilish — Payme refund/cancel chaqirilmaydi."""

    permission_classes = [IsAuthenticatedCustomer]
    throttle_classes = [SubscriptionCancelThrottle, SubscriptionIPThrottle]
    throttle_detail = "Obunani bekor qilish limiti. Biroz kutib qayta urinib ko'ring."

    def post(self, request):
        # Mijoz yuborgan user_id / status / expires_at e'tiborga olinmaydi.
        try:
            sub = cancel_user_subscription(user=request.user, request=request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        premium = has_premium_access(sub)
        return Response(
            {
                "ok": True,
                "status": sub.status,
                "is_premium": premium,
                "auto_renew": False,
                "expires_at": sub.ends_at.isoformat() if sub.ends_at else None,
                "cancelled_at": sub.cancelled_at.isoformat() if sub.cancelled_at else None,
                "can_cancel": False,
                "message": CANCEL_STILL_PREMIUM_MESSAGE,
                "subscription": serialize_subscription(sub),
                "me": build_me_payload(request.user),
            }
        )


class SubscriptionCheckoutView(APIView):
    permission_classes = [IsAuthenticatedCustomer]
    throttle_classes = [SubscriptionCheckoutThrottle, SubscriptionIPThrottle]
    throttle_detail = "Obuna so'rovlari limiti. Biroz kutib qayta urinib ko'ring."

    def post(self, request):
        plan_code = str(request.data.get("plan_code") or "").strip().lower()
        blocked = checkout_plan_error(user=request.user, plan_code=plan_code)
        if blocked:
            return Response({"detail": blocked}, status=status.HTTP_400_BAD_REQUEST)

        method = str(request.data.get("method") or request.data.get("provider") or "payme").strip().lower()
        promo_code = str(request.data.get("promo_code") or "").strip() or None
        return_url = str(request.data.get("return_url") or _default_return_url()).strip()
        if not return_url.startswith(("http://", "https://")):
            return Response({"detail": "return_url noto'g'ri."}, status=status.HTTP_400_BAD_REQUEST)

        if method in ("wallet", "click"):
            return Response(
                {
                    "detail": (
                        "AI Premium faqat Payme Subscribe orqali to'lanadi. "
                        "Hamyon, Click, karta raqami va chek yuklash o'chirilgan."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if method == "payme":
            try:
                payload = start_provider_checkout(
                    user=request.user,
                    plan_code=plan_code,
                    provider=method,
                    return_url=return_url,
                    request=request,
                    promo_code=promo_code,
                )
            except PaymeNotConfigured as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except (PaymeError, PaymePaymentError, ValueError) as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

            code = (
                status.HTTP_200_OK
                if payload.get("ok")
                else status.HTTP_503_SERVICE_UNAVAILABLE
            )
            return Response(payload, status=code)

        return Response(
            {"detail": "method payme bo'lishi kerak."},
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


class SubscriptionPaymentStatusView(APIView):
    """Payme checkout holati — faqat server tekshiruvi, mijoz 'paid' deb o'tolmaydi."""

    permission_classes = [IsAuthenticatedCustomer]
    throttle_classes = [SubscriptionPaymentStatusThrottle]
    throttle_detail = "To'lov holati so'rovlari limiti. Biroz kuting."

    def get(self, request, order_id: str):
        order_id = str(order_id or "").strip()
        if not order_id:
            return Response({"detail": "order_id majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        from subscriptions.models import SubscriptionPayment

        payment = SubscriptionPayment.objects.filter(order_id=order_id, user=request.user).first()
        if not payment:
            return Response({"detail": "To'lov topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        sync_error = ""
        if payment.provider == "payme" and payment.payme_receipt_id:
            try:
                payment = sync_payme_payment(user=request.user, order_id=order_id, request=request)
            except (PaymePaymentError, PaymeError) as exc:
                logger.warning("payme status sync failed order=%s", order_id)
                sync_error = str(exc)[:180]
        payload = serialize_payme_payment(payment)
        payload["ok"] = payment.status == payment.Status.PAID
        if sync_error:
            payload["sync_error"] = sync_error
        return Response(payload)


class SubscriptionCareAccessView(APIView):
    """Parvarish Plus; SOS/Javon — Pro."""

    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        allowed = can_use_morph_care(request.user)
        pro_allowed = can_use_morph_care_pro(request.user)
        return Response(
            {
                "allowed": allowed,
                "pro_allowed": pro_allowed,
                "code": "ok" if allowed else "care_plus",
                "detail": None if allowed else CARE_PLUS_REQUIRED,
            }
        )
