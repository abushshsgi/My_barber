from datetime import time

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber
from bookings.models import Booking, Review
from salons.models import Amenity, Salon, SalonAmenity, SalonMembership
from salons.amenity_catalog import AMENITY_CATALOG
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
        for code, icon, labels, _scope in DEFAULT_AMENITIES[:3]:
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

    def test_amenity_catalog_has_fifty_items(self):
        self.assertEqual(len(AMENITY_CATALOG), 50)
        self.assertEqual(len(DEFAULT_AMENITIES), 50)


class BarberSalonAmenitiesPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = Barber.objects.create(
            email="owner-put@test.uz",
            username="owner-put@test.uz",
            full_name="Owner Put",
            is_active=True,
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
            email_verified_at=timezone.now(),
        )
        self.worker = Barber.objects.create(
            email="worker-put@test.uz",
            username="worker-put@test.uz",
            full_name="Worker Put",
            is_active=True,
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.EMPLOYEE,
            email_verified_at=timezone.now(),
        )
        self.salon = Salon.objects.create(
            owner_barber=self.owner,
            name="Perm Salon",
            latitude="41.2995",
            longitude="69.2401",
            is_published=True,
        )
        SalonMembership.objects.create(
            barber=self.owner,
            salon=self.salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.NA,
        )
        SalonMembership.objects.create(
            barber=self.worker,
            salon=self.salon,
            role=SalonMembership.Role.WORKER,
            invite_state=SalonMembership.InviteState.ACTIVE,
            activated_at=timezone.now(),
        )
        for code, icon, labels, _scope in DEFAULT_AMENITIES[:2]:
            amenity, _ = Amenity.objects.get_or_create(
                code=code,
                defaults={"icon": icon, "labels": labels},
            )
            SalonAmenity.objects.get_or_create(salon=self.salon, amenity=amenity)

    def test_owner_can_put_amenities(self):
        access, _ = encode_barber_tokens(self.owner.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.put(
            "/api/v1/barber/amenities/",
            {"salon": self.salon.id, "amenity_codes": ["wifi"]},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["selected_codes"], ["wifi"])

    def test_worker_put_amenities_forbidden(self):
        access, _ = encode_barber_tokens(self.worker.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.put(
            "/api/v1/barber/amenities/",
            {"salon": self.salon.id, "amenity_codes": ["wifi"]},
            format="json",
        )
        self.assertEqual(res.status_code, 403)


class AmenityScopeFilterTests(TestCase):
    def setUp(self):
        from barbers.models import Barber

        self.owner = Barber.objects.create(
            email="scope-owner@test.uz",
            username="scope-owner@test.uz",
            full_name="Scope Owner",
            is_active=True,
        )
        self.salon = Salon.objects.create(
            owner_barber=self.owner,
            name="Scope Salon",
            latitude="41.2995",
            longitude="69.2401",
            is_published=True,
        )
        for code, icon, labels, scope in DEFAULT_AMENITIES:
            Amenity.objects.update_or_create(
                code=code,
                defaults={"icon": icon, "labels": labels, "scope": scope},
            )

    def test_solo_studio_gets_subset_catalog(self):
        from barbers.barber_auth import encode_barber_tokens
        from rest_framework.test import APIClient

        access, _ = encode_barber_tokens(self.owner.id)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = client.get(f"/api/v1/barber/amenities/?salon={self.salon.id}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["venue_kind"], "solo_studio")
        codes = {a["code"] for a in res.data["catalog"]}
        self.assertIn("wifi", codes)
        self.assertNotIn("bridal_room", codes)
        self.assertIn("tv", codes)


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
