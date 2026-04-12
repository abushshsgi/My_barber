"""Kritik bron va sharh oqimlari."""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from barbers.models import Barber, BarberProfile, BarberService
from bookings.models import Booking, Review

User = get_user_model()


class BookingCriticalTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="u1@test.uz",
            email="u1@test.uz",
            password="testpass12",
            phone="+998901112233",
        )
        self.user_no_phone = User.objects.create_user(
            username="u2@test.uz",
            email="u2@test.uz",
            password="testpass12",
            phone=None,
        )
        self.barber = Barber.objects.create(
            email="b1@test.uz",
            username="b1@test.uz",
            full_name="Barber One",
            phone="+998904445566",
        )
        self.barber.set_password("testpass12")
        self.barber.save()
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

    def test_booking_requires_customer_phone(self):
        self.client.force_authenticate(user=self.user_no_phone)
        start = timezone.now() + timedelta(days=1)
        start = start.replace(hour=10, minute=0, second=0, microsecond=0)
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": start.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_booking_overlap_rejected(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=2)
        t0 = t0.replace(hour=14, minute=0, second=0, microsecond=0)
        Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=t0,
            end_at=t0 + timedelta(minutes=30),
            status=Booking.Status.ACCEPTED,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )
        res = self.client.post(
            "/api/v1/bookings/",
            {
                "barber": self.barber.id,
                "start_at": t0.isoformat(),
                "barber_service_ids": [self.svc.id],
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_booking_saves_customer_phone_snapshot(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=3)
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
        self.assertEqual(data["status"], "accepted")
        bid = data["id"]
        b = Booking.objects.get(pk=bid)
        self.assertEqual(b.customer_phone, self.user.phone)
        self.assertEqual(b.status, Booking.Status.ACCEPTED)

    def test_one_review_per_booking(self):
        self.client.force_authenticate(user=self.user)
        t0 = timezone.now() + timedelta(days=4)
        t0 = t0.replace(hour=9, minute=0, second=0, microsecond=0)
        booking = Booking.objects.create(
            customer=self.user,
            barber=self.barber,
            start_at=t0,
            end_at=t0 + timedelta(minutes=30),
            status=Booking.Status.COMPLETED,
            total_price=50_000,
            customer_phone=self.user.phone or "",
        )
        Review.objects.create(
            booking=booking,
            author=self.user,
            salon=None,
            barber=self.barber,
            rating=5,
            text="ok",
        )
        res = self.client.post(
            "/api/v1/reviews/",
            {"booking": booking.id, "rating": 5, "text": "yana"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
