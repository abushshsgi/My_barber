from django.conf import settings as django_settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from barbers.models import Barber
from salons.models import Salon

_TEST_THROTTLE_RATES = {
    **django_settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
    "auth": "10000/minute",
    "barber_check": "10000/minute",
    "anon": "10000/minute",
    "user": "10000/minute",
}


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "barber-auth-tests",
        }
    },
    REST_FRAMEWORK={
        **django_settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": _TEST_THROTTLE_RATES,
    },
)
class BarberAuthIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _register_payload(self, flow: str, email: str = "owner@test.com", phone: str = "+998901234567"):
        return {
            "email": email,
            "password": "Secret123",
            "full_name": "Test Owner",
            "phone": phone,
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
            self._register_payload("independent", "login@test.com", "+998902345678"),
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
            self._register_payload("owner", "avail@test.com", "+998901112233"),
            format="json",
        )
        res = self.client.post(
            "/api/v1/auth/barber-check-availability/",
            {"email": "avail@test.com", "phone": "+998901112233"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertFalse(body["email_available"])
        self.assertFalse(body["phone_available"])
        self.assertTrue(len(body["hints"]) >= 1)

    def test_register_email_only_without_phone(self):
        payload = self._register_payload("owner", "emailonly@test.com")
        payload["phone"] = ""
        res = self.client.post("/api/v1/auth/barber-register/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["barber"]["email"], "emailonly@test.com")

    def test_register_phone_only_without_email(self):
        res = self.client.post(
            "/api/v1/auth/barber-register/",
            {
                "password": "Secret123",
                "full_name": "Phone Only",
                "phone": "+998651234567",
                "onboarding_flow": "mybarber",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        barber = Barber.objects.get(phone="+998651234567")
        self.assertTrue(barber.email.endswith("@phone.mysaloon.local"))

    def test_register_without_email_or_phone_returns_400(self):
        payload = self._register_payload("owner", "nophone@test.com")
        payload["email"] = ""
        payload["phone"] = ""
        res = self.client.post("/api/v1/auth/barber-register/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_register_duplicate_phone_returns_400(self):
        self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner", "phone1@test.com", "+998901223344"),
            format="json",
        )
        res = self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("mybarber", "phone2@test.com", "+998901223344"),
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("phone", res.json())

    def test_login_with_phone(self):
        self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("independent", "phone-login@test.com", "+998909887766"),
            format="json",
        )
        ok = self.client.post(
            "/api/v1/barber/auth/token/",
            {"phone": "+998909887766", "password": "Secret123"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(ok.json().get("access"))

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
        payload = self._register_payload("owner", "weak@test.com", "+998903456789")
        payload["password"] = "short"
        res = self.client.post("/api/v1/auth/barber-register/", payload, format="json")
        self.assertEqual(res.status_code, 400)

    def test_check_availability_authenticated_excludes_own_phone(self):
        reg = self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner", "self@test.com", "+998901112233"),
            format="json",
        )
        access = reg.json()["access"]
        self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("employee", "other@test.com", "+998902223344"),
            format="json",
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        own = self.client.post(
            "/api/v1/auth/barber-check-availability/",
            {"phone": "+998901112233"},
            format="json",
        )
        self.assertEqual(own.status_code, 200)
        self.assertTrue(own.json()["phone_available"])

        taken = self.client.post(
            "/api/v1/auth/barber-check-availability/",
            {"phone": "+998902223344"},
            format="json",
        )
        self.assertEqual(taken.status_code, 200)
        self.assertFalse(taken.json()["phone_available"])

    def test_check_availability_also_allow_phones(self):
        self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner", "allow@test.com", "+998901112233"),
            format="json",
        )
        res = self.client.post(
            "/api/v1/auth/barber-check-availability/",
            {
                "phone": "+998901112233",
                "also_allow_phones": ["+998901112233"],
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["phone_available"])

    def test_refresh_rotation_invalidates_old_token(self):
        reg = self.client.post(
            "/api/v1/auth/barber-register/",
            self._register_payload("owner", "refresh@test.com", "+998904567890"),
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
