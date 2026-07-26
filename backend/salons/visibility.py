"""Mijoz (user) katalogida salon ko‘rinishi — faqat obuna yoki faol trial."""

from __future__ import annotations

from django.db.models import Q, QuerySet
from django.utils import timezone

from salons.models import Salon


def salon_customer_visible_q(*, now=None) -> Q:
    """
    Published + (faol obuna statusi | muddati o‘tmagan trial | egada faol shop sub).
    Shop sub — to‘lovdan keyin salon statusi hali sync bo‘lmagan holatlar uchun.
    """
    now = now or timezone.now()
    from barbers.models import BarberShopSubscription

    entitled_owner_ids = BarberShopSubscription.objects.filter(
        status=BarberShopSubscription.Status.ACTIVE,
        ends_at__gt=now,
    ).values_list("barber_id", flat=True)

    entitled = (
        Q(subscription_status=Salon.SubscriptionStatus.ACTIVE)
        | Q(
            subscription_status=Salon.SubscriptionStatus.TRIAL,
            trial_ends_at__gt=now,
        )
        | Q(owner_barber_id__in=entitled_owner_ids)
    )
    return Q(is_published=True) & entitled


def filter_customer_visible_salons(qs: QuerySet, *, now=None) -> QuerySet:
    return qs.filter(salon_customer_visible_q(now=now))


def get_customer_visible_salon_or_404(salon_id: int, *, now=None):
    from django.shortcuts import get_object_or_404

    return get_object_or_404(
        filter_customer_visible_salons(Salon.objects.all(), now=now),
        pk=salon_id,
    )


def salon_is_customer_visible(salon: Salon, *, now=None) -> bool:
    now = now or timezone.now()
    if not salon.is_published:
        return False
    status = (salon.subscription_status or Salon.SubscriptionStatus.NONE).strip()
    if status == Salon.SubscriptionStatus.ACTIVE:
        return True
    if status == Salon.SubscriptionStatus.TRIAL:
        ends = salon.trial_ends_at
        if ends is not None and ends > now:
            return True
    owner_id = getattr(salon, "owner_barber_id", None)
    if owner_id:
        from barbers.shop_subscription_services import has_active_subscription
        from barbers.models import Barber

        try:
            owner = Barber.objects.get(pk=owner_id)
        except Barber.DoesNotExist:
            return False
        return has_active_subscription(owner)
    return False


def sync_owned_salons_subscription_active(barber) -> int:
    """Egasi to‘lov qilganda owned salonlarni active qilish."""
    now = timezone.now()
    return Salon.objects.filter(owner_barber=barber).exclude(
        subscription_status=Salon.SubscriptionStatus.ACTIVE
    ).update(
        subscription_status=Salon.SubscriptionStatus.ACTIVE,
        updated_at=now,
    )
