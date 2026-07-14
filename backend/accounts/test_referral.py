from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import ReferralAttribution, User
from accounts.phone_auth import store_otp
from accounts.referral import (
    apply_referral,
    build_invite_url,
    ensure_referral_code,
    normalize_referral_code,
    user_app_public_base,
)


def _make_user(phone_suffix: str) -> User:
    return User.objects.create_user(
        username=f"{phone_suffix}@phone.mysaloon.local",
        email=f"{phone_suffix}@phone.mysaloon.local",
        phone=f"+99890{phone_suffix}",
        password="unused",
    )


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "referral-tests",
        }
    }
)
class ReferralServiceTests(TestCase):
    def test_ensure_referral_code_is_stable(self):
        user = _make_user("1112200")
        code = ensure_referral_code(user)
        self.assertEqual(len(code), 8)
        self.assertEqual(ensure_referral_code(user), code)

    def test_normalize_referral_code(self):
        self.assertEqual(normalize_referral_code("  ab23cd34 "), "AB23CD34")
        self.assertEqual(normalize_referral_code("ab-23"), "AB23")
        self.assertEqual(normalize_referral_code("ab10oi"), "AB")  # 1,0,O,I tashlab yuboriladi
        self.assertEqual(normalize_referral_code(None), "")

    def test_invite_url_skips_localhost_origin(self):
        import os
        from unittest import mock

        with mock.patch.dict(
            os.environ,
            {"FRONTEND_USER_ORIGIN": "http://localhost:3000,https://www.mysaloon.uz"},
            clear=False,
        ):
            self.assertEqual(user_app_public_base(), "https://www.mysaloon.uz")
            self.assertEqual(
                build_invite_url("HE8AER5M"),
                "https://www.mysaloon.uz/auth?ref=HE8AER5M",
            )

        with mock.patch.dict(
            os.environ,
            {"FRONTEND_USER_ORIGIN": "http://localhost:3000"},
            clear=False,
        ):
            self.assertEqual(user_app_public_base(), "https://mysaloon.uz")
            self.assertEqual(
                build_invite_url("HE8AER5M"),
                "https://mysaloon.uz/auth?ref=HE8AER5M",
            )

    def test_apply_referral_attributes_new_user(self):
        referrer = _make_user("1112201")
        code = ensure_referral_code(referrer)
        referee = _make_user("1112202")

        attribution = apply_referral(new_user=referee, code=code)

        self.assertIsNotNone(attribution)
        referee.refresh_from_db()
        self.assertEqual(referee.referred_by_id, referrer.pk)
        self.assertEqual(
            ReferralAttribution.objects.filter(referrer=referrer, referee=referee).count(),
            1,
        )

    def test_self_referral_blocked(self):
        user = _make_user("1112203")
        code = ensure_referral_code(user)
        self.assertIsNone(apply_referral(new_user=user, code=code))
        user.refresh_from_db()
        self.assertIsNone(user.referred_by_id)

    def test_invalid_code_ignored(self):
        referee = _make_user("1112204")
        self.assertIsNone(apply_referral(new_user=referee, code="ZZZZ9999"))
        referee.refresh_from_db()
        self.assertIsNone(referee.referred_by_id)

    def test_already_attributed_referee_ignored(self):
        first = _make_user("1112205")
        second = _make_user("1112206")
        referee = _make_user("1112207")
        apply_referral(new_user=referee, code=ensure_referral_code(first))

        result = apply_referral(new_user=referee, code=ensure_referral_code(second))

        self.assertIsNone(result)
        referee.refresh_from_db()
        self.assertEqual(referee.referred_by_id, first.pk)


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "referral-api-tests",
        }
    }
)
class ReferralApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_me_referral_returns_code_and_link(self):
        user = _make_user("1112210")
        self.client.force_authenticate(user=user)
        res = self.client.get("/api/v1/users/me/referral/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body["code"]), 8)
        self.assertIn(f"ref={body['code']}", body["invite_url"])
        self.assertEqual(body["invite_count"], 0)

    def test_me_referral_requires_auth(self):
        res = self.client.get("/api/v1/users/me/referral/")
        self.assertIn(res.status_code, (401, 403))

    def test_signup_with_referral_code_attributes(self):
        referrer = _make_user("1112211")
        code = ensure_referral_code(referrer)

        send = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "912223344"},
            format="json",
        )
        self.assertEqual(send.status_code, 200)
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {
                "phone": "912223344",
                "code": send.json()["debug_code"],
                "referral_code": code.lower(),
            },
            format="json",
        )
        self.assertEqual(verify.status_code, 200)
        self.assertTrue(verify.json()["is_new_user"])
        new_user = User.objects.get(phone="+998912223344")
        self.assertEqual(new_user.referred_by_id, referrer.pk)

    def test_signup_invalid_referral_code_still_succeeds(self):
        send = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "913334455"},
            format="json",
        )
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {
                "phone": "913334455",
                "code": send.json()["debug_code"],
                "referral_code": "NOPE0000",
            },
            format="json",
        )
        self.assertEqual(verify.status_code, 200)
        new_user = User.objects.get(phone="+998913334455")
        self.assertIsNone(new_user.referred_by_id)

    def test_existing_user_login_ignores_referral_code(self):
        referrer = _make_user("1112212")
        code = ensure_referral_code(referrer)
        existing = _make_user("1112213")

        send = self.client.post(
            "/api/v1/auth/phone/send-code/",
            {"phone": "901112213"},
            format="json",
        )
        self.assertEqual(send.status_code, 200)
        verify = self.client.post(
            "/api/v1/auth/phone/verify/",
            {
                "phone": "901112213",
                "code": send.json()["debug_code"],
                "referral_code": code,
            },
            format="json",
        )
        self.assertEqual(verify.status_code, 200)
        self.assertFalse(verify.json()["is_new_user"])
        existing.refresh_from_db()
        self.assertIsNone(existing.referred_by_id)
        self.assertFalse(
            ReferralAttribution.objects.filter(referee=existing).exists()
        )
