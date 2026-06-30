"""Bekor qilish qoidasi testlari."""

from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from barbers.barber_auth import BarberPrincipal
from bookings.models import Booking
from bookings.tests.test_checkin_token import CheckInTokenTests


class CustomerCancelPolicyTests(CheckInTokenTests):
    def test_customer_can_cancel_pending_within_5_minutes(self):
        booking = self._make_booking(status_value=Booking.Status.PENDING)
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f"/api/v1/bookings/{booking.id}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)

    def test_customer_cannot_cancel_pending_after_5_minutes(self):
        booking = self._make_booking(status_value=Booking.Status.PENDING)
        booking.created_at = timezone.now() - timedelta(minutes=6)
        booking.save(update_fields=["created_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f"/api/v1/bookings/{booking.id}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("5 daqiqa", res.json()["detail"])

    def test_stale_pending_auto_cancelled(self):
        booking = self._make_booking(status_value=Booking.Status.PENDING)
        booking.created_at = timezone.now() - timedelta(minutes=6)
        booking.save(update_fields=["created_at"])

        from bookings.expiry import expire_stale_pending_bookings

        count = expire_stale_pending_bookings()
        self.assertGreaterEqual(count, 1)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)

    def test_accept_blocked_after_pending_window(self):
        booking = self._make_booking(status_value=Booking.Status.PENDING)
        booking.created_at = timezone.now() - timedelta(minutes=6)
        booking.save(update_fields=["created_at"])

        barber_client = APIClient()
        barber_client.force_authenticate(user=BarberPrincipal(self.barber))
        res = barber_client.post(f"/api/v1/bookings/{booking.id}/accept/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_410_GONE)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)

    def test_customer_can_cancel_accepted_within_5_minutes(self):
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        booking.created_at = timezone.now() - timedelta(minutes=2)
        booking.save(update_fields=["created_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f"/api/v1/bookings/{booking.id}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)

    def test_customer_cannot_cancel_accepted_after_5_minutes(self):
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        booking.created_at = timezone.now() - timedelta(minutes=6)
        booking.save(update_fields=["created_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f"/api/v1/bookings/{booking.id}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("5 daqiqa", res.json()["detail"])
