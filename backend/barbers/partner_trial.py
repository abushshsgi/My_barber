"""Partner agent trial — bir marta, umrbod; telefon/email bo‘yicha ayyorlik himoyasi."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from accounts.phone_utils import normalize_phone_field
from agents.referral import (
    TRIAL_DAYS,
    TRIAL_VALUE_UZS,
    apply_agent_referral,
    normalize_agent_code,
    start_salon_trial,
)
from barbers.models import Barber, BarberShopSubscription, PartnerTrialGrant
from barbers.shop_plans import PLAN_START, entitlement_snapshot
from barbers.shop_subscription_services import get_active_subscription, log_event


class PartnerTrialError(Exception):
    """Foydalanuvchiga ko‘rsatiladigan trial xatosi."""

    def __init__(self, detail: str, *, code: str = "trial_denied"):
        super().__init__(detail)
        self.detail = detail
        self.code = code


def normalize_trial_email(raw: object) -> str:
    return str(raw or "").strip().lower()


def normalize_trial_phone(raw: object) -> str:
    return normalize_phone_field(str(raw or "").strip()) or ""


def barber_trial_fingerprints(barber: Barber) -> tuple[str, str]:
    return normalize_trial_email(barber.email), normalize_trial_phone(barber.phone)


def find_existing_trial_grant(
    *,
    barber: Barber | None = None,
    email_key: str = "",
    phone_key: str = "",
) -> PartnerTrialGrant | None:
    q = Q()
    if barber is not None:
        q |= Q(barber_id=barber.pk)
    if email_key:
        q |= Q(email_key=email_key)
    if phone_key:
        q |= Q(phone_key=phone_key)
    if not q:
        return None
    return PartnerTrialGrant.objects.filter(q).select_related("agent", "barber").first()


def partner_trial_already_used(barber: Barber) -> PartnerTrialGrant | None:
    email_key, phone_key = barber_trial_fingerprints(barber)
    return find_existing_trial_grant(barber=barber, email_key=email_key, phone_key=phone_key)


def barber_can_claim_agent_trial(barber: Barber) -> tuple[bool, str | None]:
    """Egalik / mustaqil — xodimlar o‘ziga trial ola olmaydi."""
    if partner_trial_already_used(barber) is not None:
        return False, "already_used"
    from salons.models import Salon

    if Salon.objects.filter(owner_barber_id=barber.pk).exists():
        return True, None
    if barber.onboarding_flow == Barber.OnboardingFlow.INDEPENDENT:
        return True, None
    if barber.work_mode == Barber.WorkMode.INDEPENDENT:
        return True, None
    if barber.onboarding_flow == Barber.OnboardingFlow.EMPLOYEE:
        return False, "employee_not_eligible"
    return False, "no_owned_salon"


def trial_claim_status_payload(barber: Barber) -> dict:
    grant = partner_trial_already_used(barber)
    eligible, reason = barber_can_claim_agent_trial(barber)
    active = get_active_subscription(barber)
    return {
        "trial_days": TRIAL_DAYS,
        "trial_value_uzs": TRIAL_VALUE_UZS,
        "already_used": grant is not None,
        "eligible": bool(eligible) and active is None,
        "ineligible_reason": None
        if eligible and active is None
        else (
            "has_active_subscription"
            if active is not None
            else reason or ("already_used" if grant else "not_eligible")
        ),
        "grant": None
        if grant is None
        else {
            "ends_at": grant.ends_at.isoformat() if grant.ends_at else None,
            "granted_at": grant.granted_at.isoformat() if grant.granted_at else None,
            "source": grant.source,
            "agent_code": grant.code_used,
        },
    }


def _resolve_primary_salon(barber: Barber, salon=None):
    if salon is not None:
        return salon
    from salons.models import Salon

    return (
        Salon.objects.filter(owner_barber_id=barber.pk)
        .order_by("-created_at")
        .first()
    )


def _activate_shop_trial_subscription(
    *,
    barber: Barber,
    request=None,
    notes: str = "",
) -> BarberShopSubscription:
    now = timezone.now()
    current = get_active_subscription(barber)
    if current is not None:
        if current.source == BarberShopSubscription.Source.AGENT_TRIAL:
            return current
        raise PartnerTrialError(
            "Sizda allaqachon faol obuna bor.",
            code="has_active_subscription",
        )

    ends = now + timedelta(days=TRIAL_DAYS)
    sub = BarberShopSubscription.objects.create(
        barber=barber,
        plan_code=PLAN_START,
        status=BarberShopSubscription.Status.ACTIVE,
        source=BarberShopSubscription.Source.AGENT_TRIAL,
        starts_at=now,
        ends_at=ends,
        price_uzs=Decimal("0"),
        entitlements=entitlement_snapshot(PLAN_START),
        notes=notes or f"Agent trial — {TRIAL_DAYS} kun",
    )
    log_event(
        action="agent_trial_granted",
        barber=barber,
        subscription=sub,
        actor="agent_trial",
        detail={
            "plan_code": PLAN_START,
            "starts_at": now.isoformat(),
            "ends_at": ends.isoformat(),
            "trial_days": TRIAL_DAYS,
            "trial_value_uzs": TRIAL_VALUE_UZS,
        },
        request=request,
    )
    return sub


@transaction.atomic
def grant_partner_agent_trial(
    *,
    barber: Barber,
    agent,
    salon=None,
    source: str = PartnerTrialGrant.Source.CLAIM,
    code_used: str = "",
    request=None,
    credit_advance: bool = True,
) -> PartnerTrialGrant:
    """
    Bir marta trial: salon trial + panel (Start) shop sub.
    Telefon yoki email bo‘yicha oldin berilgan bo‘lsa — rad.
    """
    barber = Barber.objects.select_for_update().get(pk=barber.pk)
    email_key, phone_key = barber_trial_fingerprints(barber)

    existing = find_existing_trial_grant(
        barber=barber, email_key=email_key, phone_key=phone_key
    )
    if existing is not None:
        raise PartnerTrialError(
            "Bu akkaunt (yoki shu telefon/email) uchun bepul trial allaqachon berilgan. "
            "Qayta akkaunt ochib trial olish mumkin emas.",
            code="already_used",
        )

    eligible, reason = barber_can_claim_agent_trial(barber)
    # already_used handled above; employee / no salon for non-admin
    if source != PartnerTrialGrant.Source.ADMIN:
        if not eligible:
            if reason == "employee_not_eligible":
                raise PartnerTrialError(
                    "Xodim akkaunti uchun trial berilmaydi. Salon egasi agent kodini kiritishi kerak.",
                    code=reason,
                )
            raise PartnerTrialError(
                "Trial olish uchun avval o‘z saloningizni yarating.",
                code=reason or "not_eligible",
            )

    primary = _resolve_primary_salon(barber, salon)
    if primary is None and source != PartnerTrialGrant.Source.ADMIN:
        if barber.onboarding_flow not in (
            Barber.OnboardingFlow.INDEPENDENT,
        ) and barber.work_mode != Barber.WorkMode.INDEPENDENT:
            raise PartnerTrialError(
                "Trial olish uchun avval o‘z saloningizni yarating.",
                code="no_owned_salon",
            )

    now = timezone.now()
    ends = now + timedelta(days=TRIAL_DAYS)
    code = normalize_agent_code(code_used) or (getattr(agent, "code", "") or "")

    ip = None
    ua = ""
    if request is not None:
        from barbers.shop_subscription_services import _client_meta

        meta = _client_meta(request)
        ip = meta.get("ip_address")
        ua = (meta.get("user_agent") or "")[:512]

    try:
        grant = PartnerTrialGrant.objects.create(
            barber=barber,
            agent=agent,
            salon=primary,
            email_key=email_key,
            phone_key=phone_key or "",
            code_used=code,
            source=source,
            starts_at=now,
            ends_at=ends,
            trial_value_uzs=TRIAL_VALUE_UZS,
            ip_address=ip,
            user_agent=ua,
        )
    except IntegrityError as exc:
        raise PartnerTrialError(
            "Bu akkaunt (yoki shu telefon/email) uchun bepul trial allaqachon berilgan.",
            code="already_used",
        ) from exc

    # Salon trial on all owned salons (one partner = one grant, don't re-grant later)
    from salons.models import Salon

    owned = list(Salon.objects.filter(owner_barber_id=barber.pk))
    if primary is not None and primary not in owned:
        owned.append(primary)
    for s in owned:
        start_salon_trial(s, agent=agent)

    # Attribution salon bog'lash (claim oqimi)
    from agents.models import AgentReferralAttribution

    attr = AgentReferralAttribution.objects.filter(barber=barber).first()
    if attr and primary is not None and not attr.salon_id:
        attr.salon = primary
        attr.salon_attributed_at = now
        attr.save(update_fields=["salon", "salon_attributed_at"])

    sub = _activate_shop_trial_subscription(
        barber=barber,
        request=request,
        notes=f"Agent trial ({code})",
    )
    grant.shop_subscription = sub
    grant.save(update_fields=["shop_subscription"])

    if credit_advance and primary is not None:
        try:
            from agents.finance import credit_salon_advance

            credit_salon_advance(agent=agent, salon=primary, barber=barber)
        except Exception:
            pass

    return grant


def claim_agent_trial_with_code(
    *,
    barber: Barber,
    code: object,
    request=None,
) -> PartnerTrialGrant:
    """Obuna sahifasidan agent kod / QR orqali trial olish."""
    from agents.models import FieldAgent

    normalized = normalize_agent_code(code)
    if len(normalized) != 8:
        raise PartnerTrialError(
            "Agent kodi 8 belgidan iborat bo‘lishi kerak.",
            code="invalid_code",
        )

    agent = FieldAgent.objects.filter(code=normalized, is_active=True).first()
    if agent is None:
        raise PartnerTrialError(
            "Agent kodi topilmadi yoki faol emas.",
            code="invalid_code",
        )

    if partner_trial_already_used(barber) is not None:
        raise PartnerTrialError(
            "Siz (yoki shu telefon/email) allaqachon bepul trial olgansiz.",
            code="already_used",
        )

    if get_active_subscription(barber) is not None:
        raise PartnerTrialError(
            "Sizda allaqachon faol obuna bor.",
            code="has_active_subscription",
        )

    apply_agent_referral(barber=barber, code=normalized)
    barber.refresh_from_db(fields=["referred_by_agent_id"])

    return grant_partner_agent_trial(
        barber=barber,
        agent=agent,
        source=PartnerTrialGrant.Source.CLAIM,
        code_used=normalized,
        request=request,
        credit_advance=True,
    )
