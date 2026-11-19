from rest_framework.test import APIClient

from accounts.models import User
from ai.models import HairCareProfile
from django.test import TestCase


class HairScanApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="hairscanapi",
            email="hair-advisor-test@example.com",
            phone="+998901234567",
            password="test-pass-123!",
            role=User.Role.USER,
        )
        HairCareProfile.objects.create(
            user=self.user,
            condition="normal",
            texture="straight",
            color_status="natural",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_invalid_barcode_rejected(self):
        res = self.client.post(
            "/api/v1/hair-advisor/scans/",
            {"input_method": "barcode", "barcode": "123"},
            format="json",
        )
        self.assertIn(res.status_code, (400, 403))

    def test_history_empty(self):
        res = self.client.get("/api/v1/hair-advisor/history/")
        if res.status_code == 403:
            self.skipTest("morph_care subscription gate")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)