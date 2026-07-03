"""Mijoz ifodalari va tugatish oqimi."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import BarberPrincipal
from barbers.models import Barber, BarberProfile, BarberService
from bookings.models import Booking, ClientImpression

User = get_user_model()


class ClientImpressionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cust@test.uz",
            email="cust@test.uz",
            password="testpass12",
            phone="+998901112233",
        )
        self.barber = Barber.objects.create(
            email="barber@test.uz",
            username="barber@test.uz",
            full_name="Barber One",
            phone="+998904445566",
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
            email_verified_at=timezone.now(),
        )
        self.barber.set_password("testpass12")
        self.barber.save()
        BarberProfile.objects.create(
            barber=self.barber,
            location_text="Toshkent",
            latitude=41.31,
            longitude=69.28,
        )
        BarberService.objects.create(
            profile=self.barber.profile,
            name="Soch",
            price=50_000,
            duration_minutes=30,
            is_active=True,
        )
        start = timezone.now().replace(minute=0, second=0, microsecond=0)
        self.booking = Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=start,
            end_at=start + timedelta(minutes=30),
            status=Booking.Status.IN_PROGRESS,
            started_at=start,
            checked_in_at=start,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )
        self.barber_client = APIClient()
        self.barber_client.force_authenticate(user=BarberPrincipal(self.barber))

    def test_complete_without_early_finish_flag(self):
        res = self.barber_client.post(
            f"/api/v1/bookings/{self.booking.id}/complete/",
            {},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.Status.COMPLETED)
        self.assertIsNotNone(self.booking.completion)
        self.assertTrue(self.booking.completion.finished_early)

    def test_save_client_impressions(self):
        self.booking.status = Booking.Status.COMPLETED
        self.booking.save(update_fields=["status", "updated_at"])
        res = self.barber_client.post(
            f"/api/v1/bookings/{self.booking.id}/client-impressions/",
            {"kinds": ["polite", "great"]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(sorted(body["kinds"]), ["great", "polite"])
        self.assertEqual(body["customer_impression_stats"]["polite"], 1)
        self.assertEqual(body["customer_impression_stats"]["great"], 1)
        self.assertEqual(
            ClientImpression.objects.filter(customer=self.user).count(),
            2,
        )

    def test_impression_stats_scoped_per_barber(self):
        other = Barber.objects.create(
            email="barber2@test.uz",
            username="barber2@test.uz",
            full_name="Barber Two",
            phone="+998907778899",
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
            email_verified_at=timezone.now(),
        )
        other.set_password("testpass12")
        other.save()
        self.booking.status = Booking.Status.COMPLETED
        self.booking.save(update_fields=["status", "updated_at"])
        self.barber_client.post(
            f"/api/v1/bookings/{self.booking.id}/client-impressions/",
            {"kinds": ["vip"]},
            format="json",
        )
        other_client = APIClient()
        other_client.force_authenticate(user=BarberPrincipal(other))
        res = other_client.get("/api/v1/analytics/clients/independent/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        row = next((r for r in res.json() if r["id"] == self.user.id), None)
        self.assertIsNotNone(row)
        self.assertEqual(row.get("impression_stats") or {}, {})
