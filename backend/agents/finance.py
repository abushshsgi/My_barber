"""Agent moliyasi — salon avansi + komissiya + payout."""

from __future__ import annotations

import hashlib
import os
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from agents.finance_models import (
    AgentCommissionEvent,
    AgentLedgerEntry,
    AgentPayout,
    AgentWallet,
)
from agents.models import FieldAgent

# Salon ro'yxatdan o'tganda egasi hisobiga avans (so'm).
DEFAULT_SALON_ADVANCE_UZS = Decimal(os.environ.get("AGENT_SALON_ADVANCE_UZS", "30000"))
# Salon trial tugab obuna to'laganda agentga komissiya (so'm).
DEFAULT_AGENT_COMMISSION_UZS = Decimal(os.environ.get("AGENT_COMMISSION_UZS", "50000"))
MIN_AGENT_PAYOUT_UZS = Decimal(os.environ.get("AGENT_MIN_PAYOUT_UZS", "50000"))


def salon_advance_amount() -> Decimal:
    return Decimal(str(DEFAULT_SALON_ADVANCE_UZS))


def agent_commission_amount() -> Decimal:
    return Decimal(str(DEFAULT_AGENT_COMMISSION_UZS))


def _account_number(agent_id: int) -> str:
    raw = f"AG{agent_id:06d}{hashlib.sha256(f'agent-{agent_id}'.encode()).hexdigest()[:8].upper()}"
    return raw[:20]


class AgentWalletService:
    @classmethod
    def ensure_wallet(cls, agent: FieldAgent) -> AgentWallet:
        existing = AgentWallet.objects.filter(agent=agent).first()
        if existing:
            return existing
        for attempt in range(6):
            number = _account_number(agent.pk) if attempt == 0 else f"{_account_number(agent.pk)}{attempt}"
            try:
                with transaction.atomic():
                    return AgentWallet.objects.create(
                        agent=agent,
                        account_number=number[:24],
                        balance=Decimal("0"),
                    )
            except Exception:
                if AgentWallet.objects.filter(agent=agent).exists():
                    return AgentWallet.objects.get(agent=agent)
        raise RuntimeError("Agent hamyoni yaratib bo'lmadi.")

    @classmethod
    def _post(
        cls,
        *,
        wallet: AgentWallet,
        entry_type: str,
        amount: Decimal,
        idempotency_key: str,
        reference_type: str = "",
        reference_id: str = "",
        metadata: dict | None = None,
    ) -> AgentLedgerEntry | None:
        if AgentLedgerEntry.objects.filter(idempotency_key=idempotency_key).exists():
            return AgentLedgerEntry.objects.filter(idempotency_key=idempotency_key).first()

        amount = Decimal(str(amount))
        with transaction.atomic():
            locked = AgentWallet.objects.select_for_update().get(pk=wallet.pk)
            if locked.is_locked:
                raise RuntimeError("Agent hamyoni bloklangan.")
            new_balance = locked.balance + amount
            if new_balance < 0:
                raise RuntimeError("Hamyonda mablag' yetarli emas.")
            locked.balance = new_balance
            locked.save(update_fields=["balance", "updated_at"])
            prev = (
                AgentLedgerEntry.objects.filter(wallet=locked)
                .order_by("-created_at", "-pk")
                .only("entry_hash")
                .first()
            )
            prev_hash = prev.entry_hash if prev else "0" * 64
            payload = f"{locked.pk}|{entry_type}|{amount}|{new_balance}|{idempotency_key}|{prev_hash}"
            entry_hash = hashlib.sha256(payload.encode()).hexdigest()
            return AgentLedgerEntry.objects.create(
                wallet=locked,
                entry_type=entry_type,
                amount=amount,
                balance_after=new_balance,
                reference_type=reference_type,
                reference_id=str(reference_id or ""),
                idempotency_key=idempotency_key,
                prev_hash=prev_hash,
                entry_hash=entry_hash,
                metadata=metadata or {},
            )

    @classmethod
    def credit_commission(
        cls,
        agent: FieldAgent,
        *,
        amount: Decimal,
        salon_id: int | None,
        barber_id: int | None,
        subscription_id: str,
    ) -> AgentLedgerEntry | None:
        wallet = cls.ensure_wallet(agent)
        key = f"agent-commission:sub:{subscription_id}"
        entry = cls._post(
            wallet=wallet,
            entry_type=AgentLedgerEntry.EntryType.COMMISSION_IN,
            amount=abs(Decimal(str(amount))),
            idempotency_key=key,
            reference_type="subscription",
            reference_id=subscription_id,
            metadata={"salon_id": salon_id, "barber_id": barber_id},
        )
        AgentCommissionEvent.objects.get_or_create(
            idempotency_key=key,
            defaults={
                "agent": agent,
                "salon_id": salon_id,
                "barber_id": barber_id,
                "kind": AgentCommissionEvent.Kind.COMMISSION,
                "amount_uzs": abs(Decimal(str(amount))),
                "subscription_id": subscription_id,
                "metadata": {"ledger_entry": str(entry.id) if entry else ""},
            },
        )
        return entry


def credit_salon_advance(*, agent: FieldAgent, salon, barber) -> None:
    """Salon egasi hisobiga avans — agent olib kelganida."""
    amount = salon_advance_amount()
    if amount <= 0:
        return
    key = f"agent-salon-advance:salon:{salon.pk}"
    if AgentCommissionEvent.objects.filter(idempotency_key=key).exists():
        return

    from wallet.services.barber_wallet import BarberWalletService
    from wallet.models import BarberLedgerEntry

    wallet = BarberWalletService.ensure_wallet(barber, seed_legacy=False)
    try:
        BarberWalletService.post_entry(
            wallet=wallet,
            entry_type=BarberLedgerEntry.EntryType.ADJUSTMENT,
            amount=amount,
            idempotency_key=key,
            reference_type="agent_salon_advance",
            reference_id=str(salon.pk),
            metadata={
                "agent_id": agent.pk,
                "agent_code": agent.code,
                "salon_id": salon.pk,
                "kind": "agent_onboarding_advance",
            },
        )
    except Exception:
        pass

    AgentCommissionEvent.objects.get_or_create(
        idempotency_key=key,
        defaults={
            "agent": agent,
            "salon": salon,
            "barber": barber,
            "kind": AgentCommissionEvent.Kind.SALON_ADVANCE,
            "amount_uzs": amount,
            "metadata": {"destination": "barber_wallet"},
        },
    )


def grant_agent_commission_on_paid(*, barber, subscription) -> None:
    """Trial tugab obuna to'langanda agentga komissiya."""
    agent = getattr(barber, "referred_by_agent", None)
    if agent is None and getattr(barber, "referred_by_agent_id", None):
        agent = FieldAgent.objects.filter(pk=barber.referred_by_agent_id, is_active=True).first()
    if agent is None:
        return

    amount = agent_commission_amount()
    if amount <= 0:
        return

    salon = None
    from salons.models import Salon

    salon = (
        Salon.objects.filter(owner_barber=barber, referred_by_agent=agent)
        .order_by("-created_at")
        .first()
    )
    if salon is None:
        salon = Salon.objects.filter(owner_barber=barber).order_by("-created_at").first()

    AgentWalletService.credit_commission(
        agent,
        amount=amount,
        salon_id=salon.pk if salon else None,
        barber_id=barber.pk,
        subscription_id=str(subscription.pk),
    )
    if salon is not None:
        Salon.objects.filter(pk=salon.pk).update(
            subscription_status="active",
            updated_at=timezone.now(),
        )


def request_agent_payout(
    *,
    agent: FieldAgent,
    amount: Decimal,
    holder_name: str = "",
    bank_name: str = "",
    card_last4: str = "",
    notes: str = "",
) -> AgentPayout:
    amount = Decimal(str(amount))
    if amount < MIN_AGENT_PAYOUT_UZS:
        raise ValueError(f"Minimal payout {int(MIN_AGENT_PAYOUT_UZS)} so'm.")
    wallet = AgentWalletService.ensure_wallet(agent)
    with transaction.atomic():
        key = f"agent-payout-req:{agent.pk}:{timezone.now().timestamp()}"
        entry = AgentWalletService._post(
            wallet=wallet,
            entry_type=AgentLedgerEntry.EntryType.PAYOUT_OUT,
            amount=-abs(amount),
            idempotency_key=key,
            reference_type="agent_payout",
            metadata={"holder_name": holder_name},
        )
        return AgentPayout.objects.create(
            agent=agent,
            amount=abs(amount),
            status=AgentPayout.Status.PENDING,
            holder_name=holder_name or "",
            bank_name=bank_name or "",
            card_last4=(card_last4 or "")[:4],
            notes=notes or "",
            ledger_entry_id=entry.id if entry else None,
        )


def mark_agent_payout_paid(payout: AgentPayout, *, reference: str = "") -> AgentPayout:
    payout.status = AgentPayout.Status.PAID
    payout.paid_at = timezone.now()
    payout.reference = reference or payout.reference
    payout.save(update_fields=["status", "paid_at", "reference", "updated_at"])
    return payout


def reject_agent_payout(payout: AgentPayout, *, reason: str = "") -> AgentPayout:
    if payout.status != AgentPayout.Status.PENDING:
        raise ValueError("Faqat kutilayotgan payout rad etiladi.")
    wallet = AgentWalletService.ensure_wallet(payout.agent)
    AgentWalletService._post(
        wallet=wallet,
        entry_type=AgentLedgerEntry.EntryType.PAYOUT_REFUND,
        amount=abs(payout.amount),
        idempotency_key=f"agent-payout-refund:{payout.pk}",
        reference_type="agent_payout",
        reference_id=str(payout.pk),
        metadata={"reason": reason},
    )
    payout.status = AgentPayout.Status.FAILED
    payout.notes = (payout.notes + f"\nRad: {reason}").strip()
    payout.save(update_fields=["status", "notes", "updated_at"])
    return payout
