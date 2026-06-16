from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from notifications.models import Notification

User = get_user_model()


def _token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class NotificationApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="901555666@phone.mysaloon.local",
            email="901555666@phone.mysaloon.local",
            phone="+998901555666",
            password="unused",
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(self.user)}")

    def test_notifications_list_scoped_to_user(self):
        Notification.objects.create(
            user=self.user,
            title="Test",
            body="Hello",
            type="promo",
        )
        other = User.objects.create_user(
            username="901555667@phone.mysaloon.local",
            email="901555667@phone.mysaloon.local",
            phone="+998901555667",
            password="unused",
        )
        Notification.objects.create(
            user=other,
            title="Other",
            body="Secret",
            type="promo",
        )

        res = self.client.get("/api/v1/notifications/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        rows = body.get("results", body)
        titles = [row["title"] for row in rows]
        self.assertIn("Test", titles)
        self.assertNotIn("Other", titles)
