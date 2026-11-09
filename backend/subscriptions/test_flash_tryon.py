"""30 daqiqa, 1 rasm, 1 000 so'm. Payme tasdiqsiz try-on yo'q."""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.conf import settings as django_settings
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from ai.models import MorphAiSettings
from ai.morph_ops import check_user_can_generate
from subscriptions.flash_tryon import FLASH_PRICE_UZS
from subscriptions.models import FlashTryonPass, SubscriptionPayment, UserSubscription
from subscriptions.services import check_morph_entitlement, record_morph_usage
from subscriptions.views import FlashTryonCheckoutView


def _user() -> User:
    import uuid

    suffix = uuid.uuid4().hex[:10]
    return User.objects.create_user(
        username=f"f{suffix}",
        email=f"{suffix}@test.local",
        phone=f"+9989{suffix[:8]}",
        password="TestPass123!",
        role=User.Role.USER,
        full_name="Flash User",
    )


def _receipt(*, rid="flashreceipt1", state=0, order_id="", amount_tiyin=100_000):
    return {
        "_id": rid,
        "state": state,
        "amount": amount_tiyin,
        "account": [{"name": "order_id", "value": order_id}],
        "card": {"number": "8600123456789012"},
    }


_RATES = {
    **django_settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
    "subscription_checkout": "10000/minute",
    "subscription_ip": "10000/minute",
    "subscription_payment_status": "10000/minute",
    "user": "10000/minute",
    "anon": "10000/minute",
}


@override_settings(
    MORPH_ENTITLEMENT_BYPASS=False,
    PAYME_MERCHANT_ID="test-kassa-id",
    PAYME_SECRET_KEY="test-kassa-secret",
    PAYME_SANDBOX=True,
    PAYME_ALLOW_LIVE=False,
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "flash-tryon"}},
    REST_FRAMEWORK={**django_settings.REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": _RATES},
)
class FlashTryonTests(TestCase):
    def setUp(self):
        self._throttles = FlashTryonCheckoutView.throttle_classes
        FlashTryonCheckoutView.throttle_classes = []
        self._check_state = 0
        self._check = patch(
            "subscriptions.payme_service.receipts_check",
            side_effect=lambda receipt_id: int(self._check_state),
        )
        self._check.start()
        self._launch = patch(
            "subscriptions.flash_tryon.FLASH_TRYON_LAUNCH_AT",
            timezone.now() - timedelta(days=30),
        )
        self._launch.start()
        MorphAiSettings.load()
        self.user = _user()
        self.user.date_joined = timezone.now() - timedelta(minutes=2)
        self.user.save(update_fields=["date_joined"])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def tearDown(self):
        self._launch.stop()
        self._check.stop()
        FlashTryonCheckoutView.throttle_classes = self._throttles

    def test_unpaid_new_user_cannot_try_on(self):
        msg = check_morph_entitlement(user=self.user, kind="tryon") or ""
        self.assertIn("obuna", msg.lower())
        self.assertIsNotNone(check_user_can_generate(user_id=self.user.pk, kind="tryon"))
        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertFalse(me.data["access"]["morph_ai_allowed"])
        self.assertTrue(me.data["flash_tryon"]["can_buy"])
        self.assertFalse(me.data["flash_tryon"]["can_generate"])
        self.assertEqual(me.data["flash_tryon"]["price_uzs"], 1000)
        self.assertEqual(me.data["flash_tryon"]["images"], 1)

    def test_old_user_cannot_buy_flash(self):
        self.user.date_joined = timezone.now() - timedelta(days=60)
        self.user.save(update_fields=["date_joined"])
        res = self.client.post(
            "/api/v1/subscriptions/flash-tryon/checkout/",
            {"return_url": "https://mysaloon.uz/subscriptions/payme", "amount_uzs": 1},
            format="json",
        )
        self.assertEqual(res.status_code, 400, res.data)
        self.assertFalse(FlashTryonPass.objects.filter(user=self.user).exists())

    @patch("subscriptions.payme_client.receipts_create")
    def test_checkout_is_server_price_and_ignores_client_amount(self, create):
        create.return_value = _receipt(state=0)
        res = self.client.post(
            "/api/v1/subscriptions/flash-tryon/checkout/",
            {
                "return_url": "https://mysaloon.uz/subscriptions/payme",
                "amount_uzs": 1,
                "plan_code": "pro",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["amount_uzs"], FLASH_PRICE_UZS)
        self.assertEqual(res.data["amount_tiyin"], 100_000)
        self.assertEqual(res.data["plan_code"], "flash")
        self.assertTrue(res.data["checkout_url"].startswith("https://checkout.test.paycom.uz/"))
        self.assertEqual(create.call_args.kwargs["amount_tiyin"], 100_000)
        self.assertNotIn("card", create.call_args.kwargs)
        self.assertFalse(UserSubscription.objects.filter(user=self.user).exists())
        again = self.client.post(
            "/api/v1/subscriptions/flash-tryon/checkout/",
            {"return_url": "https://mysaloon.uz/subscriptions/payme"},
            format="json",
        )
        self.assertEqual(again.status_code, 200, again.data)
        self.assertEqual(again.data["order_id"], res.data["order_id"])
        self.assertEqual(FlashTryonPass.objects.filter(user=self.user).count(), 1)
        self.assertEqual(create.call_count, 1)

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_client.receipts_create")
    def test_tryon_opens_only_after_payme_confirms(self, create, get):
        create.return_value = _receipt(rid="flashreceipt1", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/flash-tryon/checkout/",
            {"return_url": "https://www.mysaloon.uz/subscriptions/payme"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        get.return_value = _receipt(rid="flashreceipt1", state=0, order_id=order_id, amount_tiyin=100_000)
        self._check_state = 0
        pending = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(pending.data["status"], "pending")
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))

        get.return_value = _receipt(rid="flashreceipt1", state=4, order_id=order_id, amount_tiyin=100_000)
        self._check_state = 4
        paid = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(paid.data["status"], "paid")
        self.assertTrue(paid.data["me"]["flash_tryon"]["can_generate"])
        self.assertTrue(paid.data["me"]["access"]["morph_ai_allowed"])
        self.assertFalse(UserSubscription.objects.filter(user=self.user).exists())
        pay = SubscriptionPayment.objects.get(order_id=order_id)
        self.assertNotIn("8600123456789012", str(pay.metadata))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_user_can_generate(user_id=self.user.pk, kind="tryon"))
        self.assertIn("yaratilmoqda", check_user_can_generate(user_id=self.user.pk, kind="tryon") or "")
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        row = FlashTryonPass.objects.get(user=self.user)
        self.assertEqual(row.status, FlashTryonPass.Status.USED)
        self.assertIsNotNone(row.used_at)
        self.assertIn("1 marta", check_morph_entitlement(user=self.user, kind="tryon") or "")
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="studio"))

        third = self.client.post(
            "/api/v1/subscriptions/flash-tryon/checkout/",
            {"return_url": "https://mysaloon.uz/subscriptions/payme"},
            format="json",
        )
        self.assertEqual(third.status_code, 400)

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_client.receipts_create")
    def test_wrong_payme_amount_does_not_open_tryon(self, create, get):
        create.return_value = _receipt(rid="flashreceipt9", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/flash-tryon/checkout/",
            {"return_url": "https://mysaloon.uz/subscriptions/payme"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        get.return_value = _receipt(rid="flashreceipt9", state=4, order_id=order_id, amount_tiyin=100)
        self._check_state = 4
        res = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertNotEqual(res.data.get("status"), "paid")
        self.assertTrue(res.data.get("sync_error"))
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertFalse(UserSubscription.objects.filter(user=self.user).exists())

    def test_paid_image_burns_after_30_minutes(self):
        FlashTryonPass.objects.create(
            user=self.user,
            status=FlashTryonPass.Status.PAID,
            amount_uzs=Decimal("1000"),
            amount_tiyin=100_000,
            expires_at=timezone.now() - timedelta(seconds=5),
            paid_at=timezone.now() - timedelta(minutes=31),
            order_id=f"sub-{self.user.pk}-flash-1000-dead",
        )
        msg = check_morph_entitlement(user=self.user, kind="tryon") or ""
        self.assertIn("kuyadi", msg)
        self.assertIsNotNone(check_user_can_generate(user_id=self.user.pk, kind="tryon"))
        me = self.client.get("/api/v1/subscriptions/me/").data
        self.assertEqual(me["flash_tryon"]["status"], "burned")
        self.assertFalse(me["flash_tryon"]["can_generate"])
        self.assertFalse(me["access"]["morph_ai_allowed"])
