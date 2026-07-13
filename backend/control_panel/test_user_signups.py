from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from control_panel.salon_growth import build_salon_platform_analytics
from control_panel.user_signups import build_user_signup_analytics, detect_signup_method
from salons.models import Salon


class UserSignupAnalyticsTests(TestCase):
    def test_detect_signup_method(self):
        google_user = User(
            email="g@gmail.com",
            google_sub="sub-1",
            phone="+998901112233",
        )
        self.assertEqual(detect_signup_method(google_user), "google")

        phone_user = User(
            email="901112233@phone.mysaloon.local",
            phone="+998901112233",
        )
        self.assertEqual(detect_signup_method(phone_user), "phone")

    def test_build_user_signup_analytics_counts(self):
        User.objects.create(
            username="g1@gmail.com",
            email="g1@gmail.com",
            google_sub="google-1",
            role=User.Role.USER,
            password=make_password(None),
            date_joined=timezone.now(),
        )
        User.objects.create(
            username="901223344@phone.mysaloon.local",
            email="901223344@phone.mysaloon.local",
            phone="+998901223344",
            role=User.Role.USER,
            password=make_password(None),
            date_joined=timezone.now() - timedelta(days=1),
        )

        payload = build_user_signup_analytics(recent_limit=10)
        summary = payload["summary"]
        self.assertEqual(summary["total"], 2)
        self.assertEqual(summary["google"], 1)
        self.assertEqual(summary["phone"], 1)
        self.assertEqual(len(payload["recent"]), 2)
        self.assertEqual(payload["recent"][0]["signup_method"], "google")

    def test_build_salon_platform_analytics_counts(self):
        Salon.objects.create(
            name="Salon Alpha",
            latitude=41.31,
            longitude=69.24,
            is_published=True,
        )
        Salon.objects.create(
            name="Salon Beta",
            latitude=41.32,
            longitude=69.25,
            is_published=False,
        )

        payload = build_salon_platform_analytics(recent_limit=10)
        summary = payload["summary"]
        self.assertEqual(summary["total"], 2)
        self.assertEqual(summary["published"], 1)
        self.assertEqual(summary["pending"], 1)
        self.assertEqual(len(payload["recent"]), 2)
