from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from salons.models import Salon

User = get_user_model()


def _token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class SalonApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="901111222@phone.mysaloon.local",
            email="901111222@phone.mysaloon.local",
            phone="+998901111222",
            password="unused",
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(self.user)}")
        Salon.objects.create(
            name="Test Salon",
            latitude="41.2995",
            longitude="69.2401",
            is_published=True,
        )

    def test_salon_list_returns_published(self):
        res = self.client.get("/api/v1/salons/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        results = body.get("results", body)
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Test Salon")
