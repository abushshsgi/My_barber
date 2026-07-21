from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from wallet.payment_confirm import parse_wallet_topup_order
from wallet.services.wallet_service import WalletService

User = get_user_model()


def _token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class PaymentConfirmTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="901999000@phone.mysaloon.local",
            email="901999000@phone.mysaloon.local",
            phone="+998901999000",
            password="unused",
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(self.user)}")

    def test_parse_wallet_topup_order(self):
        parsed = parse_wallet_topup_order("wallet-topup-5-50000-abc")
        self.assertEqual(parsed, (5, Decimal("50000")))

    @override_settings(DEBUG=True)
    def test_confirm_never_credits_wallet_even_in_debug(self):
        """Client confirm endpoint must never mint balance (Click/Payme not wired)."""
        order_id = f"wallet-topup-{self.user.pk}-50000-test"
        res = self.client.post(
            "/api/v1/payments/confirm/",
            {"order_id": order_id, "provider": "click", "transaction_id": "tx-1"},
            format="json",
        )
        self.assertEqual(res.status_code, 503)
        self.assertFalse(res.data.get("credited", True))
        wallet = WalletService.ensure_wallet(self.user)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("0"))

    @override_settings(DEBUG=False)
    def test_confirm_blocked_in_production(self):
        order_id = f"wallet-topup-{self.user.pk}-100000-prod"
        res = self.client.post(
            "/api/v1/payments/confirm/",
            {"order_id": order_id, "provider": "payme", "transaction_id": "tx-2"},
            format="json",
        )
        self.assertEqual(res.status_code, 503)
        wallet = WalletService.ensure_wallet(self.user)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("0"))
