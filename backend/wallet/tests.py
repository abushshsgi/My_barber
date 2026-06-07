from decimal import Decimal

from django.test import TestCase

from accounts.models import User
from wallet.models import LedgerEntry
from wallet.services.wallet_service import InsufficientBalanceError, WalletService


class WalletServiceTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(
            username="a@test.com",
            email="a@test.com",
            phone="+998901111111",
            role=User.Role.USER,
        )
        self.user_b = User.objects.create_user(
            username="b@test.com",
            email="b@test.com",
            phone="+998902222222",
            role=User.Role.USER,
        )

    def test_ensure_wallet_unique_number(self):
        w1 = WalletService.ensure_wallet(self.user_a)
        w2 = WalletService.ensure_wallet(self.user_a)
        self.assertEqual(w1.pk, w2.pk)
        self.assertTrue(w1.wallet_number.startswith("7700"))

    def test_top_up_and_gift(self):
        wa = WalletService.ensure_wallet(self.user_a)
        wb = WalletService.ensure_wallet(self.user_b)
        WalletService.top_up(wallet=wa, amount=Decimal("500000"), idempotency_key="topup-1")
        gift = WalletService.send_gift(
            sender=self.user_a,
            amount=Decimal("300000"),
            message="Salom",
            idempotency_key="gift-1",
            recipient_user_id=self.user_b.pk,
        )
        wa.refresh_from_db()
        wb.refresh_from_db()
        self.assertEqual(wa.balance, Decimal("200000"))
        self.assertEqual(wb.balance, Decimal("300000"))
        self.assertEqual(gift.amount, Decimal("300000"))
        ok, err = WalletService.verify_chain(wa)
        self.assertTrue(ok, err)

    def test_insufficient_balance(self):
        wa = WalletService.ensure_wallet(self.user_a)
        WalletService.ensure_wallet(self.user_b)
        with self.assertRaises(InsufficientBalanceError):
            WalletService.send_gift(
                sender=self.user_a,
                amount=Decimal("100000"),
                idempotency_key="gift-fail",
                recipient_user_id=self.user_b.pk,
            )

    def test_idempotent_topup(self):
        wa = WalletService.ensure_wallet(self.user_a)
        e1 = WalletService.top_up(wallet=wa, amount=Decimal("50000"), idempotency_key="dup")
        e2 = WalletService.top_up(wallet=wa, amount=Decimal("50000"), idempotency_key="dup")
        wa.refresh_from_db()
        self.assertEqual(e1.pk, e2.pk)
        self.assertEqual(wa.balance, Decimal("50000"))
        self.assertEqual(LedgerEntry.objects.filter(wallet=wa).count(), 1)
