"""Sartarosh SaaS obuna testlari."""

from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber, BarberProfile, BarberService, BarberShopSubscription, BarberWorkingHours
from barbers.shop_plans import PLAN_START, plan_price
from barbers.shop_subscription_services import activate_subscription, has_active_subscription
from datetime import time


def _ready_barber(**kwargs) -> Barber:
    defaults = {
        "email": "shop-sub@test.local",
        "username": "shop_sub",
        "full_name": "Shop Barber",
        "phone": "+998901000001",
        "work_mode": Barber.WorkMode.INDEPENDENT,
        "onboarding_flow": Barber.OnboardingFlow.INDEPENDENT,
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


@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class BarberShopSubscriptionTests(TestCase):
    def setUp(self):
        self.barber = _ready_barber()
        with patch("barbers.barber_auth.store_barber_refresh_jti"):
            access, _ = encode_barber_tokens(self.barber.pk)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_plans_list(self):
        res = self.client.get("/api/v1/barber/subscription/plans/")
        self.assertEqual(res.status_code, 200)
        codes = [p["code"] for p in res.data["plans"]]
        self.assertEqual(codes, ["start", "business", "pro"])
        start = res.data["plans"][0]
        self.assertEqual(start["price_uzs"], 99990)
        self.assertTrue(start["highlight"])

    def test_me_without_sub(self):
        res = self.client.get("/api/v1/barber/subscription/me/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["has_subscription"])

    def test_panel_blocked_without_sub(self):
        res = self.client.get("/api/v1/barber/reviews/")
        self.assertEqual(res.status_code, 403)

    def test_activate_unlocks(self):
        activate_subscription(
            barber=self.barber,
            plan_code=PLAN_START,
            source="admin",
            price_uzs=plan_price(PLAN_START) or Decimal("99990"),
        )
        self.assertTrue(has_active_subscription(self.barber))
        res = self.client.get("/api/v1/barber/subscription/me/")
        self.assertTrue(res.data["has_subscription"])
        self.assertEqual(res.data["subscription"]["plan_code"], "start")

    def test_expenses_blocked_on_start(self):
        activate_subscription(
            barber=self.barber,
            plan_code=PLAN_START,
            source="admin",
            price_uzs=Decimal("99990"),
        )
        res = self.client.get("/api/v1/barber/expenses/")
        self.assertEqual(res.status_code, 403)
