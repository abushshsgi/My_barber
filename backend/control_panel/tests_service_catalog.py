from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.admin_auth import AdminPrincipal
from accounts.models import AdminAccount
from barbers.barber_auth import BarberPrincipal
from barbers.models import Barber, BarberProfile, BarberService
from bookings.models import Booking, BookingLine
from salons.models import CatalogService

User = get_user_model()


class ServiceCatalogAdminTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = AdminAccount.objects.create(email="admin@test.uz", password="secret")
        self.client.force_authenticate(user=AdminPrincipal(self.admin))

    def test_seeded_catalog_is_available_for_admin(self):
        res = self.client.get("/api/v1/admin/services/")
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertGreaterEqual(len(payload), 20)
        self.assertTrue(any(item["image_url"] for item in payload))

    def test_usage_endpoint_aggregates_booking_states(self):
        catalog = CatalogService.objects.order_by("sort_order", "id").first()
        self.assertIsNotNone(catalog)

        user = User.objects.create_user(
            username="user@test.uz",
            email="user@test.uz",
            password="secret123",
            phone="+998901112233",
        )
        barber = Barber.objects.create(
            email="barber@test.uz",
            username="barber@test.uz",
            full_name="Barber Catalog",
            phone="+998901234567",
            email_verified_at=timezone.now(),
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
        )
        profile = BarberProfile.objects.create(barber=barber, location_text="Toshkent")
        service = BarberService.objects.create(
            profile=profile,
            catalog_service=catalog,
            name=catalog.name,
            price=70_000,
            duration_minutes=catalog.duration_minutes,
            is_active=True,
        )
        service.categories.set(catalog.categories.all())

        start = timezone.now() + timedelta(days=1)
        completed = Booking.objects.create(
            customer=user,
            barber=barber,
            start_at=start,
            end_at=start + timedelta(minutes=catalog.duration_minutes),
            status=Booking.Status.COMPLETED,
            total_price=70_000,
            customer_phone=user.phone or "",
        )
        cancelled = Booking.objects.create(
            customer=user,
            barber=barber,
            start_at=start + timedelta(hours=2),
            end_at=start + timedelta(hours=2, minutes=catalog.duration_minutes),
            status=Booking.Status.CANCELLED,
            total_price=70_000,
            customer_phone=user.phone or "",
        )
        BookingLine.objects.create(
            booking=completed,
            barber_service=service,
            service_name=service.name,
            price=service.price,
            duration_minutes=service.duration_minutes,
        )
        BookingLine.objects.create(
            booking=cancelled,
            barber_service=service,
            service_name=service.name,
            price=service.price,
            duration_minutes=service.duration_minutes,
        )

        res = self.client.get("/api/v1/admin/services/usage/")
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        match = next((item for item in payload if item["id"] == str(catalog.id)), None)
        self.assertIsNotNone(match)
        self.assertEqual(match["bookings_total"], 2)
        self.assertEqual(match["bookings_completed"], 1)
        self.assertEqual(match["bookings_cancelled"], 1)
        self.assertEqual(match["barbers_count"], 1)
        self.assertEqual(len(match["rows"]), 1)


class BarberCatalogEndpointTests(TestCase):
    def test_barber_can_fetch_active_catalog_services(self):
        client = APIClient()
        barber = Barber.objects.create(
            email="catalog-barber@test.uz",
            username="catalog-barber@test.uz",
            full_name="Catalog Barber",
            phone="+998909998877",
            email_verified_at=timezone.now(),
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
        )
        client.force_authenticate(user=BarberPrincipal(barber))

        res = client.get("/api/v1/barber/catalog-services/")
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertGreaterEqual(len(payload), 20)
        self.assertIn("image_url", payload[0])
