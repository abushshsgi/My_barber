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

    def test_register_intent_blocks_existing_phone(self):
        User.objects.create_user(
            username="901888999@phone.mysaloon.local",
            email="901888999@phone.mysaloon.local",
            phone="+998901888999",
            password="unused",
        )
        send = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "901888999", "intent": "register"},
            format="json",
        )
        self.assertEqual(send.status_code, 400)
        self.assertIn("allaqachon", send.json()["detail"].lower())

        store_otp("+998901888999", "2468")
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "901888999", "code": "2468", "intent": "register"},
            format="json",
        )
        self.assertEqual(verify.status_code, 400)

    def test_only_one_user_per_phone_after_repeated_login(self):
        send = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "901777888", "intent": "register"},
            format="json",
        )
        self.assertEqual(send.status_code, 200)
        code = send.json()["debug_code"]

        first = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "901777888", "code": code, "intent": "register"},
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["is_new_user"])

        store_otp("+998901777888", "1357")
        second = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "901777888", "code": "1357", "intent": "login"},
            format="json",
        )
        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.json()["is_new_user"])
        self.assertEqual(
            User.objects.filter(phone="+998901777888").count(),
            1,
        )

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

    def test_barber_only_phone_rejected_on_verify(self):
        Barber.objects.create(
            email="barber2@test.com",
            username="barber2@test.com",
            phone="+998909887766",
            password="unused-hash",
        )
        store_otp("+998909887766", "9876")
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "909887766", "code": "9876", "intent": "login"},
            format="json",
        )
        self.assertEqual(verify.status_code, 400)
        self.assertIn("sartarosh", verify.json()["detail"].lower())
        self.assertFalse(User.objects.filter(phone="+998909887766").exists())

    def test_barber_phone_format_normalized_on_lookup(self):
        Barber.objects.create(
            email="barber3@test.com",
            username="barber3@test.com",
            phone="+998909776655",
            password="unused-hash",
        )
        res = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "+998909776655"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_register_intent_race_returns_error_not_login(self):
        User.objects.create_user(
            username="901999000@phone.mysaloon.local",
            email="901999000@phone.mysaloon.local",
            phone="+998901999000",
            password="unused",
        )
        store_otp("+998901999000", "8642")
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "901999000", "code": "8642", "intent": "register"},
            format="json",
        )
        self.assertEqual(verify.status_code, 400)
        self.assertIn("allaqachon", verify.json()["detail"].lower())

    def test_phone_check_and_password_login(self):
        User.objects.create_user(
            username="901334455@phone.mysaloon.local",
            email="901334455@phone.mysaloon.local",
            phone="+998901334455",
            password="securepass1",
        )
        check = self.client.post(
            "/api/v1/auth/phone/check/",
            {"phone": "901334455"},
            format="json",
        )
        self.assertEqual(check.status_code, 200)
        self.assertTrue(check.json()["has_password"])

        bad = self.client.post(
            "/api/v1/auth/phone/password-login/",
            {"phone": "901334455", "password": "wrong"},
            format="json",
        )
        self.assertEqual(bad.status_code, 400)

        ok = self.client.post(
            "/api/v1/auth/phone/password-login/",
            {"phone": "901334455", "password": "securepass1"},
            format="json",
        )
        self.assertEqual(ok.status_code, 200)
        self.assertFalse(ok.json()["is_new_user"])
        self.assertTrue(ok.json()["user"]["has_password"])

    def test_set_password_after_otp(self):
        store_otp("+998901445566", "5678")
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {"phone": "901445566", "code": "5678"},
            format="json",
        )
        token = verify.json()["access"]
        self.assertFalse(verify.json()["user"]["has_password"])

        set_pw = self.client.post(
            "/api/v1/auth/phone/set-password/",
            {"password": "mynewpass1"},
            format="json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(set_pw.status_code, 200)
        self.assertTrue(set_pw.json()["user"]["has_password"])

        login = self.client.post(
            "/api/v1/auth/phone/password-login/",
            {"phone": "901445566", "password": "mynewpass1"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

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

    def test_resend_blocked_returns_retry_after(self):
        first = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "901556677"},
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json().get("resend_after"), 60)

        second = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "901556677"},
            format="json",
        )
        self.assertEqual(second.status_code, 429)
        self.assertIn("retry_after", second.json())
        self.assertGreater(second.json()["retry_after"], 0)

    def test_password_login_lockout_after_failures(self):
        User.objects.create_user(
            username="901667788@phone.mysaloon.local",
            email="901667788@phone.mysaloon.local",
            phone="+998901667788",
            password="securepass1",
        )
        for _ in range(5):
            res = self.client.post(
                "/api/v1/auth/phone/password-login/",
                {"phone": "901667788", "password": "wrong"},
                format="json",
            )
            self.assertEqual(res.status_code, 400)

        locked = self.client.post(
            "/api/v1/auth/phone/password-login/",
            {"phone": "901667788", "password": "wrong"},
            format="json",
        )
        self.assertEqual(locked.status_code, 429)
        self.assertIn("retry_after", locked.json())
