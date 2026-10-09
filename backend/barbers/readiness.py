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

    prof = BarberProfile.objects.filter(barber=barber).first()
    has_location = bool(prof and prof.latitude is not None and prof.longitude is not None)
    # Email tasdiqlash barber aktivatsiyasi uchun talab qilinmaydi.
    email_verified = True

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

    fully_ready = signup_complete and services_ok and schedule_ok

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
    from barbers.shop_subscription_services import barber_has_customer_entitlement

    return barber_has_customer_entitlement(barber)


def barber_is_staff_listable(barber: Barber, salon) -> bool:
    """
    Salon staff: egasi — salon/shop entitlement bo‘lsa (readiness alohida is_bookable).
    Ishchilar — fully_ready + o‘z obunasi/trial.
    """
    from barbers.shop_subscription_services import barber_has_customer_entitlement

    if salon.owner_barber_id == barber.id:
        return barber_has_customer_entitlement(barber)
    return barber_is_publicly_visible(barber)


_VISIBLE_CACHE_KEY = "barbers:publicly_visible_ids:v1"
_VISIBLE_TTL_SECONDS = 45


def publicly_visible_barber_ids() -> set[int]:
    """Katalog uchun ko‘rinadigan barber id lari. 45s cache, bulk SQL."""
    from django.core.cache import cache

    try:
        cached = cache.get(_VISIBLE_CACHE_KEY)
    except Exception:
        cached = None
    if isinstance(cached, list):
        return set(cached)
    ids = _compute_publicly_visible_barber_ids()
    try:
        cache.set(_VISIBLE_CACHE_KEY, list(ids), _VISIBLE_TTL_SECONDS)
    except Exception:
        pass
    return ids


def batch_publicly_visible_barber_ids(barber_ids: list[int]) -> set[int]:
    """Katalog filtri uchun: fully_ready + obuna yoki salon trial/active."""
    if not barber_ids:
        return set()
    return publicly_visible_barber_ids() & set(barber_ids)


def _active_service_q() -> Q:
    return Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True)


def _compute_publicly_visible_barber_ids() -> set[int]:
    """compute_barber_readiness + entitlement, lekin har barber uchun alohida SQL siz."""
    from django.db.models import Count
    from django.utils import timezone

    from barbers.models import (
        Barber,
        BarberService,
        BarberShopSubscription,
        BarberSignupSnapshot,
        BarberWorkingHours,
    )
    from salons.models import BarberWorkingHours as SalonWorkingHours
    from salons.models import Salon, SalonHours, SalonMembership, Service

    now = timezone.now()
    profiles: dict[int, tuple] = {}
    for bid, lat, lng, location_text in Barber.objects.values_list(
        "profile__barber_id",
        "profile__latitude",
        "profile__longitude",
        "profile__location_text",
    ):
        if bid:
            profiles[bid] = (lat, lng, location_text or "")

    snapshots = dict(
        BarberSignupSnapshot.objects.values_list("barber_id", "has_salon")
    )
    owned_salon_ids = set(
        Salon.objects.exclude(owner_barber_id=None).values_list("owner_barber_id", flat=True)
    )

    active_mem: dict[int, tuple[int, int]] = {}
    for bid, mid, sid in (
        SalonMembership.objects.filter(invite_state=SalonMembership.InviteState.ACTIVE)
        .order_by("barber_id", "-id")
        .values_list("barber_id", "id", "salon_id")
    ):
        active_mem.setdefault(bid, (mid, sid))

    owner_mem: dict[int, tuple[int, int]] = {}
    for bid, mid, sid, owner_id in (
        SalonMembership.objects.order_by("barber_id", "-id").values_list(
            "barber_id", "id", "salon_id", "salon__owner_barber_id"
        )
    ):
        if owner_id == bid:
            owner_mem.setdefault(bid, (mid, sid))

    barber_service_counts = {
        bid: count
        for bid, count in (
            BarberService.objects.filter(is_active=True)
            .filter(_active_service_q())
            .values("profile__barber_id")
            .annotate(c=Count("id"))
            .values_list("profile__barber_id", "c")
        )
        if bid
    }

    salon_service_counts: dict[tuple[int, int | None], int] = {}
    for sid, barber_id, count in (
        Service.objects.filter(is_active=True)
        .filter(_active_service_q())
        .values("salon_id", "barber_id")
        .annotate(c=Count("id"))
        .values_list("salon_id", "barber_id", "c")
    ):
        salon_service_counts[(sid, barber_id)] = count
    # Owner setup: istalgan faol Service, catalog filtrisiz.
    salons_with_raw_service = set(
        Service.objects.filter(is_active=True).values_list("salon_id", flat=True).distinct()
    )

    indep_hours = set(
        BarberWorkingHours.objects.filter(is_day_off=False).values_list(
            "profile__barber_id", flat=True
        )
    )
    membership_hours = set(
        SalonWorkingHours.objects.filter(is_day_off=False).values_list("membership_id", flat=True)
    )
    salons_with_hours = set(SalonHours.objects.values_list("salon_id", flat=True).distinct())

    subscribed = set(
        BarberShopSubscription.objects.filter(status=BarberShopSubscription.Status.ACTIVE)
        .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        .values_list("barber_id", flat=True)
    )
    entitled_owners = set(
        Salon.objects.filter(is_published=True)
        .filter(
            Q(subscription_status=Salon.SubscriptionStatus.ACTIVE)
            | Q(subscription_status=Salon.SubscriptionStatus.TRIAL, trial_ends_at__gt=now)
        )
        .exclude(owner_barber_id=None)
        .values_list("owner_barber_id", flat=True)
    )
    entitled = subscribed | entitled_owners

    out: set[int] = set()
    for bid, work_mode, onboarding_flow in Barber.objects.values_list(
        "id", "work_mode", "onboarding_flow"
    ):
        if bid not in entitled:
            continue
        if _barber_fully_ready(
            bid,
            work_mode or "",
            onboarding_flow or "",
            bool(snapshots.get(bid)),
            profiles.get(bid),
            bid in owned_salon_ids,
            active_mem.get(bid),
            owner_mem.get(bid),
            barber_service_counts.get(bid, 0),
            salon_service_counts,
            salons_with_raw_service,
            bid in indep_hours,
            membership_hours,
            salons_with_hours,
        ):
            out.add(bid)
    return out


def _salon_service_count(
    salon_id: int | None,
    barber_id: int,
    salon_service_counts: dict[tuple[int, int | None], int],
) -> int:
    if not salon_id:
        return 0
    return salon_service_counts.get((salon_id, barber_id), 0) + salon_service_counts.get(
        (salon_id, None), 0
    )


def _barber_fully_ready(
    bid: int,
    work_mode: str,
    onboarding_flow: str,
    snapshot_has_salon: bool,
    profile: tuple | None,
    owns_salon: bool,
    active: tuple[int, int] | None,
    owner: tuple[int, int] | None,
    barber_services: int,
    salon_service_counts: dict[tuple[int, int | None], int],
    salons_with_raw_service: set[int],
    has_indep_hours: bool,
    membership_hours: set[int],
    salons_with_hours: set[int],
) -> bool:
    lat = profile[0] if profile else None
    lng = profile[1] if profile else None
    location_text = profile[2] if profile else ""
    has_location = lat is not None and lng is not None

    flow = onboarding_flow.strip()
    if not flow:
        if work_mode == "independent":
            flow = "independent"
        elif snapshot_has_salon:
            flow = "employee"
        else:
            flow = "owner"

    signup_complete = False
    services_ok = False
    schedule_ok = False

    if flow == "independent" or work_mode == "independent":
        services_ok = barber_services >= MIN_ACTIVE_SERVICES
        schedule_ok = has_indep_hours
        setup_services = barber_services >= MIN_SETUP_SERVICES
        signup_complete = has_location and setup_services and has_indep_hours
    elif flow in ("owner", "mybarber"):
        sid = owner[1] if owner else None
        mid = owner[0] if owner else None
        has_schedule = bool(mid and mid in membership_hours) or bool(
            sid and sid in salons_with_hours
        )
        schedule_ok = bool(has_schedule)
        svc_count = max(barber_services, _salon_service_count(sid, bid, salon_service_counts))
        services_ok = svc_count >= MIN_ACTIVE_SERVICES
        setup_services = barber_services >= MIN_SETUP_SERVICES or (
            sid is not None and sid in salons_with_raw_service
        )
        signup_complete = owns_salon and has_location and setup_services and has_schedule
    elif flow == "employee":
        if active:
            mid, sid = active
            has_schedule = mid in membership_hours
            schedule_ok = has_schedule
            svc_count = max(barber_services, _salon_service_count(sid, bid, salon_service_counts))
            services_ok = svc_count >= MIN_ACTIVE_SERVICES
            setup_services = barber_services >= MIN_SETUP_SERVICES
            profile_ok = len(location_text.strip()) >= 5
            signup_complete = bool(
                has_location and profile_ok and setup_services and has_schedule
            )

    return signup_complete and services_ok and schedule_ok


def build_onboarding_status_payload(barber: Barber) -> dict:
    """BarberOnboardingStatusView uchun JSON (DRF Response ga beriladi)."""
    r = compute_barber_readiness(barber)
    steps = {
        "email_verified": True,
        "signup_complete": r.signup_complete,
        "services_ok": r.services_ok,
        "schedule_ok": r.schedule_ok,
    }
    core_steps = (r.signup_complete, r.services_ok, r.schedule_ok)
    readiness_percent = int(round(100 * sum(bool(v) for v in core_steps) / 3))
    booking_missing: list[str] = []
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
