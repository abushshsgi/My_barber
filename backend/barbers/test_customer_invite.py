"""Sartarosh → mijoz chaqirish testlari."""

from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from accounts.referral import ensure_referral_code
from barbers.barber_auth import encode_barber_tokens
from barbers.customer_invite import (
    apply_barber_invite,
    apply_signup_invites,
    create_outreach,
    ensure_barber_invite_code,
)
from barbers.models import Barber, BarberCustomerInvite, BarberCustomerOutreach


def _make_barber(**kwargs) -> Barber:
    defaults = {
        "email": "invite-barber@test.local",
        "username": "invite_barber",
        "full_name": "Test Barber",
        "phone": "+998901112233",
    }
    defaults.update(kwargs)
    b = Barber(**defaults)
    b.set_password("Pass1234!")
    b.save()
    return b


def _make_user(*, phone: str, full_name: str = "Mijoz") -> User:
    return User.objects.create_user(
        username=f"u_{phone[-4:]}",
        email=f"{phone}@phone.local",
        password="x",
        phone=phone,
        full_name=full_name,
        role=User.Role.USER,
    )


class BarberCustomerInviteServiceTests(TestCase):
    def test_ensure_code_stable_and_unique_vs_user(self):
        barber = _make_barber()
        code = ensure_barber_invite_code(barber)
        self.assertEqual(len(code), 8)
        self.assertEqual(ensure_barber_invite_code(barber), code)

    def test_apply_barber_invite_attributes(self):
        barber = _make_barber()
        code = ensure_barber_invite_code(barber)
        user = _make_user(phone="+998909998877")
        invite = apply_barber_invite(new_user=user, code=code)
        self.assertIsNotNone(invite)
        self.assertEqual(invite.barber_id, barber.pk)
        self.assertEqual(invite.customer_id, user.pk)
        self.assertEqual(BarberCustomerInvite.objects.count(), 1)

    def test_duplicate_invite_ignored(self):
        barber = _make_barber()
        code = ensure_barber_invite_code(barber)
        user = _make_user(phone="+998909998866")
        apply_barber_invite(new_user=user, code=code)
        self.assertIsNone(apply_barber_invite(new_user=user, code=code))

    def test_outreach_phone_match_on_signup(self):
        barber = _make_barber()
        code = ensure_barber_invite_code(barber)
        create_outreach(
            barber=barber,
            full_name="Ali",
            phone="+998901234567",
            channel="telegram",
        )
        user = _make_user(phone="+998901234567", full_name="Ali")
        invite = apply_barber_invite(new_user=user, code=code)
        self.assertEqual(invite.source, BarberCustomerInvite.Source.OUTREACH)
        outreach = BarberCustomerOutreach.objects.get(barber=barber)
        self.assertEqual(outreach.status, BarberCustomerOutreach.Status.JOINED)
        self.assertEqual(outreach.joined_customer_id, user.pk)

    def test_peer_and_barber_can_coexist(self):
        referrer = _make_user(phone="+998907771111", full_name="Referrer")
        peer_code = ensure_referral_code(referrer)
        barber = _make_barber(email="b2@test.local", username="b2", phone="+998902222333")
        bcode = ensure_barber_invite_code(barber)
        newbie = _make_user(phone="+998907772222", full_name="Newbie")
        result = apply_signup_invites(
            new_user=newbie,
            referral_code=peer_code,
            barber_invite_code=bcode,
        )
        self.assertIsNotNone(result["peer"])
        self.assertIsNotNone(result["barber"])

    def test_referral_code_falls_back_to_barber(self):
        barber = _make_barber(email="b3@test.local", username="b3", phone="+998903333444")
        bcode = ensure_barber_invite_code(barber)
        newbie = _make_user(phone="+998907773333")
        result = apply_signup_invites(new_user=newbie, referral_code=bcode)
        self.assertIsNone(result["peer"])
        self.assertIsNotNone(result["barber"])


class BarberCustomerInviteAPITests(TestCase):
    def setUp(self):
        from datetime import time

        from barbers.models import BarberProfile, BarberService, BarberWorkingHours
        from django.test.utils import override_settings
        from django.utils import timezone

        # Redis o'rnatilmagan CI/local — throttle cache locmem.
        self._cache_override = override_settings(
            CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
        )
        self._cache_override.enable()

        self.barber = _make_barber(
            work_mode=Barber.WorkMode.INDEPENDENT,
            onboarding_flow=Barber.OnboardingFlow.INDEPENDENT,
            email_verified_at=timezone.now(),
        )
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
        with patch("barbers.barber_auth.store_barber_refresh_jti"):
            access, _refresh = encode_barber_tokens(self.barber.pk)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def tearDown(self):
        self._cache_override.disable()
        super().tearDown()

    def test_get_invite_dashboard(self):
        res = self.client.get("/api/v1/barber/customer-invites/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("code", res.data)
        self.assertIn("invite_url", res.data)
        self.assertIn("bref=", res.data["invite_url"])
        self.assertEqual(res.data["invite_count"], 0)

    def test_create_outreach(self):
        res = self.client.post(
            "/api/v1/barber/customer-invites/outreach/",
            {"full_name": "Dilshod", "phone": "+998901111222", "channel": "telegram"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["status"], "pending")
        self.assertEqual(BarberCustomerOutreach.objects.count(), 1)
