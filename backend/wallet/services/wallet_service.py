from decimal import Decimal, ROUND_DOWN
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from wallet.gift_designs import get_gift_design
from wallet.models import GiftTransfer, LedgerEntry, Wallet, WalletCard
from wallet.services.ledger import (
    canonical_entry_payload,
    compute_entry_hash,
    last_entry_hash,
    verify_wallet_chain,
)
from wallet.services.wallet_number import (
    card_display_from_wallet_number,
    format_wallet_number,
    generate_wallet_number,
    normalize_wallet_number,
)

MIN_GIFT_AMOUNT = Decimal("5000")
MAX_GIFT_AMOUNT = Decimal("1000000")
MIN_TOPUP_AMOUNT = Decimal("10000")


class WalletServiceError(Exception):
    pass


class InsufficientBalanceError(WalletServiceError):
    pass


class WalletService:
    @staticmethod
    def cardholder_name(user: User) -> str:
        name = (user.full_name or "").strip()
        if name:
            return name.upper()
        phone = (user.phone or "").strip()
        if phone:
            return phone
        return f"USER {user.pk}"

    @classmethod
    def ensure_wallet(cls, user: User) -> Wallet:
        existing = Wallet.objects.filter(user=user).select_related("card").first()
        if existing:
            cls._sync_cardholder(existing)
            return existing

        for attempt in range(5):
            number = generate_wallet_number(user.pk, attempt=attempt)
            try:
                with transaction.atomic():
                    wallet = Wallet.objects.create(
                        user=user,
                        wallet_number=number,
                        balance=Decimal("0"),
                    )
                    WalletCard.objects.create(
                        wallet=wallet,
                        cardholder_name=cls.cardholder_name(user),
                        card_display=card_display_from_wallet_number(number),
                    )
                    return wallet
            except Exception as exc:
                if attempt >= 4:
                    raise WalletServiceError("Hamyon yaratib bo'lmadi.") from exc
                if Wallet.objects.filter(user=user).exists():
                    return Wallet.objects.get(user=user)
        raise WalletServiceError("Hamyon yaratib bo'lmadi.")

    @classmethod
    def ensure_platform_wallet(cls) -> Wallet:
        """Dizayn to'lovlari tushadigan platforma hamyoni."""
        email = (getattr(settings, "PLATFORM_WALLET_EMAIL", "") or "").strip().lower()
        if not email:
            email = "platform-wallet@mysaloon.internal"
        user, _created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": f"platform_{uuid4().hex[:12]}",
                "full_name": "MySaloon Platform",
                "role": User.Role.USER,
                "onboarding_completed": True,
            },
        )
        if not user.has_usable_password():
            user.set_unusable_password()
            user.save(update_fields=["password"])
        return cls.ensure_wallet(user)

    @classmethod
    def _sync_cardholder(cls, wallet: Wallet) -> None:
        name = cls.cardholder_name(wallet.user)
        WalletCard.objects.filter(wallet=wallet).update(cardholder_name=name)

    @classmethod
    @transaction.atomic
    def post_entry(
        cls,
        *,
        wallet: Wallet,
        entry_type: str,
        amount: Decimal,
        idempotency_key: str,
        reference_type: str = "",
        reference_id: str = "",
        metadata: dict | None = None,
    ) -> LedgerEntry:
        existing = LedgerEntry.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
        new_balance = wallet.balance + amount
        if new_balance < 0:
            raise InsufficientBalanceError(
                f"Balans yetarli emas. Kamida {abs(amount)} so'm kerak."
            )

        prev_hash = last_entry_hash(wallet.pk)
        payload = canonical_entry_payload(
            wallet_id=wallet.pk,
            entry_type=entry_type,
            amount=amount,
            balance_after=new_balance,
            reference_type=reference_type,
            reference_id=reference_id,
            idempotency_key=idempotency_key,
        )
        entry_hash = compute_entry_hash(prev_hash, payload)

        entry = LedgerEntry.objects.create(
            wallet=wallet,
            entry_type=entry_type,
            amount=amount,
            balance_after=new_balance,
            reference_type=reference_type,
            reference_id=reference_id,
            idempotency_key=idempotency_key,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
            metadata=metadata or {},
        )
        wallet.balance = new_balance
        wallet.save(update_fields=["balance", "updated_at"])
        return entry

    @classmethod
    @transaction.atomic
    def top_up(
        cls,
        *,
        wallet: Wallet,
        amount: Decimal,
        idempotency_key: str,
        metadata: dict | None = None,
    ) -> LedgerEntry:
        if amount < MIN_TOPUP_AMOUNT:
            raise WalletServiceError(f"Minimal to'ldirish: {MIN_TOPUP_AMOUNT} so'm.")
        return cls.post_entry(
            wallet=wallet,
            entry_type=LedgerEntry.EntryType.TOPUP,
            amount=amount,
            idempotency_key=idempotency_key,
            reference_type="topup",
            reference_id=idempotency_key,
            metadata=metadata,
        )

    @classmethod
    def resolve_recipient(
        cls,
        *,
        recipient_user_id: int | None = None,
        recipient_phone: str | None = None,
        recipient_wallet_number: str | None = None,
    ) -> Wallet:
        from accounts.phone_auth import normalize_uz_phone

        qs = Wallet.objects.select_related("user").all()

        if recipient_user_id:
            wallet = qs.filter(user_id=recipient_user_id).first()
            if wallet:
                return wallet
            raise WalletServiceError("Qabul qiluvchi topilmadi.")

        if recipient_wallet_number:
            normalized = normalize_wallet_number(recipient_wallet_number)
            formatted = format_wallet_number(normalized)
            wallet = qs.filter(wallet_number=formatted).first()
            if wallet:
                return wallet
            raise WalletServiceError("Hamyon raqami topilmadi.")

        if recipient_phone:
            phone = normalize_uz_phone(recipient_phone)
            if not phone:
                raise WalletServiceError("Telefon raqami noto'g'ri.")
            wallet = qs.filter(user__phone=phone).first()
            if wallet:
                return wallet
            raise WalletServiceError("Telefon bo'yicha foydalanuvchi topilmadi.")

        raise WalletServiceError("Qabul qiluvchini ko'rsating.")

    @staticmethod
    def _normalize_gift_amount(raw: Decimal) -> Decimal:
        amount = Decimal(raw).quantize(Decimal("1"), rounding=ROUND_DOWN)
        if amount < MIN_GIFT_AMOUNT:
            raise WalletServiceError(f"Minimal sovg'a: {MIN_GIFT_AMOUNT} so'm.")
        if amount > MAX_GIFT_AMOUNT:
            raise WalletServiceError(f"Maksimal sovg'a: {MAX_GIFT_AMOUNT} so'm.")
        return amount

    @classmethod
    @transaction.atomic
    def send_gift(
        cls,
        *,
        sender: User,
        gift_amount: Decimal,
        design_id: str,
        idempotency_key: str,
        message: str = "",
        recipient_user_id: int | None = None,
        recipient_phone: str | None = None,
        recipient_wallet_number: str | None = None,
    ) -> GiftTransfer:
        if not (idempotency_key or "").strip():
            raise WalletServiceError("Idempotency-Key majburiy.")

        design = get_gift_design(design_id)
        if design is None:
            raise WalletServiceError("Noto'g'ri sovg'a karta dizayni.")

        gift_amount = cls._normalize_gift_amount(gift_amount)
        design_fee = design.fee
        total = gift_amount + design_fee

        sender_wallet = cls.ensure_wallet(sender)
        recipient_wallet = cls.resolve_recipient(
            recipient_user_id=recipient_user_id,
            recipient_phone=recipient_phone,
            recipient_wallet_number=recipient_wallet_number,
        )
        platform_wallet = cls.ensure_platform_wallet()

        if sender_wallet.pk == recipient_wallet.pk:
            raise WalletServiceError("O'zingizga sovg'a yuborib bo'lmaydi.")
        if sender_wallet.pk == platform_wallet.pk:
            raise WalletServiceError("Platforma hisobidan sovg'a yuborib bo'lmaydi.")
        if recipient_wallet.pk == platform_wallet.pk:
            raise WalletServiceError("Platforma hisobiga sovg'a yuborib bo'lmaydi.")

        existing = GiftTransfer.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        ids = sorted({sender_wallet.pk, recipient_wallet.pk, platform_wallet.pk})
        locked = {
            w.pk: w
            for w in Wallet.objects.select_for_update()
            .filter(pk__in=ids)
            .order_by("pk")
        }
        sender_wallet = locked[sender_wallet.pk]
        recipient_wallet = locked[recipient_wallet.pk]
        platform_wallet = locked[platform_wallet.pk]

        if sender_wallet.balance < total:
            raise InsufficientBalanceError(
                f"Balans yetarli emas. Kamida {total} so'm kerak "
                f"(sovg'a {gift_amount} + dizayn {design_fee})."
            )

        clean_message = (message or "")[:500]
        gift = GiftTransfer.objects.create(
            sender_wallet=sender_wallet,
            recipient_wallet=recipient_wallet,
            amount=gift_amount,
            design_id=design.id,
            design_fee=design_fee,
            total_charged=total,
            message=clean_message,
            status=GiftTransfer.Status.COMPLETED,
            idempotency_key=idempotency_key,
        )

        fee_out_key = f"{idempotency_key}:fee-out"
        fee_in_key = f"{idempotency_key}:fee-in"
        out_key = f"{idempotency_key}:out"
        in_key = f"{idempotency_key}:in"
        ref_id = str(gift.id)
        meta = {
            "message": clean_message[:200] if clean_message else "",
            "design_id": design.id,
            "design_fee": str(design_fee),
            "gift_amount": str(gift_amount),
            "total_charged": str(total),
        }

        # 1) Dizayn narxi — senderdan platformaga
        fee_out_entry = cls.post_entry(
            wallet=sender_wallet,
            entry_type=LedgerEntry.EntryType.GIFT_DESIGN_FEE,
            amount=-design_fee,
            idempotency_key=fee_out_key,
            reference_type="gift_transfer",
            reference_id=ref_id,
            metadata=meta,
        )
        cls.post_entry(
            wallet=platform_wallet,
            entry_type=LedgerEntry.EntryType.GIFT_DESIGN_FEE,
            amount=design_fee,
            idempotency_key=fee_in_key,
            reference_type="gift_transfer",
            reference_id=ref_id,
            metadata=meta,
        )

        # 2) Sovg'a summasi — senderdan qabul qiluvchiga
        sender_entry = cls.post_entry(
            wallet=sender_wallet,
            entry_type=LedgerEntry.EntryType.GIFT_OUT,
            amount=-gift_amount,
            idempotency_key=out_key,
            reference_type="gift_transfer",
            reference_id=ref_id,
            metadata=meta,
        )
        recipient_entry = cls.post_entry(
            wallet=recipient_wallet,
            entry_type=LedgerEntry.EntryType.GIFT_IN,
            amount=gift_amount,
            idempotency_key=in_key,
            reference_type="gift_transfer",
            reference_id=ref_id,
            metadata=meta,
        )

        gift.sender_entry = sender_entry
        gift.recipient_entry = recipient_entry
        gift.design_fee_entry = fee_out_entry
        gift.save(update_fields=["sender_entry", "recipient_entry", "design_fee_entry"])

        return gift

    @staticmethod
    def verify_chain(wallet: Wallet) -> tuple[bool, str | None]:
        return verify_wallet_chain(wallet.pk)

    @staticmethod
    def debug_topup_daily_total(user: User) -> Decimal:
        from django.db.models import Sum

        start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        wallet = Wallet.objects.filter(user=user).first()
        if not wallet:
            return Decimal("0")
        result = (
            LedgerEntry.objects.filter(
                wallet=wallet,
                entry_type=LedgerEntry.EntryType.TOPUP,
                created_at__gte=start,
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0")
        )
        return result
