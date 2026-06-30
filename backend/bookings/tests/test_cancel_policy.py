"""Bekor qilish qoidasi testlari."""

from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

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

    def test_customer_cannot_cancel_after_barber_accepts_even_within_5_minutes(self):
        booking = self._make_booking(status_value=Booking.Status.ACCEPTED)
        booking.created_at = timezone.now() - timedelta(minutes=1)
        booking.save(update_fields=["created_at"])
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f"/api/v1/bookings/{booking.id}/cancel/", {}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tasdiqlandi", res.json()["detail"].lower())
