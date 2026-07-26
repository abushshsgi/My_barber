"""Partner agent trial — bir marta / telefon-email himoya."""

from datetime import time
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from agents.models import FieldAgent
from agents.referral import ensure_agent_code
from barbers.barber_auth import encode_barber_tokens
from barbers.models import (
    Barber,
    BarberProfile,
    BarberService,
    BarberShopSubscription,
    BarberWorkingHours,
    PartnerTrialGrant,
)
from barbers.partner_trial import (
    PartnerTrialError,
    claim_agent_trial_with_code,
    find_existing_trial_grant,
    grant_partner_agent_trial,
)
from barbers.shop_subscription_services import has_active_subscription
from salons.models import Salon


def _barber(**kwargs) -> Barber:
    defaults = {
        "email": "trial-owner@test.local",
        "username": "trial_owner",
        "full_name": "Trial Owner",
        "phone": "+998901111111",
        "work_mode": Barber.WorkMode.SALON,
        "onboarding_flow": Barber.OnboardingFlow.OWNER,
        "email_verified_at": timezone.now(),
    }
    defaults.update(kwargs)
    b = Barber(**defaults)
    b.set_password("Pass1234!")
    b.save()
    prof = BarberProfile.objects.create(
        barber=b, location_text="Toshkent", latitude=41.31, longitude=69.28
    )
    for n in range(5):
        BarberService.objects.create(
            profile=prof, name=f"S{n}", price=40000, duration_minutes=30, is_active=True
        )
    BarberWorkingHours.objects.create(
        profile=prof,
        weekday=0,
        open_time=time(9, 0),
        close_time=time(18, 0),
        is_day_off=False,
    )
    return b


def _salon(owner: Barber, name="Trial Salon") -> Salon:
    return Salon.objects.create(
        name=name,
        owner_barber=owner,
        address="Toshkent",
        latitude=41.31,
        longitude=69.28,
        is_published=True,
    )


def _agent(code="ABCD2345") -> FieldAgent:
    a = FieldAgent(
        email=f"{code.lower()}@agent.test",
        full_name="Test Agent",
        phone="+998901000000",
    )
    a.set_password("AgentPass1!")
    a.code = code
    a.is_active = True
    a.save()
    ensure_agent_code(a)
    return a


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class PartnerAgentTrialTests(TestCase):
    def setUp(self):
        self.agent = _agent("TN8GA4VQ")
        self.barber = _barber()
        self.salon = _salon(self.barber)
        with patch("barbers.barber_auth.store_barber_refresh_jti"):
            access, _ = encode_barber_tokens(self.barber.pk)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_claim_grants_shop_and_salon_trial(self):
        res = self.client.post(
            "/api/v1/barber/subscription/claim-agent-trial/",
            {"agent_code": "TN8GA4VQ"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data["ok"])
        self.assertTrue(has_active_subscription(self.barber))
        sub = BarberShopSubscription.objects.get(barber=self.barber)
        self.assertEqual(sub.source, BarberShopSubscription.Source.AGENT_TRIAL)
        self.salon.refresh_from_db()
        self.assertEqual(self.salon.subscription_status, "trial")
        self.assertTrue(PartnerTrialGrant.objects.filter(barber=self.barber).exists())

    def test_second_claim_blocked(self):
        claim_agent_trial_with_code(barber=self.barber, code="TN8GA4VQ")
        res = self.client.post(
            "/api/v1/barber/subscription/claim-agent-trial/",
            {"agent_code": "TN8GA4VQ"},
            format="json",
        )
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data["code"], "already_used")

    def test_second_grant_same_barber_blocked(self):
        grant_partner_agent_trial(
            barber=self.barber,
            agent=self.agent,
            salon=self.salon,
            source=PartnerTrialGrant.Source.ADMIN,
            code_used=self.agent.code,
            credit_advance=False,
        )
        with self.assertRaises(PartnerTrialError) as ctx:
            grant_partner_agent_trial(
                barber=self.barber,
                agent=self.agent,
                salon=self.salon,
                source=PartnerTrialGrant.Source.ADMIN,
                code_used=self.agent.code,
                credit_advance=False,
            )
        self.assertEqual(ctx.exception.code, "already_used")

    def test_email_fingerprint_recorded(self):
        grant_partner_agent_trial(
            barber=self.barber,
            agent=self.agent,
            salon=self.salon,
            source=PartnerTrialGrant.Source.ADMIN,
            code_used=self.agent.code,
            credit_advance=False,
        )
        hit = find_existing_trial_grant(email_key="trial-owner@test.local")
        self.assertIsNotNone(hit)
        self.assertEqual(hit.barber_id, self.barber.pk)

    def test_invalid_code(self):
        res = self.client.post(
            "/api/v1/barber/subscription/claim-agent-trial/",
            {"agent_code": "NOPE0000"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["code"], "invalid_code")

    def test_employee_blocked(self):
        emp = _barber(
            email="emp@test.local",
            username="emp_trial",
            phone="+998904444444",
            onboarding_flow=Barber.OnboardingFlow.EMPLOYEE,
            work_mode=Barber.WorkMode.SALON,
        )
        with patch("barbers.barber_auth.store_barber_refresh_jti"):
            access, _ = encode_barber_tokens(emp.pk)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res = client.post(
            "/api/v1/barber/subscription/claim-agent-trial/",
            {"agent_code": "TN8GA4VQ"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["code"], "employee_not_eligible")

    def test_me_includes_agent_trial(self):
        res = self.client.get("/api/v1/barber/subscription/me/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("agent_trial", res.data)
        self.assertTrue(res.data["agent_trial"]["eligible"])
        self.assertFalse(res.data["agent_trial"]["already_used"])
