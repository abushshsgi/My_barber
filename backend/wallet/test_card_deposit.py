"""Tests for manual card deposit top-up flow."""

from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import AdminAccount, User
from accounts.admin_auth import encode_admin_tokens
from wallet.models import ManualCardDeposit
from wallet.services.card_deposit import CardDepositService
from wallet.services.wallet_service import WalletService, WalletServiceError


def _tiny_png() -> SimpleUploadedFile:
    # 1x1 PNG
    data = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return SimpleUploadedFile("receipt.png", data, content_type="image/png")


@override_settings(
    WALLET_RECEIVING_CARD_NUMBER="8600123456789012",
    WALLET_RECEIVING_CARDHOLDER="MYSALOON LLC",
    WALLET_RECEIVING_BANK="Test Bank",
    WALLET_MERCHANT_REF="MYSALOON",
)
class CardDepositServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="dep@test.com",
            email="dep@test.com",
            phone="+998901234567",
            role=User.Role.USER,
            full_name="Test User",
        )

    def test_init_claim_approve_credits_wallet(self):
        deposit, resumed = CardDepositService.init_deposit(
            user=self.user,
            amount=Decimal("100000"),
            idempotency_key="init-1",
            client_ip="127.0.0.1",
        )
        self.assertFalse(resumed)
        self.assertEqual(deposit.status, ManualCardDeposit.Status.AWAITING_PAYMENT)
        self.assertTrue(deposit.transaction_ref.startswith("MS"))
        self.assertIn("-", deposit.merchant_ref)

        claimed = CardDepositService.claim_deposit(
            user=self.user,
            deposit_id=str(deposit.pk),
            receipt_file=_tiny_png(),
        )
        self.assertEqual(claimed.status, ManualCardDeposit.Status.CLAIMED)
        self.assertTrue(bool(claimed.receipt_image))

        approved = CardDepositService.approve_deposit(
            deposit_id=str(deposit.pk),
            admin_id=1,
            admin_email="admin@test.com",
            note="OK",
        )
        self.assertEqual(approved.status, ManualCardDeposit.Status.APPROVED)
        wallet = WalletService.ensure_wallet(self.user)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("100000"))

        again = CardDepositService.approve_deposit(
            deposit_id=str(deposit.pk),
            admin_id=1,
            admin_email="admin@test.com",
        )
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("100000"))
        self.assertEqual(again.ledger_entry_id, approved.ledger_entry_id)

    def test_claim_requires_receipt(self):
        deposit, _ = CardDepositService.init_deposit(
            user=self.user,
            amount=Decimal("20000"),
            idempotency_key="init-receipt",
        )
        with self.assertRaises(WalletServiceError):
            CardDepositService.claim_deposit(user=self.user, deposit_id=str(deposit.pk))

    def test_open_deposit_resumes_instead_of_error(self):
        first, _ = CardDepositService.init_deposit(
            user=self.user, amount=Decimal("50000"), idempotency_key="a"
        )
        second, resumed = CardDepositService.init_deposit(
            user=self.user, amount=Decimal("100000"), idempotency_key="b"
        )
        self.assertTrue(resumed)
        self.assertEqual(str(second.pk), str(first.pk))
        self.assertEqual(ManualCardDeposit.objects.filter(user=self.user).count(), 1)


@override_settings(
    WALLET_RECEIVING_CARD_NUMBER="8600123456789012",
    WALLET_RECEIVING_CARDHOLDER="MYSALOON LLC",
    WALLET_MERCHANT_REF="MYSALOON",
)
class CardDepositApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="api@test.com",
            email="api@test.com",
            phone="+998909998877",
            role=User.Role.USER,
            full_name="Api User",
        )
        self.client = APIClient()
        from rest_framework_simplejwt.tokens import RefreshToken

        token = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

        self.admin = AdminAccount(email="admin@mysaloon.test")
        self.admin.set_password("pass12345")
        self.admin.save()
        access, _refresh = encode_admin_tokens(self.admin.pk)
        self.admin_client = APIClient()
        self.admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_user_init_claim_admin_approve(self):
        init = self.client.post(
            "/api/v1/wallet/top-up/card/init/",
            {"amount": 100000},
            format="json",
            HTTP_IDEMPOTENCY_KEY="api-init-1",
        )
        self.assertEqual(init.status_code, 201, init.content)
        deposit_id = init.data["id"]
        self.assertIn("transaction_ref", init.data)

        claim = self.client.post(
            f"/api/v1/wallet/top-up/card/{deposit_id}/claim/",
            {"receipt": _tiny_png()},
            format="multipart",
        )
        self.assertEqual(claim.status_code, 200, claim.content)
        self.assertEqual(claim.data["status"], "claimed")
        self.assertTrue(claim.data.get("receipt_url"))

        approve = self.admin_client.post(
            f"/api/v1/admin/wallet/deposits/{deposit_id}/approve/",
            {"note": "bank ok"},
            format="json",
        )
        self.assertEqual(approve.status_code, 200, approve.content)
        self.assertEqual(approve.data["deposit"]["status"], "approved")
        self.assertTrue(approve.data["deposit"].get("receipt_url"))

        me = self.client.get("/api/v1/wallet/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(Decimal(str(me.data["balance"])), Decimal("100000"))

        txs = self.client.get("/api/v1/wallet/transactions/")
        self.assertEqual(txs.status_code, 200)
        results = txs.data.get("results") or txs.data
        self.assertTrue(len(results) >= 1)
