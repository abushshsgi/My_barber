from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from accounts.phone_auth import normalize_uz_phone, store_otp
from barbers.models import Barber


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "phone-auth-tests",
        }
    }
)
class PhoneAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_normalize_uz_phone(self):
        self.assertEqual(normalize_uz_phone("901234567"), "+998901234567")
        self.assertEqual(normalize_uz_phone("+998901234567"), "+998901234567")
        self.assertIsNone(normalize_uz_phone("123"))

    def test_send_code_and_verify_creates_user(self):
        res = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "901112233"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("debug_code", res.json())

        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "901112233", "code": res.json()["debug_code"]},
            format="json",
        )
        self.assertEqual(verify.status_code, 200)
        body = verify.json()
        self.assertTrue(body["access"])
        self.assertTrue(body["refresh"])
        self.assertTrue(body["is_new_user"])
        self.assertEqual(body["user"]["phone"], "+998901112233")
        self.assertTrue(User.objects.filter(phone="+998901112233").exists())

    def test_verify_existing_user_not_new(self):
        User.objects.create_user(
            username="901223344@phone.mysaloon.local",
            email="901223344@phone.mysaloon.local",
            phone="+998901223344",
            password="unused",
        )
        store_otp("+998901223344", "4321")
        res = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "901223344", "code": "4321"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["is_new_user"])

    def test_barber_only_phone_rejected(self):
        Barber.objects.create(
            email="barber@test.com",
            username="barber@test.com",
            phone="+998909998877",
            password="unused-hash",
        )
        res = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "909998877"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_me_requires_token(self):
        store_otp("+998907776655", "1111")
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "907776655", "code": "1111"},
            format="json",
        )
        token = verify.json()["access"]
        me = self.client.get(
            "/api/v1/users/me/",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["phone"], "+998907776655")
