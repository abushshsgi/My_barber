"""
Barber «100%» tayyorligi: email, signup, kamida 5 xizmat, ish jadvali.
Mijoz katalogi va panel bloklari uchun yagona manba.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from django.db.models import Q

if TYPE_CHECKING:
    from barbers.models import Barber

MIN_ACTIVE_SERVICES = 5
MIN_SETUP_SERVICES = 1


def _barber_active_service_count(barber: Barber) -> int:
    from barbers.models import BarberService

    return BarberService.objects.filter(
        profile__barber=barber,
        is_active=True,
    ).filter(Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True)).count()


def _profile_location_text_ok(prof) -> bool:
    return bool(prof and len((prof.location_text or "").strip()) >= 5)


@dataclass(frozen=True)
class ReadinessBreakdown:
    email_verified: bool
    signup_complete: bool
    services_ok: bool
    schedule_ok: bool
    fully_ready: bool
    required_next_path: str | None
    flow: str | None
    work_mode: str
    has_location: bool
    owns_salon: bool
    active_membership_id: int | None
    owner_membership_id: int | None
    salon_id: int | None
    has_services_count: int
    has_membership_hours: bool | None
    has_working_hours: bool | None


def _service_count_independent(barber: Barber) -> int:
    from barbers.models import BarberService

    return BarberService.objects.filter(
        profile__barber=barber,
        is_active=True,
    ).filter(Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True)).count()


def _service_count_salon(salon_id: int, barber: Barber) -> int:
    from salons.models import Service

    return (
        Service.objects.filter(salon_id=salon_id, is_active=True)
        .filter(Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True))
        .filter(Q(barber=barber) | Q(barber__isnull=True))
        .count()
    )


def _owner_setup_services_ok(barber: Barber, salon_id: int | None) -> bool:
    """Owner onboarding: salon Service yoki BarberService yetarli."""
    if _barber_active_service_count(barber) >= MIN_SETUP_SERVICES:
        return True
    if not salon_id:
        return False
    from salons.models import Service

    return Service.objects.filter(salon_id=salon_id, is_active=True).exists()


def _owner_has_schedule(salon_id: int | None, membership) -> bool:
    """Owner onboarding: membership soatlari yoki salon SalonHours."""
    from salons.models import BarberWorkingHours as SalonWorkingHours
    from salons.models import SalonHours

    if membership and SalonWorkingHours.objects.filter(
        membership=membership, is_day_off=False
    ).exists():
        return True
    if salon_id:
        return SalonHours.objects.filter(salon_id=salon_id).exists()
    return False


def _service_count_for_readiness(barber: Barber, salon_id: int | None = None) -> int:
    """
    Barber panel `/api/v1/barber/services/` BarberService yozadi.
    Salon Service alohida bo‘lishi mumkin — ikkalasidan kattasini olamiz.
    """
    barber_count = _service_count_independent(barber)
    if not salon_id:
        return barber_count
    return max(barber_count, _service_count_salon(salon_id, barber))


def compute_barber_readiness(barber: Barber) -> ReadinessBreakdown:
    from barbers.models import BarberProfile, BarberWorkingHours as IndepWorkingHours
    from salons.models import BarberWorkingHours as SalonWorkingHours
    from salons.models import Salon, SalonMembership

    wm = barber.work_mode
    flow = (barber.onboarding_flow or "").strip()
    if not flow:
        from barbers.models import BarberSignupSnapshot

        snap = BarberSignupSnapshot.objects.filter(barber=barber).first()
        if wm == "independent":
            flow = "independent"
        elif snap and snap.has_salon:
            flow = "employee"
        else:
            flow = "owner"

    from accounts.email_utils import is_internal_email

    prof = BarberProfile.objects.filter(barber=barber).first()
    has_location = bool(prof and prof.latitude is not None and prof.longitude is not None)
    email_verified = barber.email_verified_at is not None or is_internal_email(barber.email)

    owns_salon = Salon.objects.filter(owner_barber=barber).exists()
    active_mem = SalonMembership.objects.filter(
        barber=barber, invite_state=SalonMembership.InviteState.ACTIVE
    ).select_related("salon").first()
    owner_mem = (
        SalonMembership.objects.filter(barber=barber, salon__owner_barber=barber)
        .select_related("salon")
        .first()
    )
    salon_id = active_mem.salon_id if active_mem else (owner_mem.salon_id if owner_mem else None)

    required_next_path: str | None = None
    signup_complete = False
    services_ok = False
    schedule_ok = False
    has_membership_hours: bool | None = None
    has_work_hours_indep: bool | None = None
    svc_count = 0

    # Independent
    if flow == "independent" or wm == "independent":
        svc_count = _service_count_for_readiness(barber, None)
        has_work_hours_indep = IndepWorkingHours.objects.filter(
            profile__barber=barber, is_day_off=False
        ).exists()
        schedule_ok = bool(has_work_hours_indep)
        services_ok = svc_count >= MIN_ACTIVE_SERVICES
        setup_services = _barber_active_service_count(barber) >= MIN_SETUP_SERVICES
        if not has_location:
            required_next_path = "/independent/setup"
        elif not setup_services or not has_work_hours_indep:
            required_next_path = "/independent/setup"
        else:
            signup_complete = True

    elif flow in ("owner", "mybarber") or (flow == "" and owns_salon):
        setup_path = "/mybarber/setup" if flow == "mybarber" else "/salon/create"
        mem = owner_mem
        sid = owner_mem.salon_id if owner_mem else None
        has_membership_hours = _owner_has_schedule(sid, mem)
        schedule_ok = bool(has_membership_hours)
        svc_count = _service_count_for_readiness(barber, sid)
        services_ok = svc_count >= MIN_ACTIVE_SERVICES
        setup_services = _owner_setup_services_ok(barber, sid)

        if not owns_salon:
            required_next_path = setup_path
        elif not has_location:
            required_next_path = setup_path
        elif not setup_services or not has_membership_hours:
            # Salon mavjud — qayta create wizard emas, aktivatsiya orqali davom etiladi.
            required_next_path = None
            signup_complete = False
        else:
            signup_complete = True

    elif flow == "employee" or flow == "":
        if not active_mem:
            required_next_path = "/salon/join"
        else:
            has_membership_hours = SalonWorkingHours.objects.filter(
                membership=active_mem, is_day_off=False
            ).exists()
            schedule_ok = bool(has_membership_hours)
            svc_count = _service_count_for_readiness(barber, active_mem.salon_id)
            services_ok = svc_count >= MIN_ACTIVE_SERVICES
            setup_services = _barber_active_service_count(barber) >= MIN_SETUP_SERVICES
            profile_ok = _profile_location_text_ok(prof)
            if not (has_location and profile_ok and setup_services and schedule_ok):
                required_next_path = "/salon/join/setup"
            else:
                signup_complete = True

    else:
        required_next_path = "/auth"

    fully_ready = email_verified and signup_complete and services_ok and schedule_ok

    return ReadinessBreakdown(
        email_verified=email_verified,
        signup_complete=signup_complete,
        services_ok=services_ok,
        schedule_ok=schedule_ok,
        fully_ready=fully_ready,
        required_next_path=required_next_path,
        flow=flow or None,
        work_mode=wm,
        has_location=has_location,
        owns_salon=owns_salon,
        active_membership_id=active_mem.id if active_mem else None,
        owner_membership_id=owner_mem.id if owner_mem else None,
        salon_id=salon_id,
        has_services_count=svc_count,
        has_membership_hours=has_membership_hours,
        has_working_hours=has_work_hours_indep,
    )


def barber_is_publicly_visible(barber: Barber) -> bool:
    if not compute_barber_readiness(barber).fully_ready:
        return False
    from barbers.shop_subscription_services import has_active_subscription

    return has_active_subscription(barber)


def barber_is_staff_listable(barber: Barber, salon) -> bool:
    """Salon staff ro‘yxati: ega doim; ishchilar faqat bron qabul qila oladigan bo‘lsa."""
    if salon.owner_barber_id == barber.id:
        return True
    return barber_is_publicly_visible(barber)


def batch_publicly_visible_barber_ids(barber_ids: list[int]) -> set[int]:
    """Katalog filtri uchun: fully_ready + faol obuna."""
    from barbers.models import Barber
    from barbers.shop_subscription_services import has_active_subscription

    if not barber_ids:
        return set()
    out: set[int] = set()
    qs = Barber.objects.filter(pk__in=barber_ids).select_related("profile")
    for b in qs:
        if compute_barber_readiness(b).fully_ready and has_active_subscription(b):
            out.add(b.id)
    return out


def build_onboarding_status_payload(barber: Barber) -> dict:
    """BarberOnboardingStatusView uchun JSON (DRF Response ga beriladi)."""
    r = compute_barber_readiness(barber)
    steps = {
        "email_verified": r.email_verified,
        "signup_complete": r.signup_complete,
        "services_ok": r.services_ok,
        "schedule_ok": r.schedule_ok,
    }
    readiness_percent = int(round(100 * sum(bool(v) for v in steps.values()) / 4))
    booking_missing: list[str] = []
    if not r.email_verified:
        booking_missing.append("email")
    if not r.signup_complete:
        booking_missing.append("signup")
    if not r.services_ok:
        booking_missing.append("services")
    if not r.schedule_ok:
        booking_missing.append("working_hours")

    has_services_display = r.services_ok
    has_hours = bool(r.has_membership_hours or r.has_working_hours)

    from barbers.shop_subscription_services import build_me_payload, has_active_subscription

    shop_sub = build_me_payload(barber)
    has_shop_sub = has_active_subscription(barber)

    return {
        "flow": r.flow,
        "work_mode": r.work_mode,
        "business_kind": (barber.business_kind or "").strip(),
        "has_location": r.has_location,
        "owns_salon": r.owns_salon,
        "active_membership_id": r.active_membership_id,
        "owner_membership_id": r.owner_membership_id,
        "salon_id": r.salon_id,
        "has_services": has_services_display,
        "has_services_count": r.has_services_count,
        "has_working_hours": bool(r.has_working_hours) if r.has_working_hours is not None else None,
        "has_membership_hours": r.has_membership_hours,
        "is_complete": r.signup_complete,
        "required_next_path": r.required_next_path if not r.signup_complete else None,
        "fully_ready": r.fully_ready,
        "has_shop_subscription": has_shop_sub,
        "shop_subscription": shop_sub,
        "subscription_required": r.fully_ready and not has_shop_sub,
        "subscribe_path": "/barber/subscription" if (r.fully_ready and not has_shop_sub) else None,
        "booking_ready": r.fully_ready,
        "booking_missing": booking_missing,
        "booking_setup_path": "/barber/activation" if not r.fully_ready else None,
        "steps": steps,
        "readiness_percent": readiness_percent,
        "email_verified": r.email_verified,
    }
