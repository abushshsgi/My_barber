from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from bookings.models import Booking, Review
from salons.models import Amenity, Salon, SalonAmenity
from salons.management.commands.seed_amenities import DEFAULT_AMENITIES

User = get_user_model()


def _token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class SalonAmenitiesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="901111333@phone.mysaloon.local",
            email="901111333@phone.mysaloon.local",
            phone="+998901111333",
            password="unused",
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(self.user)}")
        self.salon = Salon.objects.create(
            name="Amenity Salon",
            latitude="41.2995",
            longitude="69.2401",
            is_published=True,
        )
        for code, icon, labels in DEFAULT_AMENITIES[:3]:
            amenity = Amenity.objects.create(code=code, icon=icon, labels=labels)
            SalonAmenity.objects.create(salon=self.salon, amenity=amenity)

    def test_salon_detail_includes_amenities(self):
        res = self.client.get(f"/api/v1/salons/{self.salon.id}/?lang=uz")
        self.assertEqual(res.status_code, 200)
        amenities = res.json().get("amenities") or []
        self.assertEqual(len(amenities), 3)
        codes = {a["code"] for a in amenities}
        self.assertIn("wifi", codes)
        self.assertTrue(all("label" in a and "icon" in a for a in amenities))


class SalonRatingSummaryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="901111444@phone.mysaloon.local",
            email="901111444@phone.mysaloon.local",
            phone="+998901111444",
            password="unused",
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(self.user)}")
        self.salon = Salon.objects.create(
            name="Rated Salon",
            latitude="41.2995",
            longitude="69.2401",
            is_published=True,
        )

    def test_rating_summary_empty(self):
        res = self.client.get(f"/api/v1/salons/{self.salon.id}/rating-summary/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["review_count"], 0)
        self.assertFalse(body["is_guest_favorite"])
        self.assertEqual(body["distribution"]["5"], 0)

    def test_rating_summary_with_reviews(self):
        from barbers.models import Barber
        from django.utils import timezone

        barber = Barber.objects.create(
            email="rated-barber@test.uz",
            username="rated-barber@test.uz",
            full_name="Rated Barber",
        )
        for rating in [5, 5, 5, 4, 4]:
            booking = Booking.objects.create(
                customer=self.user,
                barber=barber,
                salon=self.salon,
                start_at=timezone.now(),
                end_at=timezone.now(),
                status=Booking.Status.COMPLETED,
                total_price=50_000,
            )
            Review.objects.create(
                booking=booking,
                author=self.user,
                salon=self.salon,
                barber=barber,
                rating=rating,
                text="Good",
            )
        res = self.client.get(f"/api/v1/salons/{self.salon.id}/rating-summary/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["review_count"], 5)
        self.assertEqual(body["distribution"]["5"], 3)
        self.assertEqual(body["distribution"]["4"], 2)
        self.assertFalse(body["is_guest_favorite"])
