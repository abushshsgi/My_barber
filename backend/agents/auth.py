"""JWT auth for field agents — Admin/Barber dan mustaqil."""

from __future__ import annotations

import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from agents.models import FieldAgent


class AgentPrincipal:
    is_authenticated = True
    is_anonymous = False
    is_staff = False
    is_superuser = False

    def __init__(self, agent: FieldAgent):
        self.agent = agent
        self.pk = agent.pk
        self.id = agent.pk

    def __str__(self) -> str:
        return f"Agent({self.agent.email})"


class AgentJWTAuthentication(BaseAuthentication):
    def authenticate_header(self, request):
        return 'Bearer realm="agent"'

    def authenticate(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.startswith("Bearer "):
            return None
        raw = auth[7:].strip()
        if not raw:
            return None
        try:
            payload = jwt.decode(
                raw,
                settings.JWT_HS256_SIGNING_KEY,
                algorithms=["HS256"],
            )
        except jwt.PyJWTError:
            return None
        if payload.get("type") != "agent_access":
            return None
        agent_id = payload.get("agent_id")
        if not agent_id:
            return None
        try:
            agent = FieldAgent.objects.get(pk=agent_id, is_active=True)
        except FieldAgent.DoesNotExist:
            return None
        return (AgentPrincipal(agent), None)


def encode_agent_tokens(agent_id: int) -> tuple[str, str]:
    from datetime import timedelta

    sj = getattr(settings, "SIMPLE_JWT", {})
    access_delta = sj.get("ACCESS_TOKEN_LIFETIME") or timedelta(minutes=60)
    refresh_delta = sj.get("REFRESH_TOKEN_LIFETIME") or timedelta(days=7)

    now = timezone.now()
    access = jwt.encode(
        {
            "type": "agent_access",
            "agent_id": agent_id,
            "exp": now + access_delta,
            "iat": now,
        },
        settings.JWT_HS256_SIGNING_KEY,
        algorithm="HS256",
    )
    refresh = jwt.encode(
        {
            "type": "agent_refresh",
            "agent_id": agent_id,
            "exp": now + refresh_delta,
            "iat": now,
        },
        settings.JWT_HS256_SIGNING_KEY,
        algorithm="HS256",
    )
    if isinstance(access, bytes):
        access = access.decode("ascii")
    if isinstance(refresh, bytes):
        refresh = refresh.decode("ascii")
    return access, refresh
