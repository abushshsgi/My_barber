from __future__ import annotations

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from agents.auth import AgentPrincipal, encode_agent_tokens
from agents.models import AgentReferralAttribution, FieldAgent
from agents.permissions import IsFieldAgent
from agents.referral import (
    TRIAL_DAYS,
    TRIAL_VALUE_UZS,
    agent_stats_payload,
    build_agent_invite_url,
    ensure_agent_code,
)
from agents.serializers import (
    AgentLoginSerializer,
    AgentSalonRowSerializer,
    FieldAgentAdminSerializer,
    FieldAgentPublicSerializer,
)
from salons.models import Salon, SalonMembership


class AgentTokenView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = AgentLoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        agent: FieldAgent = ser.validated_data["agent"]
        agent.last_login = timezone.now()
        agent.save(update_fields=["last_login"])
        access, refresh = encode_agent_tokens(agent.id)
        ensure_agent_code(agent)
        return Response(
            {
                "access": access,
                "refresh": refresh,
                "agent": FieldAgentPublicSerializer(agent).data,
            }
        )


class AgentTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        import jwt
        from django.conf import settings

        raw = (request.data.get("refresh") or "").strip()
        if not raw:
            return Response({"detail": "refresh majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payload = jwt.decode(raw, settings.JWT_HS256_SIGNING_KEY, algorithms=["HS256"])
        except jwt.PyJWTError:
            return Response({"detail": "Token yaroqsiz."}, status=status.HTTP_401_UNAUTHORIZED)
        if payload.get("type") != "agent_refresh":
            return Response({"detail": "Token yaroqsiz."}, status=status.HTTP_401_UNAUTHORIZED)
        agent_id = payload.get("agent_id")
        if not FieldAgent.objects.filter(pk=agent_id, is_active=True).exists():
            return Response({"detail": "Agent topilmadi."}, status=status.HTTP_401_UNAUTHORIZED)
        access, refresh = encode_agent_tokens(int(agent_id))
        return Response({"access": access, "refresh": refresh})


class AgentMeView(APIView):
    permission_classes = [IsFieldAgent]

    def get(self, request):
        principal: AgentPrincipal = request.user
        agent = principal.agent
        ensure_agent_code(agent)
        return Response(FieldAgentPublicSerializer(agent).data)


class AgentSalonsView(APIView):
    permission_classes = [IsFieldAgent]

    def get(self, request):
        principal: AgentPrincipal = request.user
        agent = principal.agent
        salons = (
            Salon.objects.filter(referred_by_agent=agent)
            .select_related("owner_barber")
            .annotate(
                members_count=Count(
                    "memberships",
                    filter=Q(memberships__invite_state=SalonMembership.InviteState.ACTIVE),
                )
            )
            .order_by("-created_at")
        )
        rows = []
        for s in salons:
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
                    "business_kind": s.business_kind or "",
                    "subscription_status": s.subscription_status or "none",
                    "trial_ends_at": s.trial_ends_at,
                    "trial_value_uzs": s.trial_value_uzs or TRIAL_VALUE_UZS,
                    "created_at": s.created_at,
                    "owner_name": (owner.full_name if owner else "") or "",
                    "owner_phone": (owner.phone if owner else "") or "",
                    "members_count": s.members_count or 0,
                }
            )
        return Response(
            {
                "results": AgentSalonRowSerializer(rows, many=True).data,
                "stats": agent_stats_payload(agent),
            }
        )


class AgentInviteView(APIView):
    permission_classes = [IsFieldAgent]

    def get(self, request):
        principal: AgentPrincipal = request.user
        agent = principal.agent
        ensure_agent_code(agent)
        invite_url = build_agent_invite_url(agent.code)
        return Response(
            {
                "code": agent.code,
                "invite_url": invite_url,
                "qr_image_url": (
                    "https://api.qrserver.com/v1/create-qr-code/"
                    f"?size=320x320&data={invite_url}"
                ),
                "trial_days": TRIAL_DAYS,
                "trial_value_uzs": TRIAL_VALUE_UZS,
            }
        )


# ---- Admin ----


class AdminFieldAgentListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = FieldAgentAdminSerializer
    queryset = FieldAgent.objects.all().order_by("-created_at")

    def get_queryset(self):
        qs = super().get_queryset()
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(full_name__icontains=q)
                | Q(email__icontains=q)
                | Q(phone__icontains=q)
                | Q(code__icontains=q)
            )
        active = self.request.query_params.get("is_active")
        if active in ("true", "1"):
            qs = qs.filter(is_active=True)
        elif active in ("false", "0"):
            qs = qs.filter(is_active=False)
        return qs


class AdminFieldAgentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAdmin]
    serializer_class = FieldAgentAdminSerializer
    queryset = FieldAgent.objects.all()


class AdminAgentStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        agents_total = FieldAgent.objects.count()
        agents_active = FieldAgent.objects.filter(is_active=True).count()
        salons_qs = Salon.objects.filter(referred_by_agent__isnull=False)
        salons_total = salons_qs.count()
        salons_trial = salons_qs.filter(
            subscription_status="trial", trial_ends_at__gt=now
        ).count()
        salons_expired = salons_qs.filter(
            Q(subscription_status="expired")
            | Q(subscription_status="trial", trial_ends_at__lte=now)
        ).count()
        barbers_referred = AgentReferralAttribution.objects.count()

        leaderboard = []
        for agent in FieldAgent.objects.filter(is_active=True).order_by("full_name")[:50]:
            stats = agent_stats_payload(agent)
            leaderboard.append(
                {
                    "id": agent.id,
                    "full_name": agent.full_name,
                    "code": agent.code,
                    "email": agent.email,
                    "phone": agent.phone,
                    **stats,
                }
            )
        leaderboard.sort(key=lambda r: r["salons_referred"], reverse=True)

        return Response(
            {
                "agents_total": agents_total,
                "agents_active": agents_active,
                "barbers_referred": barbers_referred,
                "salons_referred": salons_total,
                "salons_trial": salons_trial,
                "salons_expired": salons_expired,
                "trial_days": TRIAL_DAYS,
                "trial_value_uzs": TRIAL_VALUE_UZS,
                "leaderboard": leaderboard[:20],
            }
        )


# ---- Agent finance ----


class AgentWalletView(APIView):
    permission_classes = [IsFieldAgent]

    def get(self, request):
        from agents.finance import (
            AgentWalletService,
            MIN_AGENT_PAYOUT_UZS,
            agent_commission_amount,
            salon_advance_amount,
        )
        from agents.finance_models import AgentCommissionEvent, AgentLedgerEntry, AgentPayout

        agent: FieldAgent = request.user.agent
        wallet = AgentWalletService.ensure_wallet(agent)
        ledger = list(
            AgentLedgerEntry.objects.filter(wallet=wallet).order_by("-created_at")[:50]
        )
        events = list(
            AgentCommissionEvent.objects.filter(agent=agent)
            .select_related("salon", "barber")
            .order_by("-created_at")[:50]
        )
        payouts = list(AgentPayout.objects.filter(agent=agent).order_by("-created_at")[:30])
        return Response(
            {
                "account_number": wallet.account_number,
                "balance": float(wallet.balance),
                "is_locked": wallet.is_locked,
                "min_payout_uzs": float(MIN_AGENT_PAYOUT_UZS),
                "salon_advance_uzs": float(salon_advance_amount()),
                "commission_uzs": float(agent_commission_amount()),
                "ledger": [
                    {
                        "id": str(e.id),
                        "entry_type": e.entry_type,
                        "amount": float(e.amount),
                        "balance_after": float(e.balance_after),
                        "reference_type": e.reference_type,
                        "reference_id": e.reference_id,
                        "created_at": e.created_at.isoformat(),
                        "metadata": e.metadata,
                    }
                    for e in ledger
                ],
                "events": [
                    {
                        "id": ev.id,
                        "kind": ev.kind,
                        "amount_uzs": float(ev.amount_uzs),
                        "salon_id": ev.salon_id,
                        "salon_name": ev.salon.name if ev.salon else "",
                        "barber_id": ev.barber_id,
                        "barber_name": (ev.barber.full_name if ev.barber else "") or "",
                        "created_at": ev.created_at.isoformat(),
                    }
                    for ev in events
                ],
                "payouts": [
                    {
                        "id": p.id,
                        "amount": float(p.amount),
                        "status": p.status,
                        "holder_name": p.holder_name,
                        "bank_name": p.bank_name,
                        "card_last4": p.card_last4,
                        "reference": p.reference,
                        "notes": p.notes,
                        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                        "created_at": p.created_at.isoformat(),
                    }
                    for p in payouts
                ],
            }
        )


class AgentPayoutRequestView(APIView):
    permission_classes = [IsFieldAgent]

    def post(self, request):
        from agents.finance import request_agent_payout

        agent: FieldAgent = request.user.agent
        try:
            amount = request.data.get("amount")
            payout = request_agent_payout(
                agent=agent,
                amount=amount,
                holder_name=(request.data.get("holder_name") or "").strip(),
                bank_name=(request.data.get("bank_name") or "").strip(),
                card_last4=(request.data.get("card_last4") or "").strip(),
                notes=(request.data.get("notes") or "").strip(),
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "id": payout.id,
                "amount": float(payout.amount),
                "status": payout.status,
                "created_at": payout.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


class AdminFieldAgentDetailExtendedView(APIView):
    """Agent batafsil: salonlar, barberlar, tranzaksiyalar, payoutlar."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        from agents.finance import AgentWalletService, agent_commission_amount, salon_advance_amount
        from agents.finance_models import AgentCommissionEvent, AgentLedgerEntry, AgentPayout
        from barbers.models import Barber

        agent = get_object_or_404(FieldAgent, pk=pk)
        ensure_agent_code(agent)
        wallet = AgentWalletService.ensure_wallet(agent)
        salons = (
            Salon.objects.filter(referred_by_agent=agent)
            .select_related("owner_barber")
            .annotate(
                members_count=Count(
                    "memberships",
                    filter=Q(memberships__invite_state=SalonMembership.InviteState.ACTIVE),
                )
            )
            .order_by("-created_at")
        )
        barbers = Barber.objects.filter(referred_by_agent=agent).order_by("-date_joined")
        events = AgentCommissionEvent.objects.filter(agent=agent).select_related(
            "salon", "barber"
        )[:100]
        ledger = AgentLedgerEntry.objects.filter(wallet=wallet).order_by("-created_at")[:100]
        payouts = AgentPayout.objects.filter(agent=agent).order_by("-created_at")[:50]

        return Response(
            {
                "agent": FieldAgentAdminSerializer(agent).data,
                "wallet": {
                    "account_number": wallet.account_number,
                    "balance": float(wallet.balance),
                    "is_locked": wallet.is_locked,
                },
                "config": {
                    "salon_advance_uzs": float(salon_advance_amount()),
                    "commission_uzs": float(agent_commission_amount()),
                },
                "salons": [
                    {
                        "id": s.id,
                        "name": s.name,
                        "address": s.address,
                        "phone": s.phone,
                        "latitude": float(s.latitude) if s.latitude is not None else None,
                        "longitude": float(s.longitude) if s.longitude is not None else None,
                        "is_published": s.is_published,
                        "subscription_status": s.subscription_status,
                        "trial_ends_at": s.trial_ends_at.isoformat() if s.trial_ends_at else None,
                        "created_at": s.created_at.isoformat(),
                        "owner_name": (s.owner_barber.full_name if s.owner_barber else "") or "",
                        "owner_phone": (s.owner_barber.phone if s.owner_barber else "") or "",
                        "owner_email": (s.owner_barber.email if s.owner_barber else "") or "",
                        "members_count": s.members_count or 0,
                    }
                    for s in salons
                ],
                "barbers": [
                    {
                        "id": b.id,
                        "full_name": b.full_name,
                        "email": b.email,
                        "phone": b.phone or "",
                        "onboarding_flow": b.onboarding_flow,
                        "business_kind": b.business_kind,
                        "date_joined": b.date_joined.isoformat() if b.date_joined else None,
                        "is_active": b.is_active,
                    }
                    for b in barbers
                ],
                "events": [
                    {
                        "id": ev.id,
                        "kind": ev.kind,
                        "amount_uzs": float(ev.amount_uzs),
                        "salon_name": ev.salon.name if ev.salon else "",
                        "barber_name": (ev.barber.full_name if ev.barber else "") or "",
                        "created_at": ev.created_at.isoformat(),
                        "metadata": ev.metadata,
                    }
                    for ev in events
                ],
                "ledger": [
                    {
                        "id": str(e.id),
                        "entry_type": e.entry_type,
                        "amount": float(e.amount),
                        "balance_after": float(e.balance_after),
                        "created_at": e.created_at.isoformat(),
                        "metadata": e.metadata,
                    }
                    for e in ledger
                ],
                "payouts": [
                    {
                        "id": p.id,
                        "amount": float(p.amount),
                        "status": p.status,
                        "holder_name": p.holder_name,
                        "bank_name": p.bank_name,
                        "card_last4": p.card_last4,
                        "reference": p.reference,
                        "notes": p.notes,
                        "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                        "created_at": p.created_at.isoformat(),
                    }
                    for p in payouts
                ],
            }
        )


class AdminAgentPayoutListView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from agents.finance_models import AgentPayout

        status_f = (request.query_params.get("status") or "").strip()
        qs = AgentPayout.objects.select_related("agent").order_by("-created_at")
        if status_f:
            qs = qs.filter(status=status_f)
        rows = []
        for p in qs[:100]:
            rows.append(
                {
                    "id": p.id,
                    "agent_id": p.agent_id,
                    "agent_name": p.agent.full_name,
                    "agent_code": p.agent.code,
                    "amount": float(p.amount),
                    "status": p.status,
                    "holder_name": p.holder_name,
                    "bank_name": p.bank_name,
                    "card_last4": p.card_last4,
                    "reference": p.reference,
                    "notes": p.notes,
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                    "created_at": p.created_at.isoformat(),
                }
            )
        return Response({"results": rows})


class AdminAgentPayoutMarkPaidView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        from agents.finance import mark_agent_payout_paid
        from agents.finance_models import AgentPayout

        payout = get_object_or_404(AgentPayout, pk=pk)
        if payout.status != AgentPayout.Status.PENDING:
            return Response({"detail": "Faqat kutilayotgan payout."}, status=400)
        mark_agent_payout_paid(
            payout, reference=(request.data.get("reference") or "").strip()
        )
        return Response({"id": payout.id, "status": payout.status})


class AdminAgentPayoutRejectView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        from agents.finance import reject_agent_payout
        from agents.finance_models import AgentPayout

        payout = get_object_or_404(AgentPayout, pk=pk)
        try:
            reject_agent_payout(
                payout, reason=(request.data.get("reason") or "").strip()
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        return Response({"id": payout.id, "status": payout.status})
