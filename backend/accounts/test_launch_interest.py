from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase

from accounts.models import LaunchInterest
from accounts.uz_regions import UzRegion

User = get_user_model()


class LaunchInterestTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="u1",
            email="u1@test.com",
            password="pass12345",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_launch_interest(self):
        res = self.client.post(
            "/api/v1/launch-interest/",
            {
                "region": UzRegion.BUXORO,
                "message": "Tezroch oching",
                "source": LaunchInterest.Source.ONBOARDING,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(LaunchInterest.objects.filter(user=self.user).count(), 1)

    def test_update_or_create_same_region(self):
        for msg in ("first", "second"):
            res = self.client.post(
                "/api/v1/launch-interest/",
                {
                    "region": UzRegion.BUXORO,
                    "message": msg,
                    "source": LaunchInterest.Source.HOME,
                },
                format="json",
            )
            self.assertEqual(res.status_code, 201)
        self.assertEqual(LaunchInterest.objects.filter(user=self.user, region=UzRegion.BUXORO).count(), 1)
        latest = LaunchInterest.objects.get(user=self.user, region=UzRegion.BUXORO)
        self.assertEqual(latest.message, "second")
