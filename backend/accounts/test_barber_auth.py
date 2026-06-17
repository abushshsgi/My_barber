from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from barbers.models import Barber
from salons.models import Salon


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "barber-auth-tests",
        }
    }
)
class BarberAuthIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _register_payload(self, flow: str, email: str = "owner@test.com"):
        return {
            "email": email,
            "password": "Secret123",
            "full_name": "Test Owner",
            "phone": "",
            "onboarding_flow": flow,
        }

    def test_register_owner_without_coords_returns_tokens(self):
        res = self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner"),
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertTrue(body.get("access"))
        self.assertTrue(body.get("refresh"))
        self.assertEqual(body["barber"]["email"], "owner@test.com")

    def test_register_duplicate_email_returns_400(self):
        self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner", "dup@test.com"),
            format="json",
        )
        res = self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("mybarber", "dup@test.com"),
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("email", res.json())

    def test_login_success_and_wrong_password(self):
        self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("independent", "login@test.com"),
            format="json",
        )
        ok = self.client.post(
            "/api/v1/barber/auth/token/",
            {"email": "login@test.com", "password": "Secret123"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ok.json().get("access"))

        bad = self.client.post(
            "/api/v1/barber/auth/token/",
            {"email": "login@test.com", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(bad.status_code, 401)

    def test_check_availability(self):
        self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner", "avail@test.com"),
            format="json",
        )
        res = self.client.post(
            "/api/v1/auth/barber-check-availability/",
            {"email": "avail@test.com"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertFalse(body["email_available"])
        self.assertTrue(len(body["hints"]) >= 1)

    def test_join_unpublished_salon_returns_404(self):
        barber = Barber.objects.create(
            email="worker@test.com",
            username="worker@test.com",
            full_name="Worker",
        )
        barber.set_password("Secret123")
        barber.save()
        salon = Salon.objects.create(
            name="Hidden",
            address="Addr",
            is_published=False,
            latitude=41.31,
            longitude=69.24,
        )

        from barbers.barber_auth import encode_barber_tokens

        access, _ = encode_barber_tokens(barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = self.client.post(
            "/api/v1/salons/join/",
            {"salon_id": salon.id, "latitude": 41.31, "longitude": 69.24},
            format="json",
        )
        self.assertEqual(res.status_code, 404)

    def test_weak_password_rejected(self):
        payload = self._register_payload("owner", "weak@test.com")
        payload["password"] = "short"
        res = self.client.post("/api/v1/auth/barber-register/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_refresh_rotation_invalidates_old_token(self):
        reg = self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner", "refresh@test.com"),
            format="json",
        )
        old_refresh = reg.json()["refresh"]
        rotated = self.client.post(
            "/api/v1/barber/auth/token/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(rotated.status_code, 200)
        self.assertTrue(rotated.json().get("access"))

        again = self.client.post(
            "/api/v1/barber/auth/token/refresh/",
            {"refresh": old_refresh},
            format="json",
        )
        self.assertEqual(again.status_code, 401)
