from decimal import Decimal

from django.conf import settings
from django.db.models import CharField, Q, Value
from django.db.models.functions import Replace
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.customer_permissions import IsAuthenticatedCustomer

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
from wallet.services.wallet_number import (
    format_wallet_number,
    mask_wallet_number,
    normalize_wallet_number,
)
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
    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        wallet = WalletService.ensure_wallet(request.user)
        return Response(WalletMeSerializer(wallet).data)


class WalletTxPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class WalletTransactionsView(ListAPIView):
    permission_classes = [IsAuthenticatedCustomer]
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
    permission_classes = [IsAuthenticatedCustomer]
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
    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        return Response([gift_design_to_dict(d) for d in list_gift_designs()])


class WalletGiftSendView(APIView):
    permission_classes = [IsAuthenticatedCustomer]
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

    permission_classes = [IsAuthenticatedCustomer]
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
    permission_classes = [IsAuthenticatedCustomer]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response([])

        digits = normalize_wallet_number(q)
        phone = normalize_uz_phone(q)

        # wallet_number DB da "7700 1234 …" bo'shliqli; raqam bilan qidirish uchun spacesiz annotate.
        # Muzlatilgan hamyonlar hech qachon chiqmaydi (xavfsizlik).
        wallet_qs = (
            Wallet.objects.select_related("user")
            .exclude(user=request.user)
            .exclude(is_frozen=True)
            .annotate(
                wallet_digits=Replace(
                    "wallet_number",
                    Value(" "),
                    Value(""),
                    output_field=CharField(),
                )
            )
        )

        filters = Q()
        # Ism (qisman): "Ali" → Ali* ismlar
        if any(ch.isalpha() for ch in q) or not digits:
            filters |= Q(user__full_name__icontains=q)

        # Telefon: faqat to'liq/normalizatsiya yoki 9+ raqam — javobda telefon qaytmaydi
        if phone:
            filters |= Q(user__phone=phone)
        elif len(digits) >= 9:
            filters |= Q(user__phone__icontains=digits[-9:])

        # Hamyon: faqat to'liq 16 xona — egasi chiqadi; raqam javobda maskalanadi
        if len(digits) == 16:
            try:
                filters |= Q(wallet_number=format_wallet_number(digits)) | Q(
                    wallet_digits=digits
                )
            except ValueError:
                filters |= Q(wallet_digits=digits)

        if not filters:
            return Response([])

        results = wallet_qs.filter(filters).order_by("user__full_name")[:20]
        payload = [
            {
                "user_id": w.user_id,
                "full_name": w.user.full_name or "",
                # Maxfiylik: telefon va to'liq hamyon hech qachon qaytmaydi
                "phone": None,
                "wallet_number": mask_wallet_number(w.wallet_number),
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


def _actor_label(user) -> str:
    return (
        (getattr(user, "full_name", None) or "").strip()
        or (getattr(user, "email", None) or "").strip()
        or (getattr(user, "phone", None) or "").strip()
        or f"id:{getattr(user, 'pk', '')}"
    )


class WalletFreezeView(APIView):
    """Foydalanuvchi o'z kartasini muzlatadi / ochadi."""

    permission_classes = [IsAuthenticatedCustomer]

    def post(self, request):
        action = (request.data.get("action") or "freeze").strip().lower()
        reason = (request.data.get("reason") or "").strip()
        wallet = WalletService.ensure_wallet(request.user)
        label = _actor_label(request.user)
        try:
            if action == "unfreeze":
                wallet = WalletService.unfreeze_wallet(
                    wallet=wallet,
                    actor_type=Wallet.FreezeBy.USER,
                    reason=reason or "Foydalanuvchi ochdi",
                    actor_user_id=request.user.pk,
                    actor_label=label,
                )
            else:
                wallet = WalletService.freeze_wallet(
                    wallet=wallet,
                    actor_type=Wallet.FreezeBy.USER,
                    reason=reason or "Foydalanuvchi muzlatdi",
                    actor_user_id=request.user.pk,
                    actor_label=label,
                )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(WalletMeSerializer(wallet).data)


class AdminWalletFrozenListView(APIView):
    """Muzlatilgan hamyonlar — admin paneli."""

    permission_classes = [IsAdmin]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = (
            Wallet.objects.filter(is_frozen=True)
            .select_related("user", "card")
            .order_by("-frozen_at", "-updated_at")
        )
        if q:
            qs = qs.filter(
                Q(wallet_number__icontains=q)
                | Q(user__full_name__icontains=q)
                | Q(user__phone__icontains=q)
                | Q(user__email__icontains=q)
                | Q(frozen_by_label__icontains=q)
            )
        results = []
        for w in qs[:200]:
            u = w.user
            results.append(
                {
                    "id": w.pk,
                    "wallet_number": w.wallet_number,
                    "balance": w.balance,
                    "is_frozen": w.is_frozen,
                    "frozen_at": w.frozen_at,
                    "frozen_by": w.frozen_by,
                    "frozen_by_label": w.frozen_by_label,
                    "frozen_by_user_id": w.frozen_by_user_id,
                    "frozen_by_admin_id": w.frozen_by_admin_id,
                    "freeze_reason": w.freeze_reason,
                    "freeze_log": w.freeze_log or [],
                    "user": {
                        "id": u.pk,
                        "full_name": u.full_name or "",
                        "phone": u.phone or "",
                        "email": u.email or "",
                    },
                    "cardholder_name": getattr(getattr(w, "card", None), "cardholder_name", "")
                    or "",
                }
            )
        return Response({"count": len(results), "results": results})


class AdminWalletFreezeView(APIView):
    """Admin: foydalanuvchi hamyonini muzlatish / ochish."""

    permission_classes = [IsAdmin]

    def post(self, request, wallet_id: int):
        action = (request.data.get("action") or "freeze").strip().lower()
        reason = (request.data.get("reason") or "").strip()
        wallet = (
            Wallet.objects.select_related("user", "card").filter(pk=wallet_id).first()
        )
        if not wallet:
            return Response({"detail": "Hamyon topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        label = _actor_label(request.user)
        try:
            if action == "unfreeze":
                wallet = WalletService.unfreeze_wallet(
                    wallet=wallet,
                    actor_type=Wallet.FreezeBy.ADMIN,
                    reason=reason or "Admin ochdi",
                    actor_admin_id=request.user.pk,
                    actor_label=label,
                )
            else:
                wallet = WalletService.freeze_wallet(
                    wallet=wallet,
                    actor_type=Wallet.FreezeBy.ADMIN,
                    reason=reason or "Admin muzlatdi",
                    actor_admin_id=request.user.pk,
                    actor_label=label,
                )
        except WalletServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        u = wallet.user
        return Response(
            {
                "id": wallet.pk,
                "wallet_number": wallet.wallet_number,
                "is_frozen": wallet.is_frozen,
                "frozen_at": wallet.frozen_at,
                "frozen_by": wallet.frozen_by,
                "frozen_by_label": wallet.frozen_by_label,
                "freeze_reason": wallet.freeze_reason,
                "freeze_log": wallet.freeze_log or [],
                "user": {
                    "id": u.pk,
                    "full_name": u.full_name or "",
                    "phone": u.phone or "",
                    "email": u.email or "",
                },
            }
        )
