from datetime import time, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours
from bookings.models import Booking, Review
from notifications.models import Notification


User = get_user_model()


class BookingExtensionsApiTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email="customer@test.uz",
            username="customer@test.uz",
            password="StrongPass123",
            full_name="Customer T",
        )
        self.barber = Barber.objects.create(
            email="barber2@test.uz",
            username="barber2@test.uz",
            full_name="Barber Two",
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
        self.booking = Booking.objects.create(
            customer=self.customer,
            barber=self.barber,
            start_at=timezone.now() - timedelta(days=1),
            end_at=timezone.now() - timedelta(days=1, hours=-1),
            status=Booking.Status.COMPLETED,
            total_price=70000,
        )
        self.review = Review.objects.create(
            booking=self.booking,
            author=self.customer,
            barber=self.barber,
            rating=5,
            text="Zo'r xizmat",
        )
        access, _refresh = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_barber_can_reply_review(self):
        res = self.client.post(
            f"/api/v1/reviews/{self.review.id}/reply/",
            {"reply": "Rahmat!"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.review.refresh_from_db()
        self.assertEqual(self.review.barber_reply, "Rahmat!")
        self.assertIsNotNone(self.review.barber_replied_at)

    def test_mark_all_notifications_read(self):
        Notification.objects.create(barber=self.barber, type="system", title="A", body="a")
        Notification.objects.create(barber=self.barber, type="system", title="B", body="b")

        res = self.client.post("/api/v1/notifications/mark-all-read/", {}, format="json")
        self.assertEqual(res.status_code, 200)
        unread_count = Notification.objects.filter(barber=self.barber, read_at__isnull=True).count()
        self.assertEqual(unread_count, 0)
