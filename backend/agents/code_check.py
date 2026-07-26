"""Public agent code check — partner signup QR / qo‘lda kiritish."""

from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.throttles import BarberCheckThrottle, FriendlyThrottleMixin
from agents.models import FieldAgent
from agents.referral import normalize_agent_code
from barbers.barber_auth import SoftBarberJWTAuthentication


class AgentCodeCheckView(FriendlyThrottleMixin, APIView):
    """GET ?code= — faol agent kodi bormi (PII siz)."""

    authentication_classes = [SoftBarberJWTAuthentication]
    permission_classes = [AllowAny]
    throttle_classes = [BarberCheckThrottle]
    throttle_detail = "Tekshiruv limiti tugadi. Biroz kutib qayta urinib ko'ring."

    def get(self, request):
        raw = request.query_params.get("code") or request.query_params.get("ref") or ""
        code = normalize_agent_code(raw)
        if len(code) != 8:
            return Response(
                {
                    "valid": False,
                    "detail": "Agent kodi 8 belgidan iborat bo‘lishi kerak.",
                }
            )

        agent = FieldAgent.objects.filter(code=code, is_active=True).only("code", "full_name").first()
        if not agent:
            return Response(
                {
                    "valid": False,
                    "detail": "Agent kodi topilmadi yoki faol emas.",
                }
            )

        first = (agent.full_name or "").strip().split()
        label = first[0][:24] if first else "Agent"
        return Response(
            {
                "valid": True,
                "code": agent.code,
                "agent_label": label,
            }
        )
