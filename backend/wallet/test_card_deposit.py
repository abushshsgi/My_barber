"""Tests for manual card deposit top-up flow."""

from datetime import timedelta
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import AdminAccount, User
from accounts.admin_auth import encode_admin_tokens
from wallet.models import ManualCardDeposit
from wallet.services.card_deposit import CardDepositService, admin_deposit_to_dict
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
        admin_row = admin_deposit_to_dict(claimed)
        self.assertEqual(admin_row["user"]["id"], self.user.pk)
        self.assertEqual(admin_row["wallet_id"], claimed.wallet_id)
        self.assertEqual(admin_row["merchant_ref"], claimed.merchant_ref)
        self.assertEqual(admin_row["id"], str(claimed.pk))

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

    def test_expired_receipt_stays_overdue_and_can_be_approved(self):
        deposit, _resumed = CardDepositService.init_deposit(
            user=self.user,
            amount=Decimal("50000"),
            idempotency_key="overdue-1",
        )
        claimed = CardDepositService.claim_deposit(
            user=self.user,
            deposit_id=str(deposit.pk),
            receipt_file=_tiny_png(),
        )
        claimed.expires_at = timezone.now() - timedelta(hours=1)
        claimed.save(update_fields=["expires_at"])

        overdue = CardDepositService.list_for_admin(overdue=True)
        self.assertEqual([row.pk for row in overdue], [claimed.pk])
        self.assertEqual(overdue[0].status, ManualCardDeposit.Status.EXPIRED)

        fresh = CardDepositService.list_for_admin(status=ManualCardDeposit.Status.CLAIMED)
        self.assertEqual(fresh, [])

        approved = CardDepositService.approve_deposit(
            deposit_id=str(deposit.pk),
            admin_id=1,
            admin_email="admin@test.com",
            note="kech tasdiq",
        )
        self.assertEqual(approved.status, ManualCardDeposit.Status.APPROVED)
        wallet = WalletService.ensure_wallet(self.user)
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("50000"))
        self.assertEqual(CardDepositService.list_for_admin(overdue=True), [])

    def test_admin_pages_keep_every_deposit(self):
        wallet = WalletService.ensure_wallet(self.user)
        created = []
        for i in range(3):
            row = ManualCardDeposit.objects.create(
                user=self.user,
                wallet=wallet,
                amount=Decimal("10000"),
                status=ManualCardDeposit.Status.APPROVED,
                transaction_ref=f"PAGE{i}CODE",
                merchant_ref=f"MY-PAGE-{i}",
                receiving_card_number="8600123456789012",
                receiving_card_masked="8600 **** **** 9012",
                receiving_cardholder="MYSALOON LLC",
                idempotency_key=f"page-{i}",
                expires_at=timezone.now() + timedelta(hours=2),
            )
            created.append(row.pk)
        first, total, page, size = CardDepositService.page_for_admin(page=1, page_size=2)
        second, total_2, page_2, size_2 = CardDepositService.page_for_admin(page=2, page_size=2)
        self.assertEqual(total, 3)
        self.assertEqual(total_2, 3)
        self.assertEqual(page, 1)
        self.assertEqual(page_2, 2)
        self.assertEqual(size, 2)
        self.assertEqual(size_2, 2)
        self.assertEqual(len(first), 2)
        self.assertEqual(len(second), 1)
        self.assertEqual({row.pk for row in first} | {row.pk for row in second}, set(created))

    def test_approve_without_receipt_is_rejected(self):
        deposit, _resumed = CardDepositService.init_deposit(
            user=self.user,
            amount=Decimal("50000"),
            idempotency_key="init-noreceipt",
        )
        with self.assertRaises(WalletServiceError):
            CardDepositService.approve_deposit(
                deposit_id=str(deposit.pk),
                admin_id=1,
                admin_email="admin@test.com",
            )

    def test_html_disguised_as_jpeg_is_rejected(self):
        deposit, _resumed = CardDepositService.init_deposit(
            user=self.user,
            amount=Decimal("50000"),
            idempotency_key="init-html",
        )
        fake = SimpleUploadedFile(
            "receipt.jpg",
            b"<html><script>alert(1)</script></html>",
            content_type="image/jpeg",
        )
        with self.assertRaises(WalletServiceError):
            CardDepositService.claim_deposit(
                user=self.user,
                deposit_id=str(deposit.pk),
                receipt_file=fake,
            )

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

        ref = init.data["transaction_ref"]
        blocked = self.admin_client.post(
            f"/api/v1/admin/wallet/deposits/{deposit_id}/approve/",
            {"note": "bank ok", "confirm_ref": "WRONG"},
            format="json",
        )
        self.assertEqual(blocked.status_code, 400, blocked.content)

        approve = self.admin_client.post(
            f"/api/v1/admin/wallet/deposits/{deposit_id}/approve/",
            {"note": "bank ok", "confirm_ref": ref},
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
        self.assertIn("/receipt/", claim.data["receipt_url"])
        self.assertNotIn("/media/", claim.data["receipt_url"])


@override_settings(
    DEBUG=False,
    WALLET_RECEIVING_CARD_NUMBER='"8600 1234 5678 9012"',
    WALLET_RECEIVING_CARDHOLDER="'ALI VALIYEV'",
    WALLET_RECEIVING_BANK="",
    WALLET_MERCHANT_REF="MYSALOON",
)
class ReceivingCardParseTests(TestCase):
    def test_quotes_spaces_are_stripped(self):
        from wallet.services.card_deposit import receiving_card_config

        cfg = receiving_card_config()
        self.assertEqual(cfg["card_number"], "8600123456789012")
        self.assertEqual(cfg["cardholder"], "ALI VALIYEV")
        self.assertEqual(cfg["bank"], "Bank")
