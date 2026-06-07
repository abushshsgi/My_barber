from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from accounts.models import User
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

MIN_GIFT_AMOUNT = Decimal("10000")
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

    @classmethod
    @transaction.atomic
    def send_gift(
        cls,
        *,
        sender: User,
        amount: Decimal,
        idempotency_key: str,
        message: str = "",
        recipient_user_id: int | None = None,
        recipient_phone: str | None = None,
        recipient_wallet_number: str | None = None,
    ) -> GiftTransfer:
        if amount < MIN_GIFT_AMOUNT:
            raise WalletServiceError(f"Minimal sovg'a: {MIN_GIFT_AMOUNT} so'm.")

        sender_wallet = cls.ensure_wallet(sender)
        recipient_wallet = cls.resolve_recipient(
            recipient_user_id=recipient_user_id,
            recipient_phone=recipient_phone,
            recipient_wallet_number=recipient_wallet_number,
        )

        if sender_wallet.pk == recipient_wallet.pk:
            raise WalletServiceError("O'zingizga sovg'a yuborib bo'lmaydi.")

        existing = GiftTransfer.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing

        ids = sorted([sender_wallet.pk, recipient_wallet.pk])
        locked = {
            w.pk: w
            for w in Wallet.objects.select_for_update()
            .filter(pk__in=ids)
            .order_by("pk")
        }
        sender_wallet = locked[sender_wallet.pk]
        recipient_wallet = locked[recipient_wallet.pk]

        if sender_wallet.balance < amount:
            raise InsufficientBalanceError(
                f"Balans yetarli emas. Kamida {amount} so'm kerak."
            )

        gift = GiftTransfer.objects.create(
            sender_wallet=sender_wallet,
            recipient_wallet=recipient_wallet,
            amount=amount,
            message=(message or "")[:500],
            status=GiftTransfer.Status.COMPLETED,
            idempotency_key=idempotency_key,
        )

        out_key = f"{idempotency_key}:out"
        in_key = f"{idempotency_key}:in"
        ref_id = str(gift.id)

        sender_entry = cls.post_entry(
            wallet=sender_wallet,
            entry_type=LedgerEntry.EntryType.GIFT_OUT,
            amount=-amount,
            idempotency_key=out_key,
            reference_type="gift_transfer",
            reference_id=ref_id,
            metadata={"message": message[:200] if message else ""},
        )
        recipient_entry = cls.post_entry(
            wallet=recipient_wallet,
            entry_type=LedgerEntry.EntryType.GIFT_IN,
            amount=amount,
            idempotency_key=in_key,
            reference_type="gift_transfer",
            reference_id=ref_id,
            metadata={"message": message[:200] if message else ""},
        )

        gift.sender_entry = sender_entry
        gift.recipient_entry = recipient_entry
        gift.save(update_fields=["sender_entry", "recipient_entry"])

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
