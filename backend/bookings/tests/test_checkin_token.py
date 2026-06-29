"""Bir martalik QR/check-in token va buyurtma raqami oqimi."""

from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import BarberPrincipal
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours
from bookings.models import Booking

User = get_user_model()


class CheckInTokenTests(TestCase):
    def setUp(self):
        self.client = APIClient()
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
        self.other_barber = Barber.objects.create(
            email="other@test.uz",
            username="other@test.uz",
            full_name="Barber Two",
            phone="+998907778899",
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
            email_verified_at=timezone.now(),
        )
        self.profile = BarberProfile.objects.create(
            barber=self.barber,
            location_text="Toshkent",
            latitude=41.31,
            longitude=69.28,
        )
        self.svc = BarberService.objects.create(
            profile=self.profile,
            name="Soch",
            price=50_000,
            duration_minutes=30,
            is_active=True,
        )
        for n in range(2, 6):
            BarberService.objects.create(
                profile=self.profile,
                name=f"Svc{n}",
                price=40_000,
                duration_minutes=20,
                is_active=True,
            )
        for weekday in range(7):
            BarberWorkingHours.objects.create(
                profile=self.profile,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
                is_day_off=False,
                breaks=[],
            )
        self.other_profile = BarberProfile.objects.create(
            barber=self.other_barber,
            location_text="Toshkent",
            latitude=41.31,
            longitude=69.28,
        )
        for n in range(1, 6):
            BarberService.objects.create(
                profile=self.other_profile,
                name=f"OtherSvc{n}",
                price=40_000,
                duration_minutes=20,
                is_active=True,
            )
        for weekday in range(7):
            BarberWorkingHours.objects.create(
                profile=self.other_profile,
                weekday=weekday,
                open_time=time(9, 0),
                close_time=time(18, 0),
                is_day_off=False,
                breaks=[],
            )

    def _make_booking(self, status_value=Booking.Status.PENDING):
        t0 = timezone.now() + timedelta(days=1)
        t0 = t0.replace(hour=10, minute=0, second=0, microsecond=0)
        return Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=t0,
            end_at=t0 + timedelta(minutes=30),
            status=status_value,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )

    def test_create_assigns_order_number(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=2)
        t0 = t0.replace(hour=11, minute=0, second=0, microsecond=0)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": t0.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.json()
        self.assertTrue(data["order_number"].startswith("MS-"))
        booking = Booking.objects.get(pk=data["id"])
        self.assertTrue(booking.order_number)

    def test_accept_issues_token_visible_to_customer_only(self):
        booking = self._make_booking()
        barber_client = APIClient()
        barber_client.force_authenticate(user=BarberPrincipal(self.barber))
        res = barber_client.post(f"/api/v1/bookings/{booking.id}/accept/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertTrue(booking.check_in_token)
        self.assertTrue(booking.check_in_short_code)
        # Barber javobida token ko'rinmaydi.
        self.assertIsNone(res.json().get("check_in_code"))

        # Mijoz detail so'rovida token ko'rinadi.
        self.client.force_authenticate(user=self.user)
        detail = self.client.get(f"/api/v1/bookings/{booking.id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.json()["check_in_code"], booking.check_in_token)
        self.assertEqual(
            detail.json()["check_in_short_code"], booking.check_in_short_code
        )

    def test_retrieve_issues_missing_token_for_accepted_booking(self):
        """Eski tasdiqlangan bronlar uchun detail ochilganda token beriladi."""
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        self.assertFalse(booking.check_in_token)

        self.client.force_authenticate(user=self.user)
        res = self.client.get(f"/api/v1/bookings/{booking.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertTrue(booking.check_in_token)
        self.assertEqual(res.json()["check_in_code"], booking.check_in_token)

    def test_check_in_by_token_first_ok_then_gone(self):
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        from bookings.checkin_tokens import issue_check_in_token

        issue_check_in_token(booking)
        booking.save()

        barber_client = APIClient()
        barber_client.force_authenticate(user=BarberPrincipal(self.barber))
        res = barber_client.post(
            "/api/v1/bookings/check-in-by-token/",
            {"token": booking.check_in_token},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertIsNotNone(booking.checked_in_at)
        self.assertIsNotNone(booking.check_in_token_used_at)
        self.assertIsNone(booking.check_in_token)

        # Ikkinchi marta — token o'chgani uchun topilmaydi.
        res2 = barber_client.post(
            "/api/v1/bookings/check-in-by-token/",
            {"token": "stale-token-value"},
            format="json",
        )
        self.assertEqual(res2.status_code, status.HTTP_404_NOT_FOUND)

    def test_check_in_by_short_code(self):
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        from bookings.checkin_tokens import issue_check_in_token

        issue_check_in_token(booking)
        booking.save()

        barber_client = APIClient()
        barber_client.force_authenticate(user=BarberPrincipal(self.barber))
        res = barber_client.post(
            "/api/v1/bookings/check-in-by-token/",
            {"short_code": booking.check_in_short_code.lower()},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertIsNotNone(booking.checked_in_at)

    def test_check_in_by_token_wrong_barber_forbidden(self):
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        from bookings.checkin_tokens import issue_check_in_token

        issue_check_in_token(booking)
        booking.save()

        barber_client = APIClient()
        barber_client.force_authenticate(user=BarberPrincipal(self.other_barber))
        res = barber_client.post(
            "/api/v1/bookings/check-in-by-token/",
            {"token": booking.check_in_token},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        booking.refresh_from_db()
        self.assertIsNone(booking.checked_in_at)

    def test_check_in_by_token_invalid_token(self):
        barber_client = APIClient()
        barber_client.force_authenticate(user=BarberPrincipal(self.barber))
        res = barber_client.post(
            "/api/v1/bookings/check-in-by-token/",
            {"token": "nope"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_check_in_by_token(self):
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        from bookings.checkin_tokens import issue_check_in_token

        issue_check_in_token(booking)
        booking.save()

        self.client.force_authenticate(user=self.user)
        res = self.client.post(
            "/api/v1/bookings/check-in-by-token/",
            {"token": booking.check_in_token},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
