"""Salonga ishchi sifatida ACTIVE membership bog‘lash (join endpoint va register+join)."""

from django.db import transaction
from rest_framework.exceptions import PermissionDenied

from barbers.models import BarberProfile

from .models import Salon, SalonMembership


def attach_worker_membership(barber, salon, lat: float, lng: float) -> SalonMembership:
    """
    Boshqa faol membershiplarni DECLINED qiladi, ushbu salonda WORKER + ACTIVE qiladi,
    BarberProfile koordinatalarini yangilaydi.
    Masofa tekshiruvi chaqirib turuvchi tomonda (serializer / view).
    """
    if Salon.objects.filter(owner_barber=barber).exists():
        raise PermissionDenied(
            "Salon egasi boshqa salonoga ishchi sifatida qo'shila olmaydi."
        )

    with transaction.atomic():
        SalonMembership.objects.filter(
            barber=barber,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).exclude(salon=salon).update(invite_state=SalonMembership.InviteState.DECLINED)

        mem, created = SalonMembership.objects.get_or_create(
            barber=barber,
            salon=salon,
            defaults={
                "role": SalonMembership.Role.WORKER,
                "invite_state": SalonMembership.InviteState.ACTIVE,
            },
        )
        if not created:
            mem.role = SalonMembership.Role.WORKER
            mem.invite_state = SalonMembership.InviteState.ACTIVE
            mem.save(update_fields=["role", "invite_state"])

        BarberProfile.objects.update_or_create(
            barber=barber,
            defaults={
                "latitude": lat,
                "longitude": lng,
            },
        )

    # Ishchining mavjud xizmatlarini yangi salon katalogiga moslashtirish —
    # mijoz salon sahifasida darhol ko‘rinishi uchun.
    from barbers.salon_service_sync import sync_all_barber_services_for_barber

    sync_all_barber_services_for_barber(barber)
    return mem
