from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours
from bookings.models import Booking
from notifications.models import Notification
from salons.models import BarberWorkingHours as SalonWorkingHours
from salons.models import Salon, SalonMembership, Service


User = get_user_model()


class BarberBusinessApiTests(APITestCase):
    def setUp(self):
        self.barber = Barber.objects.create(
            email="barber@test.uz",
            username="barber@test.uz",
            full_name="Barber Test",
            is_active=True,
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
            email_verified_at=timezone.now(),
        )
        self.barber.set_password("StrongPass123")
        self.barber.save()
        prof = BarberProfile.objects.create(
            barber=self.barber,
            location_text="Toshkent",
            latitude=41.31,
            longitude=69.28,
        )
        for n in range(5):
            BarberService.objects.create(
                profile=prof,
                name=f"Svc{n}",
                price=40_000,
                duration_minutes=30,
                is_active=True,
            )
        BarberWorkingHours.objects.create(
            profile=prof,
            weekday=0,
            open_time=time(9, 0),
            close_time=time(18, 0),
            is_day_off=False,
        )
        access, _refresh = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_inventory_create_and_adjust(self):
        res = self.client.post(
            "/api/v1/barber/inventory/",
            {
                "name": "Pomade",
                "category": "product",
                "stock": 5,
                "min_stock": 2,
                "unit": "dona",
                "price": "120000",
                "supplier": "Supplier",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        item_id = res.data["id"]

        adj = self.client.post(
            f"/api/v1/barber/inventory/{item_id}/adjust/",
            {"delta": -2, "note": "used"},
            format="json",
        )
        self.assertEqual(adj.status_code, 200)
        self.assertEqual(adj.data["stock"], 3)

    def test_settings_patch(self):
        patch = self.client.patch(
            "/api/v1/barber/settings/",
            {"notifications_sms": True, "language": "en"},
            format="json",
        )
        self.assertEqual(patch.status_code, 200)
        self.assertTrue(patch.data["notifications_sms"])
        self.assertEqual(patch.data["language"], "en")

    def test_promo_broadcast_creates_notifications(self):
        customer = User.objects.create_user(
            email="u@test.uz",
            username="u@test.uz",
            password="SomePass123",
            full_name="User U",
        )
        Booking.objects.create(
            customer=customer,
            barber=self.barber,
            start_at=timezone.now() + timedelta(hours=2),
            end_at=timezone.now() + timedelta(hours=3),
            status=Booking.Status.ACCEPTED,
            total_price=100000,
        )

        res = self.client.post(
            "/api/v1/barber/promos/broadcast/",
            {"title": "Aksiya", "message": "20% chegirma"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["sent_count"], 1)
        self.assertTrue(Notification.objects.filter(user=customer, type="barber_announcement").exists())

    def test_nearby_includes_public_salon_barbers_at_salon_location(self):
        owner = Barber.objects.create(
            email="owner@test.uz",
            username="owner@test.uz",
            full_name="Owner Barber",
            is_active=True,
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
            email_verified_at=timezone.now(),
        )
        owner.set_password("StrongPass123")
        owner.save()
        BarberProfile.objects.create(
            barber=owner,
            location_text="Toshkent",
            latitude=41.300000,
            longitude=69.250000,
        )
        salon = Salon.objects.create(
            owner_barber=owner,
            name="Salon Nearby",
            latitude=41.311500,
            longitude=69.280100,
            address="Toshkent",
            is_published=True,
        )
        owner_membership = SalonMembership.objects.create(
            barber=owner,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.NA,
        )
        SalonWorkingHours.objects.create(
            membership=owner_membership,
            weekday=0,
            open_time=time(9, 0),
            close_time=time(18, 0),
            is_day_off=False,
        )
        for n in range(5):
            Service.objects.create(
                salon=salon,
                barber=owner,
                name=f"SalonSvc{n}",
                price=50_000,
                duration_minutes=30,
                is_active=True,
            )

        res = self.client.get(
            "/api/v1/barbers/nearby/",
            {"lat": 41.3111, "lng": 69.2797, "radius_km": 2},
        )

        self.assertEqual(res.status_code, 200)
        row = next((item for item in res.data if item["barber_id"] == owner.id), None)
        self.assertIsNotNone(row)
        self.assertEqual(row["booking_kind"], "salon")
        self.assertEqual(row["salon_id"], salon.id)
        self.assertEqual(row["salon_name"], salon.name)
        self.assertAlmostEqual(float(row["latitude"]), float(salon.latitude), places=4)
        self.assertAlmostEqual(float(row["longitude"]), float(salon.longitude), places=4)
