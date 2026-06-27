"""BarberService → salons.Service sinxronizatsiyasi.

Salon egasining xizmatlari salon katalogiga sync qilinmaydi (egasi katalogni
alohida boshqaradi). Faqat salon ishchilarining shaxsiy xizmatlari sync qilinadi.
"""

from django.test import TestCase

from barbers.models import Barber, BarberProfile, BarberService
from barbers.salon_service_sync import sync_all_barber_services_for_barber, sync_barber_service_to_salons
from salons.models import Salon, SalonMembership, Service


class SalonServiceSyncTests(TestCase):
    def setUp(self):
        self.owner = Barber.objects.create(
            email="sync-owner@test.uz",
            username="sync-owner@test.uz",
            full_name="Sync Owner",
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
        )
        self.owner.set_password("pass12345")
        self.owner.save()
        self.owner_prof = BarberProfile.objects.create(
            barber=self.owner,
            latitude=41.0,
            longitude=69.0,
            location_text="Toshkent",
        )
        self.salon = Salon.objects.create(
            name="Sync Salon Unique",
            owner_barber=self.owner,
            latitude=41.0,
            longitude=69.0,
            is_published=True,
        )
        SalonMembership.objects.create(
            barber=self.owner,
            salon=self.salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )

        # Sync faqat ishchilarga tegishli — shu ishchi orqali tekshiramiz.
        self.barber = Barber.objects.create(
            email="sync-worker@test.uz",
            username="sync-worker@test.uz",
            full_name="Sync Worker",
            work_mode=Barber.WorkMode.SALON,
        )
        self.prof = BarberProfile.objects.create(
            barber=self.barber,
            latitude=41.0,
            longitude=69.0,
            location_text="Toshkent",
        )
        SalonMembership.objects.create(
            barber=self.barber,
            salon=self.salon,
            role=SalonMembership.Role.WORKER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )

    def test_barber_service_creates_salon_service(self):
        bs = BarberService.objects.create(
            profile=self.prof,
            name="Soch olish",
            price=50_000,
            duration_minutes=30,
            is_active=True,
        )
        sync_barber_service_to_salons(bs)
        self.assertEqual(
            Service.objects.filter(salon=self.salon, barber=self.barber, is_active=True).count(),
            1,
        )

    def test_owner_service_not_synced_to_salon(self):
        bs = BarberService.objects.create(
            profile=self.owner_prof,
            name="Owner xizmati",
            price=60_000,
            duration_minutes=30,
            is_active=True,
        )
        sync_barber_service_to_salons(bs)
        self.assertFalse(
            Service.objects.filter(salon=self.salon, barber=self.owner).exists()
        )

    def test_get_salon_services_resolves_barber_service_ids(self):
        from bookings.availability import get_salon_services_for_barber

        bs = BarberService.objects.create(
            profile=self.prof,
            name="Soch",
            price=40_000,
            duration_minutes=25,
            is_active=True,
        )
        rows = get_salon_services_for_barber(self.salon, self.barber, [bs.id])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].price, bs.price)

    def test_sync_all_for_barber(self):
        for i in range(3):
            BarberService.objects.create(
                profile=self.prof,
                name=f"Svc{i}",
                price=10_000 + i,
                duration_minutes=20,
                is_active=True,
            )
        n = sync_all_barber_services_for_barber(self.barber)
        self.assertEqual(n, 3)
        self.assertEqual(
            Service.objects.filter(salon=self.salon, barber=self.barber, is_active=True).count(),
            3,
        )
