from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from barbers.models import Barber, BarberProfile, BarberService
from bookings.models import Booking
from salons.models import BarberWorkingHours as SalonBarberWorkingHours
from salons.models import Salon, SalonHours, SalonMembership, Service

BOOKING_BLOCKING_STATUSES = [
    Booking.Status.PENDING,
    Booking.Status.ACCEPTED,
    Booking.Status.IN_PROGRESS,
]


def parse_id_list(raw: str) -> list[int]:
    return [int(x) for x in str(raw or "").split(",") if x.strip().isdigit()]


def slot_overlaps_breaks(t_aware, end_aware, breaks_list, tz) -> bool:
    for br in breaks_list or []:
        if not isinstance(br, dict):
            continue
        try:
            st = datetime.strptime(str(br.get("start", "")), "%H:%M").time()
            et = datetime.strptime(str(br.get("end", "")), "%H:%M").time()
        except (ValueError, TypeError):
            continue
        if st >= et:
            continue
        bs = timezone.make_aware(datetime.combine(t_aware.date(), st), tz)
        be = timezone.make_aware(datetime.combine(t_aware.date(), et), tz)
        if bs < end_aware and be > t_aware:
            return True
    return False


def get_salon_services_for_barber(salon: Salon, barber: Barber, service_ids: Iterable[int]):
    ids = list(service_ids)
    return list(
        Service.objects.filter(
            Q(barber__isnull=True) | Q(barber=barber),
            Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True),
            id__in=ids,
            salon=salon,
            is_active=True,
        )
    )


def get_independent_services_for_barber(barber: Barber, service_ids: Iterable[int]):
    ids = list(service_ids)
    return list(
        BarberService.objects.filter(
            Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True),
            profile__barber=barber,
            id__in=ids,
            is_active=True,
        )
    )


def _total_minutes(services) -> int:
    return sum(int(s.duration_minutes) for s in services)


def _window_for_salon(salon: Salon, barber: Barber, target_date):
    weekday = target_date.weekday()
    closed = salon.closed_weekdays or []
    if isinstance(closed, list) and weekday in closed:
        return None, None, [], "Salon bu kuni yopiq."

    sh = SalonHours.objects.filter(salon=salon, weekday=weekday).first()
    if not sh:
        return None, None, [], "Salon ish vaqti kiritilmagan."

    mem = SalonMembership.objects.filter(
        barber=barber,
        salon=salon,
        invite_state=SalonMembership.InviteState.ACTIVE,
    ).first()
    if not mem:
        return None, None, [], "Barber bu salonda faol emas."

    open_t = sh.open_time
    close_t = sh.close_time
    breaks_list = []
    bh = SalonBarberWorkingHours.objects.filter(membership=mem, weekday=weekday).first()
    if bh and bh.is_day_off:
        return None, None, [], "Barber bu kuni dam oladi."
    if bh:
        open_t = max(open_t, bh.open_time)
        close_t = min(close_t, bh.close_time)
        breaks_list = list(getattr(bh, "breaks", []) or [])
    if open_t >= close_t:
        return None, None, [], "Bu kunda ish oralig'i mavjud emas."
    return open_t, close_t, breaks_list, None


def _window_for_independent(barber: Barber, target_date):
    weekday = target_date.weekday()
    prof = BarberProfile.objects.filter(barber=barber).first()
    if not prof:
        return None, None, [], "Barber profili topilmadi."

    wh = prof.working_hours.filter(weekday=weekday).first()
    if wh and wh.is_day_off:
        return None, None, [], "Barber bu kuni dam oladi."
    if not wh:
        return None, None, [], "Barber ish jadvalini kiritmagan."
    open_t = wh.open_time
    close_t = wh.close_time
    breaks_list = list(wh.breaks or [])
    if open_t >= close_t:
        return None, None, [], "Bu kunda ish oralig'i mavjud emas."
    return open_t, close_t, breaks_list, None


def build_available_slots(*, barber: Barber, services, target_date, salon: Salon | None = None):
    total_minutes = _total_minutes(services)
    if total_minutes <= 0:
        return {"slots": [], "total_minutes": 0, "closed_reason": "Xizmat davomiyligi noto'g'ri."}

    if salon is not None:
        open_t, close_t, breaks_list, reason = _window_for_salon(salon, barber, target_date)
    else:
        open_t, close_t, breaks_list, reason = _window_for_independent(barber, target_date)
    if reason:
        return {"slots": [], "total_minutes": total_minutes, "closed_reason": reason}

    tz = timezone.get_current_timezone()
    slot_step = 15
    day_start = timezone.make_aware(datetime.combine(target_date, open_t), tz)
    day_end = timezone.make_aware(datetime.combine(target_date, close_t), tz)
    slots = []
    t = day_start
    now = timezone.now()
    while t + timedelta(minutes=total_minutes) <= day_end:
        if t < now:
            t += timedelta(minutes=slot_step)
            continue
        end_slot = t + timedelta(minutes=total_minutes)
        overlap = Booking.objects.filter(
            barber=barber,
            status__in=BOOKING_BLOCKING_STATUSES,
            start_at__lt=end_slot,
            end_at__gt=t,
        ).exists()
        if not overlap and not slot_overlaps_breaks(t, end_slot, breaks_list, tz):
            slots.append(t.strftime("%H:%M"))
        t += timedelta(minutes=slot_step)

    return {"slots": slots, "total_minutes": total_minutes}


def assert_booking_slot_available(*, barber: Barber, services, start_at, salon: Salon | None = None):
    start_local = timezone.localtime(start_at)
    if start_at < timezone.now():
        raise ValidationError({"detail": "O'tgan vaqtga bron qilib bo'lmaydi."})
    if start_local.minute % 15 != 0 or start_local.second or start_local.microsecond:
        raise ValidationError({"detail": "Bron vaqti 15 daqiqalik slotga mos bo'lishi kerak."})

    payload = build_available_slots(
        barber=barber,
        services=services,
        target_date=start_local.date(),
        salon=salon,
    )
    selected = start_local.strftime("%H:%M")
    if selected not in payload.get("slots", []):
        reason = payload.get("closed_reason") or "Tanlangan vaqt mavjud slotlar ichida emas."
        raise ValidationError({"detail": reason})
