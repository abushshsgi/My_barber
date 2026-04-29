from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber
from bookings.models import Booking
from notifications.models import Notification


User = get_user_model()


class BarberBusinessApiTests(APITestCase):
    def setUp(self):
        self.barber = Barber.objects.create(
            email="barber@test.uz",
            username="barber@test.uz",
            full_name="Barber Test",
            is_active=True,
        )
        self.barber.set_password("StrongPass123")
        self.barber.save()
        access, _refresh = encode_barber_tokens(self.barber.id)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_inventory_create_and_adjust(self):
        res = self.client.post(
            "/api/v1/barber/inventory/",
            {
                "name": "Pomade",
                "category": "product",
                "stock": 5,
                "min_stock": 2,
                "unit": "dona",
                "price": "120000",
                "supplier": "Supplier",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        item_id = res.data["id"]

        adj = self.client.post(
            f"/api/v1/barber/inventory/{item_id}/adjust/",
            {"delta": -2, "note": "used"},
            format="json",
        )
        self.assertEqual(adj.status_code, 200)
        self.assertEqual(adj.data["stock"], 3)

    def test_settings_patch(self):
        patch = self.client.patch(
            "/api/v1/barber/settings/",
            {"notifications_sms": True, "language": "en"},
            format="json",
        )
        self.assertEqual(patch.status_code, 200)
        self.assertTrue(patch.data["notifications_sms"])
        self.assertEqual(patch.data["language"], "en")

    def test_promo_broadcast_creates_notifications(self):
        customer = User.objects.create_user(
            email="u@test.uz",
            username="u@test.uz",
            password="SomePass123",
            full_name="User U",
        )
        Booking.objects.create(
            customer=customer,
            barber=self.barber,
            start_at=timezone.now() + timedelta(hours=2),
            end_at=timezone.now() + timedelta(hours=3),
            status=Booking.Status.ACCEPTED,
            total_price=100000,
        )

        res = self.client.post(
            "/api/v1/barber/promos/broadcast/",
            {"title": "Aksiya", "message": "20% chegirma"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["sent_count"], 1)
        self.assertTrue(Notification.objects.filter(user=customer, type="barber_announcement").exists())
