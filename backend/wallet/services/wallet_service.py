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
        sender_user = sender_wallet.user
        recipient_user = recipient_wallet.user
        sender_name = (
            (sender_user.full_name or sender_user.phone or str(sender_user.pk)).strip()
        )
        recipient_name = (
            (recipient_user.full_name or recipient_user.phone or str(recipient_user.pk)).strip()
        )
        meta = {
            "message": clean_message[:200] if clean_message else "",
            "design_id": design.id,
            "design_fee": str(design_fee),
            "gift_amount": str(gift_amount),
            "total_charged": str(total),
            "sender_name": sender_name,
            "sender_user_id": sender_user.pk,
            "recipient_name": recipient_name,
            "recipient_user_id": recipient_user.pk,
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
    def _append_remediation(gift: GiftTransfer, entry: dict) -> None:
        log = list(gift.remediation_log or [])
        log.append(entry)
        gift.remediation_log = log

    @classmethod
    def _gift_spend_after(cls, gift: GiftTransfer) -> Decimal:
        """Sovg'adan keyin recipient booking_pay jami (taxminiy sarf)."""
        qs = LedgerEntry.objects.filter(
            wallet_id=gift.recipient_wallet_id,
            entry_type=LedgerEntry.EntryType.BOOKING_PAY,
            created_at__gte=gift.created_at,
        )
        total = Decimal("0")
        for row in qs.only("amount"):
            total += abs(Decimal(row.amount))
        return total

    @classmethod
    def gift_holdable_amount(cls, gift: GiftTransfer) -> Decimal:
        """Hold qilish mumkin bo'lgan qoldiq (sarflanmagan / balans bilan cheklangan)."""
        if gift.status != GiftTransfer.Status.COMPLETED:
            return Decimal("0")
        recipient = gift.recipient_wallet
        spent = cls._gift_spend_after(gift)
        remaining = max(Decimal("0"), Decimal(gift.amount) - spent)
        return min(remaining, Decimal(recipient.balance)).quantize(Decimal("0.01"))

    @classmethod
    @transaction.atomic
    def admin_hold_gift(
        cls,
        *,
        gift: GiftTransfer,
        admin_id: int | None,
        reason: str,
        amount: Decimal | None = None,
        idempotency_key: str = "",
    ) -> GiftTransfer:
        gift = GiftTransfer.objects.select_for_update().select_related(
            "sender_wallet", "recipient_wallet"
        ).get(pk=gift.pk)
        if gift.status != GiftTransfer.Status.COMPLETED:
            raise WalletServiceError("Faqat completed sovg'ani hold qilish mumkin.")

        holdable = cls.gift_holdable_amount(gift)
        if holdable <= 0:
            raise WalletServiceError(
                "Hold qilish uchun qoldiq yo'q (sarflangan yoki balans yetarli emas)."
            )

        hold_amount = Decimal(amount) if amount is not None else holdable
        hold_amount = hold_amount.quantize(Decimal("0.01"))
        if hold_amount <= 0:
            raise WalletServiceError("Hold summasi 0 dan katta bo'lishi kerak.")
        if hold_amount > holdable:
            raise WalletServiceError(
                f"Maksimal hold: {holdable} so'm (qoldiq/balans)."
            )

        key = (idempotency_key or "").strip() or f"gift-hold:{gift.id}:{hold_amount}"
        platform = cls.ensure_platform_wallet()
        recipient = Wallet.objects.select_for_update().get(pk=gift.recipient_wallet_id)
        platform = Wallet.objects.select_for_update().get(pk=platform.pk)

        note = (reason or "").strip()[:500] or "Admin hold"
        meta = {
            "action": "gift_hold",
            "gift_id": str(gift.id),
            "admin_id": admin_id,
            "reason": note,
        }

        cls.post_entry(
            wallet=recipient,
            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
            amount=-hold_amount,
            idempotency_key=f"{key}:from-recipient"[:128],
            reference_type="gift_hold",
            reference_id=str(gift.id),
            metadata=meta,
        )
        cls.post_entry(
            wallet=platform,
            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
            amount=hold_amount,
            idempotency_key=f"{key}:to-platform"[:128],
            reference_type="gift_hold",
            reference_id=str(gift.id),
            metadata=meta,
        )

        gift.status = GiftTransfer.Status.ON_HOLD
        gift.held_amount = hold_amount
        gift.held_at = timezone.now()
        gift.held_by_admin_id = admin_id
        if note:
            gift.admin_note = note
        cls._append_remediation(
            gift,
            {
                "action": "hold",
                "amount": str(hold_amount),
                "reason": note,
                "admin_id": admin_id,
                "at": timezone.now().isoformat(),
            },
        )
        gift.save(
            update_fields=[
                "status",
                "held_amount",
                "held_at",
                "held_by_admin_id",
                "admin_note",
                "remediation_log",
            ]
        )
        return gift

    @classmethod
    @transaction.atomic
    def admin_release_gift(
        cls,
        *,
        gift: GiftTransfer,
        admin_id: int | None,
        reason: str = "",
        idempotency_key: str = "",
    ) -> GiftTransfer:
        gift = GiftTransfer.objects.select_for_update().select_related(
            "recipient_wallet"
        ).get(pk=gift.pk)
        if gift.status != GiftTransfer.Status.ON_HOLD:
            raise WalletServiceError("Faqat on_hold sovg'ani release qilish mumkin.")

        hold_amount = Decimal(gift.held_amount).quantize(Decimal("0.01"))
        if hold_amount <= 0:
            raise WalletServiceError("Hold summasi topilmadi.")

        key = (idempotency_key or "").strip() or f"gift-release:{gift.id}"
        platform = cls.ensure_platform_wallet()
        recipient = Wallet.objects.select_for_update().get(pk=gift.recipient_wallet_id)
        platform = Wallet.objects.select_for_update().get(pk=platform.pk)

        note = (reason or "").strip()[:500] or "Admin release"
        meta = {
            "action": "gift_release",
            "gift_id": str(gift.id),
            "admin_id": admin_id,
            "reason": note,
        }

        cls.post_entry(
            wallet=platform,
            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
            amount=-hold_amount,
            idempotency_key=f"{key}:from-platform"[:128],
            reference_type="gift_release",
            reference_id=str(gift.id),
            metadata=meta,
        )
        cls.post_entry(
            wallet=recipient,
            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
            amount=hold_amount,
            idempotency_key=f"{key}:to-recipient"[:128],
            reference_type="gift_release",
            reference_id=str(gift.id),
            metadata=meta,
        )

        gift.status = GiftTransfer.Status.COMPLETED
        gift.held_amount = Decimal("0")
        gift.held_at = None
        gift.held_by_admin_id = None
        if note:
            gift.admin_note = note
        cls._append_remediation(
            gift,
            {
                "action": "release",
                "amount": str(hold_amount),
                "reason": note,
                "admin_id": admin_id,
                "at": timezone.now().isoformat(),
            },
        )
        gift.save(
            update_fields=[
                "status",
                "held_amount",
                "held_at",
                "held_by_admin_id",
                "admin_note",
                "remediation_log",
            ]
        )
        return gift

    @classmethod
    @transaction.atomic
    def admin_refund_gift(
        cls,
        *,
        gift: GiftTransfer,
        admin_id: int | None,
        reason: str,
        refund_design_fee: bool = False,
        amount: Decimal | None = None,
        idempotency_key: str = "",
    ) -> GiftTransfer:
        gift = GiftTransfer.objects.select_for_update().select_related(
            "sender_wallet", "recipient_wallet"
        ).get(pk=gift.pk)
        if gift.status not in (
            GiftTransfer.Status.COMPLETED,
            GiftTransfer.Status.ON_HOLD,
        ):
            raise WalletServiceError("Bu holatda refund qilib bo'lmaydi.")

        key = (idempotency_key or "").strip() or f"gift-refund:{gift.id}:{uuid4()}"
        note = (reason or "").strip()[:500] or "Admin refund"
        platform = cls.ensure_platform_wallet()
        sender = Wallet.objects.select_for_update().get(pk=gift.sender_wallet_id)
        recipient = Wallet.objects.select_for_update().get(pk=gift.recipient_wallet_id)
        platform = Wallet.objects.select_for_update().get(pk=platform.pk)

        meta = {
            "action": "gift_refund",
            "gift_id": str(gift.id),
            "admin_id": admin_id,
            "reason": note,
            "refund_design_fee": bool(refund_design_fee),
        }

        refunded_gift = Decimal("0")
        full_remaining = False

        if gift.status == GiftTransfer.Status.ON_HOLD:
            hold_amount = Decimal(gift.held_amount).quantize(Decimal("0.01"))
            if hold_amount <= 0:
                raise WalletServiceError("Hold summasi topilmadi.")
            target = hold_amount if amount is None else Decimal(amount).quantize(Decimal("0.01"))
            if target <= 0:
                raise WalletServiceError("Refund summasi 0 dan katta bo'lishi kerak.")
            if target > hold_amount:
                raise WalletServiceError(f"Maksimal refund (hold): {hold_amount} so'm.")
            cls.post_entry(
                wallet=platform,
                entry_type=LedgerEntry.EntryType.REFUND,
                amount=-target,
                idempotency_key=f"{key}:hold-from-platform"[:128],
                reference_type="gift_refund",
                reference_id=str(gift.id),
                metadata=meta,
            )
            cls.post_entry(
                wallet=sender,
                entry_type=LedgerEntry.EntryType.REFUND,
                amount=target,
                idempotency_key=f"{key}:hold-to-sender"[:128],
                reference_type="gift_refund",
                reference_id=str(gift.id),
                metadata=meta,
            )
            refunded_gift = target
            full_remaining = target >= hold_amount
            gift.held_amount = (hold_amount - target).quantize(Decimal("0.01"))
        else:
            refundable = cls.gift_holdable_amount(gift)
            if refundable <= 0:
                raise WalletServiceError(
                    "Qaytarish uchun qoldiq yo'q (sarflangan yoki balans yetarli emas)."
                )
            target = refundable if amount is None else Decimal(amount).quantize(Decimal("0.01"))
            if target <= 0:
                raise WalletServiceError("Refund summasi 0 dan katta bo'lishi kerak.")
            if target > refundable:
                raise WalletServiceError(f"Maksimal refund: {refundable} so'm.")
            cls.post_entry(
                wallet=recipient,
                entry_type=LedgerEntry.EntryType.REFUND,
                amount=-target,
                idempotency_key=f"{key}:from-recipient"[:128],
                reference_type="gift_refund",
                reference_id=str(gift.id),
                metadata=meta,
            )
            cls.post_entry(
                wallet=sender,
                entry_type=LedgerEntry.EntryType.REFUND,
                amount=target,
                idempotency_key=f"{key}:to-sender"[:128],
                reference_type="gift_refund",
                reference_id=str(gift.id),
                metadata=meta,
            )
            refunded_gift = target
            full_remaining = target >= refundable

        refunded_fee = Decimal("0")
        # Dizayn fee faqat to'liq qoldiq qaytarilganda
        if refund_design_fee and full_remaining and Decimal(gift.design_fee) > 0:
            fee = Decimal(gift.design_fee).quantize(Decimal("0.01"))
            cls.post_entry(
                wallet=platform,
                entry_type=LedgerEntry.EntryType.REFUND,
                amount=-fee,
                idempotency_key=f"{key}:fee-from-platform"[:128],
                reference_type="gift_refund_fee",
                reference_id=str(gift.id),
                metadata=meta,
            )
            cls.post_entry(
                wallet=sender,
                entry_type=LedgerEntry.EntryType.REFUND,
                amount=fee,
                idempotency_key=f"{key}:fee-to-sender"[:128],
                reference_type="gift_refund_fee",
                reference_id=str(gift.id),
                metadata=meta,
            )
            refunded_fee = fee

        if full_remaining:
            gift.status = GiftTransfer.Status.REFUNDED
            gift.held_amount = Decimal("0")
            gift.held_at = None
            gift.held_by_admin_id = None
            gift.refunded_at = timezone.now()
            gift.refunded_by_admin_id = admin_id
        # partial: status o'zgarmaydi (completed yoki on_hold qoladi)

        gift.admin_note = note
        cls._append_remediation(
            gift,
            {
                "action": "refund_partial" if not full_remaining else "refund",
                "gift_amount": str(refunded_gift),
                "design_fee": str(refunded_fee),
                "full_remaining": full_remaining,
                "reason": note,
                "admin_id": admin_id,
                "at": timezone.now().isoformat(),
            },
        )
        gift.save(
            update_fields=[
                "status",
                "held_amount",
                "held_at",
                "held_by_admin_id",
                "refunded_at",
                "refunded_by_admin_id",
                "admin_note",
                "remediation_log",
            ]
        )
        return gift

    @classmethod
    @transaction.atomic
    def admin_adjust_wallet(
        cls,
        *,
        user: User,
        amount: Decimal,
        reason: str,
        admin_id: int | None,
        idempotency_key: str = "",
    ) -> LedgerEntry:
        amount = Decimal(amount).quantize(Decimal("0.01"))
        if amount == 0:
            raise WalletServiceError("Summa 0 bo'lishi mumkin emas.")
        note = (reason or "").strip()
        if len(note) < 5:
            raise WalletServiceError("Sabab kamida 5 belgi bo'lishi kerak.")

        wallet = cls.ensure_wallet(user)
        key = (idempotency_key or "").strip() or f"admin-adjust:{wallet.pk}:{uuid4()}"
        return cls.post_entry(
            wallet=wallet,
            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
            amount=amount,
            idempotency_key=key[:128],
            reference_type="admin_adjust",
            reference_id=str(admin_id or ""),
            metadata={
                "action": "admin_adjust",
                "admin_id": admin_id,
                "reason": note[:500],
                "signed_amount": str(amount),
            },
        )

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
