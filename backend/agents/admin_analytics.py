"""Admin agent hub — bitta so'rovda agregatlar (N+1 siz)."""

from __future__ import annotations

from django.db.models import Count, DecimalField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from agents.finance import agent_commission_amount, salon_advance_amount
from agents.finance_models import AgentCommissionEvent, AgentLedgerEntry, AgentPayout, AgentWallet
from agents.models import AgentReferralAttribution, FieldAgent
from agents.referral import TRIAL_DAYS, TRIAL_VALUE_UZS
from bookings.models import Booking
from salons.models import Salon, SalonMembership


def _money_sum(qs, field: str = "amount_uzs"):
    return qs.aggregate(
        t=Coalesce(Sum(field), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)))
    )["t"] or 0


def build_agent_hub_overview() -> dict:
    now = timezone.now()
    agents_qs = FieldAgent.objects.all()
    salons_qs = Salon.objects.filter(referred_by_agent__isnull=False)

    advance_total = _money_sum(
        AgentCommissionEvent.objects.filter(kind=AgentCommissionEvent.Kind.SALON_ADVANCE)
    )
    commission_total = _money_sum(
        AgentCommissionEvent.objects.filter(kind=AgentCommissionEvent.Kind.COMMISSION)
    )
    payout_pending = _money_sum(
        AgentPayout.objects.filter(status=AgentPayout.Status.PENDING), field="amount"
    )
    payout_paid = _money_sum(
        AgentPayout.objects.filter(status=AgentPayout.Status.PAID), field="amount"
    )
    wallet_balance = _money_sum(AgentWallet.objects.all(), field="balance")

    gmv = (
        Booking.objects.filter(
            salon__referred_by_agent__isnull=False,
            status=Booking.Status.COMPLETED,
        ).aggregate(
            t=Coalesce(
                Sum("total_price"),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            )
        )["t"]
        or 0
    )

    # Sumlarni Subquery bilan — Count + Sum join ko'payishini oldini olish
    advance_sq = (
        AgentCommissionEvent.objects.filter(
            agent_id=OuterRef("pk"),
            kind=AgentCommissionEvent.Kind.SALON_ADVANCE,
        )
        .values("agent_id")
        .annotate(t=Sum("amount_uzs"))
        .values("t")[:1]
    )
    commission_sq = (
        AgentCommissionEvent.objects.filter(
            agent_id=OuterRef("pk"),
            kind=AgentCommissionEvent.Kind.COMMISSION,
        )
        .values("agent_id")
        .annotate(t=Sum("amount_uzs"))
        .values("t")[:1]
    )
    wallet_sq = AgentWallet.objects.filter(agent_id=OuterRef("pk")).values("balance")[:1]
    pending_payout_sq = (
        AgentPayout.objects.filter(agent_id=OuterRef("pk"), status=AgentPayout.Status.PENDING)
        .values("agent_id")
        .annotate(c=Count("id"))
        .values("c")[:1]
    )

    leaderboard = list(
        FieldAgent.objects.annotate(
            salons_referred=Count("referred_salons", distinct=True),
            barbers_referred=Count("referred_barbers", distinct=True),
            salons_trial=Count(
                "referred_salons",
                filter=Q(
                    referred_salons__subscription_status="trial",
                    referred_salons__trial_ends_at__gt=now,
                ),
                distinct=True,
            ),
            salons_active=Count(
                "referred_salons",
                filter=Q(referred_salons__subscription_status="active"),
                distinct=True,
            ),
            advance_sum=Coalesce(
                Subquery(advance_sq, output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
            commission_sum=Coalesce(
                Subquery(commission_sq, output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
            wallet_balance=Coalesce(
                Subquery(wallet_sq, output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
            payouts_pending=Coalesce(Subquery(pending_payout_sq), Value(0)),
        )
        .order_by("-salons_referred", "full_name")[:30]
        .values(
            "id",
            "full_name",
            "code",
            "email",
            "phone",
            "is_active",
            "last_login",
            "salons_referred",
            "barbers_referred",
            "salons_trial",
            "salons_active",
            "advance_sum",
            "commission_sum",
            "wallet_balance",
            "payouts_pending",
        )
    )
    for row in leaderboard:
        row["advance_sum"] = float(row["advance_sum"] or 0)
        row["commission_sum"] = float(row["commission_sum"] or 0)
        row["wallet_balance"] = float(row["wallet_balance"] or 0)
        row["payouts_pending"] = int(row["payouts_pending"] or 0)
        if row.get("last_login"):
            row["last_login"] = row["last_login"].isoformat()

    recent_events = list(
        AgentCommissionEvent.objects.select_related("agent", "salon", "barber")
        .order_by("-created_at")[:25]
        .values(
            "id",
            "kind",
            "amount_uzs",
            "created_at",
            "agent_id",
            "agent__full_name",
            "agent__code",
            "salon_id",
            "salon__name",
            "barber_id",
            "barber__full_name",
        )
    )
    for ev in recent_events:
        ev["amount_uzs"] = float(ev["amount_uzs"] or 0)
        ev["created_at"] = ev["created_at"].isoformat()
        ev["agent_name"] = ev.pop("agent__full_name") or ""
        ev["agent_code"] = ev.pop("agent__code") or ""
        ev["salon_name"] = ev.pop("salon__name") or ""
        ev["barber_name"] = ev.pop("barber__full_name") or ""

    return {
        "summary": {
            "agents_total": agents_qs.count(),
            "agents_active": agents_qs.filter(is_active=True).count(),
            "salons_referred": salons_qs.count(),
            "salons_trial": salons_qs.filter(
                subscription_status="trial", trial_ends_at__gt=now
            ).count(),
            "salons_active": salons_qs.filter(subscription_status="active").count(),
            "salons_expired": salons_qs.filter(
                Q(subscription_status="expired")
                | Q(subscription_status="trial", trial_ends_at__lte=now)
            ).count(),
            "barbers_referred": AgentReferralAttribution.objects.count(),
            "advance_total_uzs": float(advance_total),
            "commission_total_uzs": float(commission_total),
            "payout_pending_uzs": float(payout_pending),
            "payout_paid_uzs": float(payout_paid),
            "agent_wallets_balance_uzs": float(wallet_balance),
            "referred_salons_gmv_uzs": float(gmv),
            "trial_days": TRIAL_DAYS,
            "trial_value_uzs": TRIAL_VALUE_UZS,
            "salon_advance_uzs": float(salon_advance_amount()),
            "commission_uzs": float(agent_commission_amount()),
        },
        "leaderboard": leaderboard,
        "recent_events": recent_events,
    }


def build_agent_salons_page(*, limit: int = 100, agent_id: int | None = None) -> dict:
    now = timezone.now()
    qs = (
        Salon.objects.filter(referred_by_agent__isnull=False)
        .select_related("owner_barber", "referred_by_agent")
        .annotate(
            members_count=Count(
                "memberships",
                filter=Q(memberships__invite_state=SalonMembership.InviteState.ACTIVE),
                distinct=True,
            ),
            bookings_completed=Count(
                "bookings",
                filter=Q(bookings__status=Booking.Status.COMPLETED),
                distinct=True,
            ),
            gmv_uzs=Coalesce(
                Sum(
                    "bookings__total_price",
                    filter=Q(bookings__status=Booking.Status.COMPLETED),
                ),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
        )
        .order_by("-created_at")
    )
    if agent_id:
        qs = qs.filter(referred_by_agent_id=agent_id)

    rows = []
    for s in qs[: max(1, min(limit, 300))]:
        agent = s.referred_by_agent
        owner = s.owner_barber
        rows.append(
            {
                "id": s.id,
                "name": s.name,
                "address": s.address or "",
                "phone": s.phone or "",
                "latitude": float(s.latitude) if s.latitude is not None else None,
                "longitude": float(s.longitude) if s.longitude is not None else None,
                "is_published": s.is_published,
                "subscription_status": s.subscription_status or "none",
                "trial_ends_at": s.trial_ends_at.isoformat() if s.trial_ends_at else None,
                "created_at": s.created_at.isoformat(),
                "members_count": s.members_count or 0,
                "bookings_completed": s.bookings_completed or 0,
                "gmv_uzs": float(s.gmv_uzs or 0),
                "agent_id": agent.id if agent else None,
                "agent_name": agent.full_name if agent else "",
                "agent_code": agent.code if agent else "",
                "owner_name": (owner.full_name if owner else "") or "",
                "owner_phone": (owner.phone if owner else "") or "",
                "owner_email": (owner.email if owner else "") or "",
                "trial_active": bool(
                    s.subscription_status == "trial"
                    and s.trial_ends_at
                    and s.trial_ends_at > now
                ),
            }
        )

    totals = {
        "count": len(rows),
        "gmv_uzs": float(sum(r["gmv_uzs"] for r in rows)),
        "bookings_completed": sum(r["bookings_completed"] for r in rows),
    }
    return {"results": rows, "totals": totals}


def build_agent_aylanma() -> dict:
    advances = list(
        AgentCommissionEvent.objects.filter(kind=AgentCommissionEvent.Kind.SALON_ADVANCE)
        .select_related("agent", "salon")
        .order_by("-created_at")[:100]
        .values(
            "id",
            "amount_uzs",
            "created_at",
            "agent_id",
            "agent__full_name",
            "agent__code",
            "salon_id",
            "salon__name",
        )
    )
    commissions = list(
        AgentCommissionEvent.objects.filter(kind=AgentCommissionEvent.Kind.COMMISSION)
        .select_related("agent", "salon")
        .order_by("-created_at")[:100]
        .values(
            "id",
            "amount_uzs",
            "created_at",
            "agent_id",
            "agent__full_name",
            "agent__code",
            "salon_id",
            "salon__name",
        )
    )
    ledger = list(
        AgentLedgerEntry.objects.select_related("wallet__agent")
        .order_by("-created_at")[:100]
        .values(
            "id",
            "entry_type",
            "amount",
            "balance_after",
            "created_at",
            "wallet__agent_id",
            "wallet__agent__full_name",
            "wallet__agent__code",
        )
    )

    def _norm_ev(rows):
        out = []
        for r in rows:
            out.append(
                {
                    "id": r["id"],
                    "amount_uzs": float(r["amount_uzs"] or 0),
                    "created_at": r["created_at"].isoformat(),
                    "agent_id": r["agent_id"],
                    "agent_name": r["agent__full_name"] or "",
                    "agent_code": r["agent__code"] or "",
                    "salon_id": r["salon_id"],
                    "salon_name": r["salon__name"] or "",
                }
            )
        return out

    advances_out = _norm_ev(advances)
    commissions_out = _norm_ev(commissions)

    ledger_out = []
    for r in ledger:
        ledger_out.append(
            {
                "id": str(r["id"]),
                "entry_type": r["entry_type"],
                "amount": float(r["amount"] or 0),
                "balance_after": float(r["balance_after"] or 0),
                "created_at": r["created_at"].isoformat(),
                "agent_id": r["wallet__agent_id"],
                "agent_name": r["wallet__agent__full_name"] or "",
                "agent_code": r["wallet__agent__code"] or "",
            }
        )

    return {
        "advances": advances_out,
        "commissions": commissions_out,
        "ledger": ledger_out,
        "totals": {
            "advance_uzs": float(sum(x["amount_uzs"] for x in advances_out)),
            "commission_uzs": float(sum(x["amount_uzs"] for x in commissions_out)),
        },
    }
