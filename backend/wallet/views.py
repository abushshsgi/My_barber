from decimal import Decimal

from django.conf import settings
from django.db.models import Q
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdmin
from accounts.phone_auth import normalize_uz_phone
from accounts.throttles import AuthIPThrottle, WalletGiftThrottle, WalletTopUpThrottle
from wallet.gift_designs import gift_design_to_dict, list_gift_designs
from wallet.models import GiftTransfer, LedgerEntry, Wallet
from wallet.serializers import (
    GiftSendSerializer,
    GiftTransferSerializer,
    LedgerEntrySerializer,
    WalletMeSerializer,
    WalletTopUpSerializer,
)
from wallet.services.wallet_number import normalize_wallet_number
from wallet.services.wallet_service import (
    InsufficientBalanceError,
    WalletService,
    WalletServiceError,
)


def _idempotency_key(request, *, required: bool = False) -> str:
    key = (
        request.headers.get("Idempotency-Key") or request.headers.get("idempotency-key") or ""
    ).strip()
    if not key:
        if required:
            raise WalletServiceError("Idempotency-Key header majburiy.")
        key = f"req-{request.user.pk}-{request.path}"
    return key[:128]


class WalletMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet = WalletService.ensure_wallet(request.user)
        return Response(WalletMeSerializer(wallet).data)


class WalletTxPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class WalletTransactionsView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LedgerEntrySerializer
    pagination_class = WalletTxPagination

    def get_queryset(self):
        wallet = WalletService.ensure_wallet(self.request.user)
        qs = LedgerEntry.objects.filter(wallet=wallet).order_by("-created_at")
        direction = self.request.query_params.get("direction", "all")
        if direction == "in":
            qs = qs.filter(amount__gte=0)
        elif direction == "out":
            qs = qs.filter(amount__lt=0)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        results = response.data.get("results")
        if not isinstance(results, list):
            return response

        gift_ids = {
            str(row.get("reference_id") or "")
            for row in results
            if row.get("entry_type") in ("gift_in", "gift_out")
            and row.get("reference_type") == "gift_transfer"
            and row.get("reference_id")
        }
        if not gift_ids:
            return response

        gifts = {
            str(g.id): g
            for g in GiftTransfer.objects.filter(id__in=gift_ids).select_related(
                "sender_wallet__user", "recipient_wallet__user"
            )
        }
        for row in results:
            gift = gifts.get(str(row.get("reference_id") or ""))
            if not gift:
                continue
            meta = dict(row.get("metadata") or {})
            sender = gift.sender_wallet.user
            recipient = gift.recipient_wallet.user
            meta.setdefault(
                "sender_name",
                (sender.full_name or sender.phone or str(sender.pk)).strip(),
            )
            meta.setdefault("sender_user_id", sender.pk)
            meta.setdefault(
                "recipient_name",
                (recipient.full_name or recipient.phone or str(recipient.pk)).strip(),
            )
            meta.setdefault("recipient_user_id", recipient.pk)
            meta.setdefault("design_id", gift.design_id)
            meta.setdefault("message", (gift.message or "")[:200])
            from wallet.services.wallet_number import mask_wallet_number

            meta.setdefault(
                "sender_wallet_masked",
                mask_wallet_number(gift.sender_wallet.wallet_number),
            )
            meta.setdefault(
                "recipient_wallet_masked",
                mask_wallet_number(gift.recipient_wallet.wallet_number),
            )
            row["metadata"] = meta
        return response


class WalletTopUpView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]

    def post(self, request):
        if not settings.DEBUG:
            return Response(
                {"detail": "To'ldirish hozircha admin orqali amalga oshiriladi."},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = WalletTopUpSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        amount = ser.validated_data["amount"]
        max_daily = Decimal(str(getattr(settings, "WALLET_DEBUG_TOPUP_MAX", 1_000_000)))
        daily = WalletService.debug_topup_daily_total(request.user)
        if daily + amount > max_daily:
            return Response(
                {"detail": f"Kunlik test limit: {max_daily} so'm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet = WalletService.ensure_wallet(request.user)
        try:
            entry = WalletService.top_up(
                wallet=wallet,
                amount=amount,
                idempotency_key=_idempotency_key(request),
                metadata={"source": "debug_topup"},
            )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        wallet.refresh_from_db()
        return Response(
            {
                "balance": wallet.balance,
                "entry": LedgerEntrySerializer(entry).data,
            }
        )


class WalletGiftDesignsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([gift_design_to_dict(d) for d in list_gift_designs()])


class WalletGiftSendView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [WalletGiftThrottle, AuthIPThrottle]

    def post(self, request):
        ser = GiftSendSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            gift = WalletService.send_gift(
                sender=request.user,
                gift_amount=data["gift_amount"],
                design_id=data["design_id"],
                message=data.get("message") or "",
                idempotency_key=_idempotency_key(request, required=True),
                recipient_user_id=data.get("recipient_user_id"),
                recipient_phone=data.get("recipient_phone"),
                recipient_wallet_number=data.get("recipient_wallet_number"),
            )
        except InsufficientBalanceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sender_wallet = WalletService.ensure_wallet(request.user)
        sender_wallet.refresh_from_db()
        gift = (
            GiftTransfer.objects.select_related(
                "sender_wallet__user", "recipient_wallet__user"
            ).get(pk=gift.pk)
        )
        return Response(
            {
                "balance": sender_wallet.balance,
                "gift": GiftTransferSerializer(gift).data,
            },
            status=status.HTTP_201_CREATED,
        )


class WalletGiftReceivedView(ListAPIView):
    """Qabul qilingan sovg'a kartalar — kimdan kelgani bilan."""

    permission_classes = [IsAuthenticated]
    serializer_class = GiftTransferSerializer
    pagination_class = WalletTxPagination

    def get_queryset(self):
        wallet = WalletService.ensure_wallet(self.request.user)
        return (
            GiftTransfer.objects.filter(recipient_wallet=wallet)
            .exclude(status=GiftTransfer.Status.FAILED)
            .select_related("sender_wallet__user", "recipient_wallet__user")
            .order_by("-created_at")
        )


class WalletRecipientSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response([])

        wallet_qs = Wallet.objects.select_related("user").exclude(user=request.user)
        digits = normalize_wallet_number(q)
        phone = normalize_uz_phone(q)

        filters = Q(user__full_name__icontains=q)
        if phone:
            filters |= Q(user__phone=phone)
        if len(digits) >= 4:
            from wallet.services.wallet_number import format_wallet_number

            filters |= Q(wallet_number__icontains=digits)
            if len(digits) == 16:
                try:
                    formatted = format_wallet_number(digits)
                    filters |= Q(wallet_number=formatted)
                except ValueError:
                    pass

        results = wallet_qs.filter(filters).order_by("user__full_name")[:20]
        payload = [
            {
                "user_id": w.user_id,
                "full_name": w.user.full_name or "",
                "phone": w.user.phone,
                "wallet_number": w.wallet_number,
            }
            for w in results
        ]
        return Response(payload)


class AdminWalletTopUpView(APIView):
    """Admin manual top-up for a user (admin JWT)."""

    permission_classes = [IsAdmin]
    throttle_classes = [WalletTopUpThrottle, AuthIPThrottle]

    def post(self, request):
        user_id = request.data.get("user_id")
        amount_raw = request.data.get("amount")
        if not user_id or amount_raw is None:
            return Response(
                {"detail": "user_id va amount kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(pk=int(user_id), role=User.Role.USER)
            amount = Decimal(str(amount_raw))
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Noto'g'ri ma'lumot."}, status=status.HTTP_400_BAD_REQUEST)

        wallet = WalletService.ensure_wallet(user)
        try:
            entry = WalletService.top_up(
                wallet=wallet,
                amount=amount,
                idempotency_key=_idempotency_key(request),
                metadata={"source": "admin_topup", "admin_id": getattr(request.user, "pk", None)},
            )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        wallet.refresh_from_db()
        return Response(
            {
                "user_id": user.pk,
                "balance": wallet.balance,
                "entry": LedgerEntrySerializer(entry).data,
            }
        )
