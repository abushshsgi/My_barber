"""Payme sandbox Subscribe API — mocklangan testlar. Jonli so'rov yo'q."""

from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.conf import settings as django_settings
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from ai.models import MorphAiSettings
from notifications.models import Notification
from subscriptions.models import SubscriptionPayment, UserSubscription
from subscriptions.payme_client import uzs_to_tiyin
from subscriptions.plans import PLAN_STARTER
from wallet.services.wallet_service import WalletService


def _user() -> User:
    import uuid

    suffix = uuid.uuid4().hex[:10]
    return User.objects.create_user(
        username=f"p{suffix}",
        email=f"{suffix}@test.local",
        phone=f"+9989{suffix[:8]}",
        password="TestPass123!",
        role=User.Role.USER,
        full_name="Payme User",
    )


def _receipt(*, rid="abc123payme", state=0, order_id="", amount_tiyin=999000):
    return {
        "_id": rid,
        "state": state,
        "amount": amount_tiyin,
        "account": [{"name": "order_id", "value": order_id}],
        "card": None,
    }


_TEST_THROTTLE_RATES = {
    **django_settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
    "subscription_checkout": "10000/minute",
    "subscription_confirm": "10000/minute",
    "subscription_ip": "10000/minute",
    "user": "10000/minute",
    "anon": "10000/minute",
}


@override_settings(
    MORPH_ENTITLEMENT_BYPASS=False,
    PAYME_MERCHANT_ID="test-kassa-id",
    PAYME_SECRET_KEY="test-kassa-secret",
    PAYME_SANDBOX=True,
    PAYME_ALLOW_LIVE=False,
    GOOGLE_PLAY_AI_IAP_ELIGIBLE=False,
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "payme-sub-tests",
        }
    },
    REST_FRAMEWORK={
        **django_settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": _TEST_THROTTLE_RATES,
    },
)
class PaymeSubscriptionTests(TestCase):
    def setUp(self):
        from subscriptions.views import (
            SubscriptionCheckoutView,
            SubscriptionConfirmView,
            SubscriptionPaymentStatusView,
        )

        self._throttle_restore = [
            (SubscriptionCheckoutView, SubscriptionCheckoutView.throttle_classes),
            (SubscriptionConfirmView, SubscriptionConfirmView.throttle_classes),
            (SubscriptionPaymentStatusView, SubscriptionPaymentStatusView.throttle_classes),
        ]
        SubscriptionCheckoutView.throttle_classes = []
        SubscriptionConfirmView.throttle_classes = []
        SubscriptionPaymentStatusView.throttle_classes = []
        self._payme_check_state = 0
        self._check_patcher = patch(
            "subscriptions.payme_service.receipts_check",
            side_effect=lambda receipt_id: int(self._payme_check_state),
        )
        self._check_patcher.start()
        MorphAiSettings.load()
        self.user = _user()
        self.user.morph_free_tryon_eligible = False
        # Yangi-hisob chegirmasisiz to'liq Starter narxi (9990 so'm) tekshiriladi.
        self.user.date_joined = timezone.now() - timedelta(days=3)
        self.user.save(update_fields=["morph_free_tryon_eligible", "date_joined"])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        wallet = WalletService.ensure_wallet(self.user)
        WalletService.top_up(
            wallet=wallet,
            amount=Decimal("200000"),
            idempotency_key="payme-test-topup",
            metadata={"source": "test"},
        )

    def tearDown(self):
        self._check_patcher.stop()
        for view, classes in self._throttle_restore:
            view.throttle_classes = classes

    def test_uzs_to_tiyin_is_integer(self):
        self.assertEqual(uzs_to_tiyin(9990), 999_000)
        self.assertEqual(uzs_to_tiyin(Decimal("39990")), 3_999_000)
        self.assertIsInstance(uzs_to_tiyin("89990"), int)

    @patch("subscriptions.payme_service.receipts_create")
    def test_checkout_creates_pending_receipt_not_subscription(self, create):
        create.return_value = _receipt(state=0, order_id="pending")

        res = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "http://localhost:3000/subscriptions/payme"},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "pending")
        self.assertEqual(
            res.data["checkout_url"],
            "https://checkout.test.paycom.uz/abc123payme",
        )
        self.assertGreater(res.data["amount_tiyin"], 0)
        self.assertEqual(res.data["amount_tiyin"] % 100, 0)
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())
        pay = SubscriptionPayment.objects.get(order_id=res.data["order_id"])
        self.assertEqual(pay.payme_receipt_id, "abc123payme")
        self.assertEqual(pay.status, SubscriptionPayment.Status.PENDING)
        args, kwargs = create.call_args
        self.assertEqual(kwargs["amount_tiyin"], 999_000)
        self.assertNotIn("card", kwargs)

    @patch("subscriptions.payme_service.receipts_create")
    def test_new_user_payme_amount_is_catalog_price(self, create):
        """Yangi hisob ham Payme ga chegirmasiz katalog narxini yuboradi."""
        self.user.date_joined = timezone.now()
        self.user.save(update_fields=["date_joined"])
        expected = {"starter": 999_000, "plus": 2_999_000, "pro": 6_999_000}
        for plan_code, tiyin in expected.items():
            create.reset_mock()
            create.return_value = _receipt(rid=f"r-{plan_code}", state=0)
            res = self.client.post(
                "/api/v1/subscriptions/checkout/",
                {
                    "plan_code": plan_code,
                    "method": "payme",
                    "return_url": "https://mysaloon.uz/subscriptions/payme",
                    "amount_uzs": 1,
                    "promo_code": "CHEAP",
                },
                format="json",
            )
            self.assertEqual(res.status_code, 200, res.data)
            self.assertEqual(res.data["amount_uzs"], tiyin // 100)
            self.assertEqual(res.data["amount_tiyin"], tiyin)
            self.assertEqual(create.call_args.kwargs["amount_tiyin"], tiyin)

    @patch("subscriptions.payme_service.receipts_create")
    def test_new_user_payme_amount_is_catalog_price(self, create):
        """Yangi hisob ham Payme ga chegirmasiz katalog narxini yuboradi."""
        self.user.date_joined = timezone.now()
        self.user.save(update_fields=["date_joined"])
        expected = {"starter": 999_000, "plus": 2_999_000, "pro": 6_999_000}
        for plan_code, tiyin in expected.items():
            create.reset_mock()
            create.return_value = _receipt(rid=f"r-{plan_code}", state=0)
            res = self.client.post(
                "/api/v1/subscriptions/checkout/",
                {
                    "plan_code": plan_code,
                    "method": "payme",
                    "return_url": "https://mysaloon.uz/subscriptions/payme",
                    "amount_uzs": 1,
                    "promo_code": "CHEAP",
                },
                format="json",
            )
            self.assertEqual(res.status_code, 200, res.data)
            self.assertEqual(res.data["amount_uzs"], tiyin // 100)
            self.assertEqual(res.data["amount_tiyin"], tiyin)
            self.assertEqual(create.call_args.kwargs["amount_tiyin"], tiyin)

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_pending_confirm_does_not_activate(self, create, get):
        create.return_value = _receipt(rid="r1", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/subscriptions/payme"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        amount_tiyin = checkout.data["amount_tiyin"]
        get.return_value = _receipt(rid="r1", state=0, order_id=order_id, amount_tiyin=amount_tiyin)
        confirm = self.client.post(
            "/api/v1/subscriptions/confirm/",
            {"provider": "payme", "order_id": order_id},
            format="json",
        )
        self.assertEqual(confirm.status_code, 400)
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_paid_receipt_activates_once(self, create, get):
        create.return_value = _receipt(rid="r-paid", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/subscriptions/payme"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        amount_tiyin = checkout.data["amount_tiyin"]
        get.return_value = _receipt(rid="r-paid", state=4, order_id=order_id, amount_tiyin=amount_tiyin)
        self._payme_check_state = 4

        with self.captureOnCommitCallbacks(execute=True):
            first = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(first.status_code, 200, first.data)
        self.assertEqual(first.data["status"], "paid")
        self.assertEqual(UserSubscription.objects.filter(user=self.user, status="active").count(), 1)
        notes = Notification.objects.filter(user=self.user, type="subscription_paid")
        self.assertEqual(notes.count(), 1)
        self.assertIn("muvaffaqiyatli", notes.get().title.lower())
        sub = UserSubscription.objects.get(user=self.user, status="active")
        self.assertEqual(sub.plan_code, PLAN_STARTER)

        second = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(UserSubscription.objects.filter(user=self.user, status="active").count(), 1)
        self.assertEqual(
            SubscriptionPayment.objects.filter(order_id=order_id, status="paid").count(),
            1,
        )

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_cancelled_and_refunded(self, create, get):
        create.return_value = _receipt(rid="r-c", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        amount_tiyin = checkout.data["amount_tiyin"]
        get.return_value = _receipt(rid="r-c", state=-1, order_id=order_id, amount_tiyin=amount_tiyin)
        self._payme_check_state = -1
        res = self.client.post(
            "/api/v1/subscriptions/confirm/",
            {"provider": "payme", "order_id": order_id},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        pay = SubscriptionPayment.objects.get(order_id=order_id)
        self.assertEqual(pay.status, SubscriptionPayment.Status.CANCELLED)

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_amount_mismatch_rejected(self, create, get):
        create.return_value = _receipt(rid="r-m", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        get.return_value = _receipt(rid="r-m", state=4, order_id=order_id, amount_tiyin=1)
        res = self.client.post(
            "/api/v1/subscriptions/confirm/",
            {"provider": "payme", "order_id": order_id},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_delayed_then_paid_via_status(self, create, get):
        create.return_value = _receipt(rid="r-d", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        amount_tiyin = checkout.data["amount_tiyin"]
        get.return_value = _receipt(rid="r-d", state=0, order_id=order_id, amount_tiyin=amount_tiyin)
        pending = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(pending.data["status"], "pending")

        get.return_value = _receipt(rid="r-d", state=4, order_id=order_id, amount_tiyin=amount_tiyin)
        self._payme_check_state = 4
        paid = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(paid.data["status"], "paid")
        self.assertTrue(paid.data["ok"])

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_missing_receipt_does_not_activate(self, create, get):
        from subscriptions.payme_client import PaymeError

        create.return_value = _receipt(rid="r-miss", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        get.side_effect = PaymeError("Payme JSON-RPC -31602: Чек не найден или оплачен")
        self._payme_check_state = 4
        paid = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(paid.data["status"], "pending")
        self.assertFalse(paid.data["ok"])
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_unpaid_receipt_stays_unpaid_even_if_check_says_paid(self, create, get):
        create.return_value = _receipt(rid="r-unpaid", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        amount_tiyin = checkout.data["amount_tiyin"]
        get.return_value = _receipt(rid="r-unpaid", state=0, order_id=order_id, amount_tiyin=amount_tiyin)
        self._payme_check_state = 4
        row = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(row.status_code, 200, row.data)
        self.assertEqual(row.data["status"], "pending")
        self.assertFalse(row.data["ok"])
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())

    @patch("subscriptions.payme_service.receipts_create")
    def test_android_client_can_use_payme(self, create):
        create.return_value = _receipt(rid="r-and", state=0)
        res = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
            HTTP_X_MYSALOON_CLIENT="android",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["checkout_url"].startswith("https://checkout.test.paycom.uz/"))

    @override_settings(PAYME_MERCHANT_ID="", PAYME_SECRET_KEY="")
    def test_missing_merchant_config(self):
        res = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        self.assertEqual(res.status_code, 503)
        self.assertIn("PAYME_MERCHANT_ID", res.data["detail"])

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_refunded_does_not_activate(self, create, get):
        create.return_value = _receipt(rid="r-ref", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        amount_tiyin = checkout.data["amount_tiyin"]
        get.return_value = _receipt(rid="r-ref", state=-2, order_id=order_id, amount_tiyin=amount_tiyin)
        self._payme_check_state = -2
        res = self.client.post(
            "/api/v1/subscriptions/confirm/",
            {"provider": "payme", "order_id": order_id},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        pay = SubscriptionPayment.objects.get(order_id=order_id)
        self.assertEqual(pay.status, SubscriptionPayment.Status.REFUNDED)
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())

    @patch("subscriptions.payme_service.receipts_get")
    @patch("subscriptions.payme_service.receipts_create")
    def test_failed_and_expired_states(self, create, get):
        create.return_value = _receipt(rid="r-f", state=0)
        checkout = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order_id = checkout.data["order_id"]
        amount_tiyin = checkout.data["amount_tiyin"]
        get.return_value = _receipt(rid="r-f", state=99, order_id=order_id, amount_tiyin=amount_tiyin)
        self._payme_check_state = 99
        failed = self.client.get(f"/api/v1/subscriptions/payments/{order_id}/")
        self.assertEqual(failed.data["status"], "failed")
        self.assertFalse(UserSubscription.objects.filter(user=self.user, status="active").exists())

        create.return_value = _receipt(rid="r-e", state=0)
        checkout2 = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        order2 = checkout2.data["order_id"]
        amt2 = checkout2.data["amount_tiyin"]
        get.return_value = _receipt(rid="r-e", state=1, order_id=order2, amount_tiyin=amt2)
        self._payme_check_state = 1
        expired = self.client.get(f"/api/v1/subscriptions/payments/{order2}/")
        self.assertEqual(expired.data["status"], "expired")

    def test_wallet_and_click_checkout_rejected(self):
        for method in ("wallet", "click"):
            res = self.client.post(
                "/api/v1/subscriptions/checkout/",
                {"plan_code": "starter", "method": method},
                format="json",
            )
            self.assertEqual(res.status_code, 400, res.data)
            self.assertIn("Payme", res.data["detail"])
        self.assertFalse(
            SubscriptionPayment.objects.filter(user=self.user, provider="wallet").exists()
        )


class PaymeClientSafetyTests(TestCase):
    def test_live_host_blocked(self):
        from subscriptions.payme_client import PaymeSandboxOnly, payme_api_url

        with override_settings(
            PAYME_API_URL="https://checkout.paycom.uz/api",
            PAYME_SANDBOX=True,
            PAYME_ALLOW_LIVE=False,
        ):
            with self.assertRaises(PaymeSandboxOnly):
                payme_api_url()

    def test_live_host_allowed_when_flag_set(self):
        from subscriptions.payme_client import payme_api_url, payme_checkout_base

        with override_settings(
            PAYME_API_URL="https://checkout.paycom.uz/api",
            PAYME_CHECKOUT_BASE="https://checkout.paycom.uz",
            PAYME_ALLOW_LIVE=True,
            PAYME_SANDBOX=False,
        ):
            self.assertEqual(payme_api_url(), "https://checkout.paycom.uz/api")
            self.assertEqual(payme_checkout_base(), "https://checkout.paycom.uz")

    def test_checkout_url_is_receipt_path(self):
        from subscriptions.payme_client import build_checkout_url

        with override_settings(PAYME_CHECKOUT_BASE="https://checkout.test.paycom.uz"):
            self.assertEqual(
                build_checkout_url(receipt_id="62da73b0803aced907a52b46"),
                "https://checkout.test.paycom.uz/62da73b0803aced907a52b46",
            )
