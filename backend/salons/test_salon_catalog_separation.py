"""Salon katalogi (barber=null) va barber shaxsiy xizmatlarini ajratish testlari."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.uz_regions import UzRegion
from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber, BarberProfile, BarberService
from salons.models import CatalogService, Salon, SalonMembership, Service

User = get_user_model()


def _customer_token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class SalonCatalogSeparationTests(TestCase):
    def setUp(self):
        self.owner = Barber.objects.create(
            email="sep-owner@test.uz",
            username="sep-owner@test.uz",
            full_name="Sep Owner",
            work_mode=Barber.WorkMode.SALON,
            onboarding_flow=Barber.OnboardingFlow.OWNER,
            region="",
        )
        self.owner.set_password("StrongPass123")
        self.owner.save()
        access, _ = encode_barber_tokens(self.owner.id)
        self.owner_client = APIClient()
        self.owner_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        self.customer = User.objects.create_user(
            username="901112299@phone.mysaloon.local",
            email="901112299@phone.mysaloon.local",
            phone="+998901112299",
            password="unused",
            region=UzRegion.TOSHKENT_SH,
        )
        self.customer_client = APIClient()
        self.customer_client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {_customer_token(self.customer)}"
        )

        self.catalog, _ = CatalogService.objects.get_or_create(
            name="Sep Test Fade XYZ",
            defaults={"duration_minutes": 40, "is_active": True},
        )
        self.catalog2, _ = CatalogService.objects.get_or_create(
            name="Sep Test Soqol XYZ",
            defaults={"duration_minutes": 20, "is_active": True},
        )

        self.salon_id = self._create_salon("Separation Salon")

    def _create_salon(self, name: str) -> int:
        payload = {
            "name": name,
            "description": "Test",
            "latitude": 41.2995,
            "longitude": 69.2401,
            "address": "Toshkent, test ko'cha",
            "phone": "+998901112299",
            "languages": ["uz"],
            "closed_weekdays": [],
            "hours": [{"weekday": 0, "open_time": "09:00", "close_time": "18:00"}],
            "services": [{"name": "Soch olish", "price": 50000, "duration_minutes": 30}],
        }
        res = self.owner_client.post("/api/v1/salons/", payload, format="json")
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()["id"]

    def test_salon_create_services_are_catalog_rows(self):
        """Salon yaratishda kiritilgan xizmatlar barber=null bilan saqlanadi."""
        rows = Service.objects.filter(salon_id=self.salon_id)
        self.assertTrue(rows.exists())
        self.assertTrue(all(r.barber_id is None for r in rows))

    def test_owner_can_crud_salon_catalog(self):
        # CREATE
        create_res = self.owner_client.post(
            f"/api/v1/salons/{self.salon_id}/services/",
            {"catalog_service": self.catalog.id, "price": 70000},
            format="json",
        )
        self.assertEqual(create_res.status_code, 201, create_res.content)
        svc_id = create_res.json()["id"]
        created = Service.objects.get(pk=svc_id)
        self.assertIsNone(created.barber_id)
        self.assertEqual(created.catalog_service_id, self.catalog.id)

        # LIST
        list_res = self.owner_client.get(f"/api/v1/salons/{self.salon_id}/services/")
        self.assertEqual(list_res.status_code, 200)
        names = {row["name"] for row in list_res.json()}
        self.assertIn(self.catalog.name, names)

        # PATCH
        patch_res = self.owner_client.patch(
            f"/api/v1/salons/{self.salon_id}/services/{svc_id}/",
            {"price": 90000},
            format="json",
        )
        self.assertEqual(patch_res.status_code, 200, patch_res.content)
        created.refresh_from_db()
        self.assertEqual(int(created.price), 90000)

        # DELETE
        del_res = self.owner_client.delete(
            f"/api/v1/salons/{self.salon_id}/services/{svc_id}/"
        )
        self.assertEqual(del_res.status_code, 204)
        self.assertFalse(Service.objects.filter(pk=svc_id).exists())

    def test_non_owner_cannot_manage_salon_catalog(self):
        other = Barber.objects.create(
            email="sep-other@test.uz",
            username="sep-other@test.uz",
            full_name="Other",
            region=UzRegion.TOSHKENT_SH,
        )
        access, _ = encode_barber_tokens(other.id)
        other_client = APIClient()
        other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        res = other_client.post(
            f"/api/v1/salons/{self.salon_id}/services/",
            {"catalog_service": self.catalog.id, "price": 70000},
            format="json",
        )
        self.assertEqual(res.status_code, 403)

    def test_owner_barber_service_not_in_salon_detail(self):
        """Salon egasining shaxsiy BarberService xizmati salon sahifasiga tushmaydi."""
        res = self.owner_client.post(
            "/api/v1/barber/services/",
            {"catalog_service": self.catalog.id, "price": 65000},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)

        detail = self.customer_client.get(f"/api/v1/salons/{self.salon_id}/")
        self.assertEqual(detail.status_code, 200)
        services = detail.json()["services"]
        self.assertTrue(all(s.get("barber") is None for s in services))
        names = {s["name"] for s in services}
        self.assertNotIn(self.catalog.name, names)
        self.assertIn("Soch olish", names)

    def test_worker_service_visible_in_barber_services_not_detail(self):
        worker = Barber.objects.create(
            email="sep-worker@test.uz",
            username="sep-worker@test.uz",
            full_name="Worker",
            region=UzRegion.TOSHKENT_SH,
        )
        prof, _ = BarberProfile.objects.get_or_create(barber=worker)
        SalonMembership.objects.create(
            barber=worker,
            salon_id=self.salon_id,
            role=SalonMembership.Role.WORKER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        BarberService.objects.create(
            profile=prof,
            catalog_service=self.catalog2,
            name=self.catalog2.name,
            price=30000,
            duration_minutes=20,
            is_active=True,
        )

        # Worker tanlangan bron oqimida xizmati ko'rinadi.
        svc_res = self.customer_client.get(
            f"/api/v1/salons/{self.salon_id}/barber-services/?barber={worker.id}",
        )
        self.assertEqual(svc_res.status_code, 200, svc_res.content)
        names = {s["name"] for s in svc_res.json()}
        self.assertIn(self.catalog2.name, names)

        # Mijoz salon sahifasida worker xizmati ko'rinmaydi.
        detail = self.customer_client.get(f"/api/v1/salons/{self.salon_id}/")
        detail_names = {s["name"] for s in detail.json()["services"]}
        self.assertNotIn(self.catalog2.name, detail_names)

    def test_barber_services_for_owner_returns_catalog(self):
        self.owner_client.post(
            f"/api/v1/salons/{self.salon_id}/services/",
            {"catalog_service": self.catalog.id, "price": 70000},
            format="json",
        )
        res = self.customer_client.get(
            f"/api/v1/salons/{self.salon_id}/barber-services/?barber={self.owner.id}",
        )
        self.assertEqual(res.status_code, 200, res.content)
        names = {s["name"] for s in res.json()}
        self.assertIn(self.catalog.name, names)
        self.assertTrue(all(s.get("barber") is None for s in res.json()))
