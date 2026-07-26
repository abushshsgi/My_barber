"""Field agent referral — kod generatsiyasi va attribution."""

from __future__ import annotations

import os
import secrets
from datetime import timedelta
from urllib.parse import quote

from django.db import IntegrityError, transaction
from django.utils import timezone

from agents.models import AgentReferralAttribution, FieldAgent

# O/0, I/1, L chalkashligisiz.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LENGTH = 8
_MAX_ATTEMPTS = 8

TRIAL_DAYS = 21
TRIAL_VALUE_UZS = 99_990


def generate_agent_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


def normalize_agent_code(raw: object) -> str:
    if not raw:
        return ""
    text = str(raw).strip().upper()
    return "".join(ch for ch in text if ch in _CODE_ALPHABET)[:_CODE_LENGTH]


def ensure_agent_code(agent: FieldAgent) -> str:
    if agent.code:
        return agent.code
    for _ in range(_MAX_ATTEMPTS):
        code = generate_agent_code()
        try:
            with transaction.atomic():
                updated = FieldAgent.objects.filter(pk=agent.pk, code="").update(code=code)
            if updated:
                agent.code = code
                return code
            fresh = FieldAgent.objects.filter(pk=agent.pk).values_list("code", flat=True).first()
            if fresh:
                agent.code = fresh
                return fresh
        except IntegrityError:
            continue
    raise RuntimeError("Agent kod yaratib bo'lmadi.")


def allocate_unique_code() -> str:
    for _ in range(_MAX_ATTEMPTS):
        code = generate_agent_code()
        if not FieldAgent.objects.filter(code=code).exists():
            return code
    raise RuntimeError("Agent kod yaratib bo'lmadi.")


def _is_local_origin(origin: str) -> bool:
    lower = origin.lower()
    return (
        "localhost" in lower
        or "127.0.0.1" in lower
        or "0.0.0.0" in lower
        or "[::1]" in lower
    )


def partner_app_public_base() -> str:
    from django.conf import settings

    raw = os.environ.get("FRONTEND_BARBER_ORIGIN", "").strip()
    candidates: list[str] = []
    if raw:
        for part in raw.split(","):
            cleaned = part.strip().strip('"').strip("'").rstrip("/")
            if cleaned:
                candidates.append(cleaned)
    for origin in candidates:
        if not _is_local_origin(origin):
            return origin
    prod = getattr(settings, "PROD_BARBER_APP_BASE", "") or ""
    if prod:
        return prod.rstrip("/")
    return "https://partner.mysaloon.uz"


def build_agent_invite_url(code: str) -> str:
    return f"{partner_app_public_base()}/auth?ref={quote(code, safe='')}&tab=signup"


def apply_agent_referral(*, barber, code: object) -> AgentReferralAttribution | None:
    """Yangi barber yaratilgandan so'ng agent kodini biriktirish.

    Noto'g'ri kod jim e'tiborsiz — signup buzilmasin.
    """
    normalized = normalize_agent_code(code)
    if not normalized:
        return None
    if getattr(barber, "referred_by_agent_id", None):
        return None

    agent = FieldAgent.objects.filter(code=normalized, is_active=True).first()
    if not agent:
        return None

    try:
        with transaction.atomic():
            attribution = AgentReferralAttribution.objects.create(
                agent=agent,
                barber=barber,
                code_used=normalized,
            )
            type(barber).objects.filter(pk=barber.pk, referred_by_agent__isnull=True).update(
                referred_by_agent=agent
            )
            barber.referred_by_agent = agent
            return attribution
    except IntegrityError:
        return None


def start_salon_trial(salon, *, agent: FieldAgent | None = None) -> None:
    """3 haftalik bepul trial (99.990 so'm qiymatida)."""
    now = timezone.now()
    updates: dict = {
        "subscription_status": "trial",
        "trial_started_at": now,
        "trial_ends_at": now + timedelta(days=TRIAL_DAYS),
        "trial_value_uzs": TRIAL_VALUE_UZS,
    }
    if agent is not None and not getattr(salon, "referred_by_agent_id", None):
        updates["referred_by_agent"] = agent
    for key, value in updates.items():
        setattr(salon, key, value)
    salon.save(update_fields=[*updates.keys(), "updated_at"])


def attribute_salon_to_agent(*, salon, barber) -> AgentReferralAttribution | None:
    """Salon yaratilganda — barber agentiga bog'lash + trial."""
    agent = getattr(barber, "referred_by_agent", None)
    if agent is None:
        agent_id = getattr(barber, "referred_by_agent_id", None)
        if agent_id:
            agent = FieldAgent.objects.filter(pk=agent_id, is_active=True).first()
    if agent is None:
        return None

    attribution = AgentReferralAttribution.objects.filter(barber=barber).first()
    now = timezone.now()
    with transaction.atomic():
        start_salon_trial(salon, agent=agent)
        if attribution:
            if not attribution.salon_id:
                attribution.salon = salon
                attribution.salon_attributed_at = now
                attribution.save(update_fields=["salon", "salon_attributed_at"])
            return attribution
        try:
            return AgentReferralAttribution.objects.create(
                agent=agent,
                barber=barber,
                salon=salon,
                code_used=agent.code,
                salon_attributed_at=now,
            )
        except IntegrityError:
            attribution = AgentReferralAttribution.objects.filter(barber=barber).first()
            if attribution and not attribution.salon_id:
                attribution.salon = salon
                attribution.salon_attributed_at = now
                attribution.save(update_fields=["salon", "salon_attributed_at"])
            return attribution


def agent_stats_payload(agent: FieldAgent) -> dict:
    from django.db.models import Count, Q

    from salons.models import Salon

    attrs = AgentReferralAttribution.objects.filter(agent=agent)
    salons = Salon.objects.filter(referred_by_agent=agent)
    now = timezone.now()
    salon_counts = salons.aggregate(
        total=Count("id"),
        trial=Count("id", filter=Q(subscription_status="trial", trial_ends_at__gt=now)),
        expired=Count(
            "id",
            filter=Q(subscription_status="expired")
            | Q(subscription_status="trial", trial_ends_at__lte=now),
        ),
        active=Count("id", filter=Q(subscription_status="active")),
        published=Count("id", filter=Q(is_published=True)),
    )
    return {
        "barbers_referred": attrs.count(),
        "salons_referred": salon_counts["total"] or 0,
        "salons_trial": salon_counts["trial"] or 0,
        "salons_expired": salon_counts["expired"] or 0,
        "salons_active": salon_counts["active"] or 0,
        "salons_published": salon_counts["published"] or 0,
        "trial_days": TRIAL_DAYS,
        "trial_value_uzs": TRIAL_VALUE_UZS,
    }
