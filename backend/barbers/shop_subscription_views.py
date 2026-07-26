"""Sartarosh SaaS obuna API — plans / me / checkout / confirm."""

from __future__ import annotations

import os

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import FriendlyThrottleMixin
from barbers.permissions import IsBarber
from barbers.shop_plans import PLAN_CODES, list_plans, serialize_plan
from barbers.shop_subscription_payment import (
    confirm_provider_payment,
    pay_with_barber_wallet,
    start_provider_checkout,
)
from barbers.shop_subscription_services import build_me_payload, serialize_subscription
from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle
from wallet.services.wallet_service import InsufficientBalanceError, WalletServiceError
from wallet.payments import list_available_providers


class BarberShopCheckoutThrottle(FriendlyThrottleMixin, UserRateThrottle):
    scope = "barber_shop_checkout"
    throttle_detail = "Obuna so'rovlari limiti. Biroz kutib qayta urinib ko'ring."


class BarberShopConfirmThrottle(FriendlyThrottleMixin, UserRateThrottle):
    scope = "barber_shop_confirm"
    throttle_detail = "To'lov tasdiqlash limiti."


class BarberShopClaimTrialThrottle(FriendlyThrottleMixin, UserRateThrottle):
    scope = "barber_shop_claim_trial"
    throttle_detail = "Trial so'rovlari limiti. Keyinroq qayta urinib ko'ring."


class BarberShopIPThrottle(FriendlyThrottleMixin, SimpleRateThrottle):
    scope = "barber_shop_ip"
    throttle_detail = "Juda ko'p urinish. Keyinroq qayta urinib ko'ring."

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


def _default_return_url() -> str:
    raw = os.environ.get("FRONTEND_BARBER_ORIGIN", "").strip()
    if raw:
        return raw.split(",")[0].strip().strip('"').strip("'").rstrip("/") + "/barber/subscription"
    return "http://localhost:3001/barber/subscription"


class BarberShopPlansView(APIView):
    """GET — tarif katalogi (narxlar serverdan). Obunasiz ham ochiq."""

    permission_classes = [IsBarber]
    throttle_classes = [BarberShopIPThrottle]

    def get(self, request):
        return Response(
            {
                "plans": [serialize_plan(p) for p in list_plans()],
                "providers": list_available_providers(),
                "currency": "UZS",
                "required": True,
            }
        )


class BarberShopMeView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        return Response(build_me_payload(request.user.barber))


class BarberShopCheckoutView(APIView):
    permission_classes = [IsBarber]
    throttle_classes = [BarberShopCheckoutThrottle, BarberShopIPThrottle]
    throttle_detail = "Obuna so'rovlari limiti."

    def post(self, request):
        barber = request.user.barber
        plan_code = str(request.data.get("plan_code") or "").strip().lower()
        if plan_code not in PLAN_CODES:
            return Response(
                {"detail": "plan_code start, business yoki pro bo'lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method = str(
            request.data.get("method") or request.data.get("provider") or "click"
        ).strip().lower()
        return_url = str(request.data.get("return_url") or _default_return_url()).strip()
        client_idem = str(request.data.get("idempotency_key") or "").strip()

        if method == "wallet":
            try:
                sub = pay_with_barber_wallet(barber=barber, plan_code=plan_code, request=request)
            except InsufficientBalanceError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_402_PAYMENT_REQUIRED)
            except (WalletServiceError, ValueError) as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {
                    "ok": True,
                    "method": "wallet",
                    "subscription": serialize_subscription(sub),
                    "me": build_me_payload(barber),
                },
                status=status.HTTP_201_CREATED,
            )

        if method in ("click", "payme"):
            try:
                payload = start_provider_checkout(
                    barber=barber,
                    plan_code=plan_code,
                    provider=method,
                    return_url=return_url,
                    request=request,
                    client_idempotency=client_idem,
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


class BarberShopConfirmView(APIView):
    permission_classes = [IsBarber]
    throttle_classes = [BarberShopConfirmThrottle, BarberShopIPThrottle]

    def post(self, request):
        barber = request.user.barber
        order_id = str(request.data.get("order_id") or "").strip()
        provider = str(request.data.get("provider") or "").strip().lower()
        if not order_id or not provider:
            return Response(
                {"detail": "order_id va provider kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            sub = confirm_provider_payment(
                barber=barber,
                order_id=order_id,
                provider=provider,
                request=request,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(
            {
                "ok": True,
                "subscription": serialize_subscription(sub),
                "me": build_me_payload(barber),
            }
        )


class BarberShopClaimAgentTrialView(APIView):
    """POST — obuna sahifasida agent kod / QR → 21 kunlik bir martalik trial."""

    permission_classes = [IsBarber]
    throttle_classes = [BarberShopClaimTrialThrottle, BarberShopIPThrottle]
    throttle_detail = "Trial so'rovlari limiti."

    def post(self, request):
        from barbers.partner_trial import PartnerTrialError, claim_agent_trial_with_code
        from barbers.shop_subscription_services import log_event

        barber = request.user.barber
        raw = request.data.get("agent_code") or request.data.get("code") or ""
        try:
            grant = claim_agent_trial_with_code(
                barber=barber,
                code=raw,
                request=request,
            )
        except PartnerTrialError as exc:
            log_event(
                action="agent_trial_denied",
                barber=barber,
                actor="barber",
                detail={"code": exc.code, "detail": exc.detail, "raw_len": len(str(raw))},
                request=request,
            )
            status_code = (
                status.HTTP_409_CONFLICT
                if exc.code in ("already_used", "has_active_subscription")
                else status.HTTP_400_BAD_REQUEST
            )
            return Response(
                {"detail": exc.detail, "code": exc.code},
                status=status_code,
            )

        barber.refresh_from_db()
        sub = grant.shop_subscription
        from agents.referral import TRIAL_DAYS, TRIAL_VALUE_UZS

        return Response(
            {
                "ok": True,
                "trial_days": TRIAL_DAYS,
                "trial_value_uzs": TRIAL_VALUE_UZS,
                "grant": {
                    "ends_at": grant.ends_at.isoformat() if grant.ends_at else None,
                    "granted_at": grant.granted_at.isoformat() if grant.granted_at else None,
                    "source": grant.source,
                    "agent_code": grant.code_used,
                    "trial_value_uzs": grant.trial_value_uzs,
                },
                "subscription": serialize_subscription(sub),
                "me": build_me_payload(barber),
                "message": "21 kunlik bepul trial faollashtirildi.",
            },
            status=status.HTTP_201_CREATED,
        )
