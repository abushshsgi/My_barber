from __future__ import annotations

from django.db.models import Count, Q
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
