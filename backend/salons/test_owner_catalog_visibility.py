"""Barber salon yaratgandan keyin mijoz katalogida ko'rinish."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.uz_regions import UzRegion
from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber
from salons.models import Salon, SalonMembership
from salons.owner_setup import ensure_owner_membership_active, sync_owner_region_from_salon

User = get_user_model()


def _customer_token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class OwnerCatalogVisibilityTests(TestCase):
    def setUp(self):
        self.barber = Barber.objects.create(
            email="owner-catalog@test.uz",
            username="owner-catalog@test.uz",
            full_name="Catalog Owner",
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
            region="",
        )
        self.barber.set_password("StrongPass123")
        self.barber.save()
        access, _ = encode_barber_tokens(self.barber.id)
        self.barber_client = APIClient()
        self.barber_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        self.customer = User.objects.create_user(
            username="901112233@phone.mysaloon.local",
            email="901112233@phone.mysaloon.local",
            phone="+998901112233",
            password="unused",
            region=UzRegion.TOSHKENT_SH,
        )
        self.customer_client = APIClient()
        self.customer_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {_customer_token(self.customer)}"
        )

    def _create_salon_payload(self, name: str):
        return {
            "name": name,
            "description": "Test salon",
            "latitude": 41.2995,
            "longitude": 69.2401,
            "address": "Toshkent, test ko'cha",
            "phone": "+998901112233",
            "languages": ["uz"],
            "closed_weekdays": [],
            "hours": [
                {"weekday": 0, "open_time": "09:00", "close_time": "18:00"},
            ],
            "services": [
                {
                    "name": "Soch olish",
                    "price": 50000,
                    "duration_minutes": 30,
                },
            ],
        }

    def test_owner_salon_visible_for_customer_in_same_region(self):
        payload = self._create_salon_payload("Katalog Test Salon")
        create_res = self.barber_client.post(
            "/api/v1/salons/",
            payload,
            format="json",
        )
        self.assertEqual(create_res.status_code, 201, create_res.content)
        salon_id = create_res.json()["id"]

        self.barber.refresh_from_db()
        self.assertEqual(self.barber.region, UzRegion.TOSHKENT_SH)

        mem = SalonMembership.objects.get(salon_id=salon_id, barber=self.barber)
        self.assertEqual(mem.invite_state, SalonMembership.InviteState.ACTIVE)
        self.assertIsNotNone(mem.activated_at)

        list_res = self.customer_client.get("/api/v1/salons/")
        self.assertEqual(list_res.status_code, 200)
        body = list_res.json()
        results = body.get("results", body)
        ids = {row["id"] for row in results}
        self.assertIn(salon_id, ids)

        detail_res = self.customer_client.get(f"/api/v1/salons/{salon_id}/")
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["name"], "Katalog Test Salon")

    def test_sync_owner_region_from_coords(self):
        salon = Salon.objects.create(
            name="Region Sync Salon",
            owner_barber=self.barber,
            latitude=41.2995,
            longitude=69.2401,
            is_published=True,
        )
        sync_owner_region_from_salon(self.barber, salon)
        self.barber.refresh_from_db()
        self.assertEqual(self.barber.region, UzRegion.TOSHKENT_SH)

    def test_ensure_owner_membership_active_upgrades_na(self):
        salon = Salon.objects.create(
            name="Membership Salon",
            owner_barber=self.barber,
            latitude=41.31,
            longitude=69.27,
            is_published=True,
        )
        SalonMembership.objects.create(
            barber=self.barber,
            salon=salon,
            role=SalonMembership.Role.OWNER,
            invite_state=SalonMembership.InviteState.NA,
        )
        mem = ensure_owner_membership_active(self.barber, salon)
        self.assertEqual(mem.invite_state, SalonMembership.InviteState.ACTIVE)

    def test_anon_catalog_lists_published_salon(self):
        payload = self._create_salon_payload("Anon Visible Salon")
        create_res = self.barber_client.post("/api/v1/salons/", payload, format="json")
        self.assertEqual(create_res.status_code, 201)
        salon_id = create_res.json()["id"]

        anon = APIClient()
        list_res = anon.get("/api/v1/salons/")
        self.assertEqual(list_res.status_code, 200)
        results = list_res.json().get("results", list_res.json())
        self.assertTrue(any(row["id"] == salon_id for row in results))
