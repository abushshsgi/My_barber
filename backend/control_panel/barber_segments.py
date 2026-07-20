"""Admin: sartaroshni ro‘yxatdan o‘tish / ish rejimi bo‘yicha segmentlash."""

from django.db.models import Count, Exists, OuterRef, QuerySet

from barbers.models import Barber
from salons.models import SalonMembership


def _external_active_membership_exists():
    return SalonMembership.objects.filter(
        barber_id=OuterRef("pk"),
        invite_state=SalonMembership.InviteState.ACTIVE,
    ).exclude(salon__owner_barber_id=OuterRef("pk"))


def annotate_barber_segment_fields(qs: QuerySet) -> QuerySet:
    return qs.annotate(
        _owned_cnt=Count("owned_salons", distinct=True),
        _ext_mem=Exists(_external_active_membership_exists()),
    )


def segment_for_barber(obj: Barber) -> str:
    """Serializer / admin UI bilan bir xil ustuvorlik."""
    if (obj.work_mode or "") == Barber.WorkMode.INDEPENDENT:
        return "independent"
    flow = (obj.onboarding_flow or "").strip()
    if flow == Barber.OnboardingFlow.MYBARBER:
        return "mybarber_salon"
    owned = getattr(obj, "_owned_cnt", None)
    if owned is None:
        owned = obj.owned_salons.count()
    if owned > 0:
        return "salon_owner"
    ext = getattr(obj, "_ext_mem", None)
    if ext is None:
        ext = (
            SalonMembership.objects.filter(
                barber=obj,
                invite_state=SalonMembership.InviteState.ACTIVE,
            )
            .exclude(salon__owner_barber_id=obj.id)
            .exists()
        )
    if ext:
        return "salon_employee"
    return "unknown"


def segment_label(code: str) -> str:
    return {
        "independent": "Mustaqil barber",
        "mybarber_salon": "MyBarber (salon)",
        "salon_owner": "Salon egasi",
        "salon_employee": "Salonga qo‘shilgan",
        "unknown": "Aniqlanmagan / eski",
    }.get(code, code)


def apply_segment_filter(qs: QuerySet, segment: str) -> QuerySet:
    """`qs` allaqachon `annotate_barber_segment_fields` bilan boyitilgan bo‘lishi kerak."""
    segment = (segment or "").strip().lower()
    if not segment or segment in ("all", ""):
        return qs
    if segment == "independent":
        return qs.filter(work_mode=Barber.WorkMode.INDEPENDENT)
    if segment == "mybarber_salon":
        return qs.filter(onboarding_flow=Barber.OnboardingFlow.MYBARBER).exclude(
            work_mode=Barber.WorkMode.INDEPENDENT
        )
    if segment == "salon_owner":
        return (
            qs.filter(_owned_cnt__gt=0)
            .exclude(work_mode=Barber.WorkMode.INDEPENDENT)
            .exclude(onboarding_flow=Barber.OnboardingFlow.MYBARBER)
        )
    if segment == "salon_employee":
        return (
            qs.filter(_owned_cnt=0, _ext_mem=True)
            .exclude(work_mode=Barber.WorkMode.INDEPENDENT)
            .exclude(onboarding_flow=Barber.OnboardingFlow.MYBARBER)
        )
    if segment == "unknown":
        return (
            qs.filter(_owned_cnt=0, _ext_mem=False)
            .exclude(work_mode=Barber.WorkMode.INDEPENDENT)
            .exclude(onboarding_flow=Barber.OnboardingFlow.MYBARBER)
        )
    return qs


def barber_segment_counts() -> dict[str, int]:
    """Bir-biridan ajralgan segmentlar bo‘yicha sonlar."""
    qs = annotate_barber_segment_fields(Barber.objects.all())
    independent = qs.filter(work_mode=Barber.WorkMode.INDEPENDENT).count()
    mybarber = (
        qs.filter(onboarding_flow=Barber.OnboardingFlow.MYBARBER)
        .exclude(work_mode=Barber.WorkMode.INDEPENDENT)
        .count()
    )
    salon_owner = (
        qs.filter(_owned_cnt__gt=0)
        .exclude(work_mode=Barber.WorkMode.INDEPENDENT)
        .exclude(onboarding_flow=Barber.OnboardingFlow.MYBARBER)
        .count()
    )
    salon_employee = (
        qs.filter(_owned_cnt=0, _ext_mem=True)
        .exclude(work_mode=Barber.WorkMode.INDEPENDENT)
        .exclude(onboarding_flow=Barber.OnboardingFlow.MYBARBER)
        .count()
    )
    unknown = (
        qs.filter(_owned_cnt=0, _ext_mem=False)
        .exclude(work_mode=Barber.WorkMode.INDEPENDENT)
        .exclude(onboarding_flow=Barber.OnboardingFlow.MYBARBER)
        .count()
    )
    total = qs.count()
    barbershop = Barber.objects.filter(business_kind=Barber.BusinessKind.BARBERSHOP).count()
    beauty_salon = Barber.objects.filter(business_kind=Barber.BusinessKind.BEAUTY_SALON).count()
    kind_unset = Barber.objects.filter(business_kind="").count()
    return {
        "total": total,
        "independent": independent,
        "mybarber_salon": mybarber,
        "salon_owner": salon_owner,
        "salon_employee": salon_employee,
        "unknown": unknown,
        "barbershop": barbershop,
        "beauty_salon": beauty_salon,
        "kind_unset": kind_unset,
    }
