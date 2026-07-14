from decimal import Decimal

from django.test import TestCase

from accounts.models import User
from wallet.models import LedgerEntry
from wallet.services.wallet_service import InsufficientBalanceError, WalletService, WalletServiceError


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

    def test_top_up_and_gift_with_design_fee(self):
        wa = WalletService.ensure_wallet(self.user_a)
        wb = WalletService.ensure_wallet(self.user_b)
        platform = WalletService.ensure_platform_wallet()
        WalletService.top_up(wallet=wa, amount=Decimal("500000"), idempotency_key="topup-1")
        gift = WalletService.send_gift(
            sender=self.user_a,
            gift_amount=Decimal("100000"),
            design_id="soft",  # fee 10_000
            message="Salom",
            idempotency_key="gift-1",
            recipient_user_id=self.user_b.pk,
        )
        wa.refresh_from_db()
        wb.refresh_from_db()
        platform.refresh_from_db()
        self.assertEqual(wa.balance, Decimal("390000"))  # 500k - 100k - 10k
        self.assertEqual(wb.balance, Decimal("100000"))
        self.assertEqual(platform.balance, Decimal("10000"))
        self.assertEqual(gift.amount, Decimal("100000"))
        self.assertEqual(gift.design_fee, Decimal("10000"))
        self.assertEqual(gift.total_charged, Decimal("110000"))
        self.assertEqual(gift.design_id, "soft")
        ok, err = WalletService.verify_chain(wa)
        self.assertTrue(ok, err)
        self.assertEqual(
            LedgerEntry.objects.filter(
                wallet=wa, entry_type=LedgerEntry.EntryType.GIFT_DESIGN_FEE
            ).count(),
            1,
        )

    def test_insufficient_balance_blocks_gift(self):
        WalletService.ensure_wallet(self.user_a)
        WalletService.ensure_wallet(self.user_b)
        with self.assertRaises(InsufficientBalanceError):
            WalletService.send_gift(
                sender=self.user_a,
                gift_amount=Decimal("100000"),
                design_id="classic",
                idempotency_key="gift-fail",
                recipient_user_id=self.user_b.pk,
            )

    def test_invalid_design_rejected(self):
        wa = WalletService.ensure_wallet(self.user_a)
        WalletService.ensure_wallet(self.user_b)
        WalletService.top_up(wallet=wa, amount=Decimal("100000"), idempotency_key="topup-x")
        with self.assertRaises(WalletServiceError):
            WalletService.send_gift(
                sender=self.user_a,
                gift_amount=Decimal("50000"),
                design_id="not-a-real-design",
                idempotency_key="gift-bad-design",
                recipient_user_id=self.user_b.pk,
            )

    def test_catalog_fee_not_client_controlled(self):
        """Even if client hoped for cheaper fee, catalog soft=10k is used."""
        wa = WalletService.ensure_wallet(self.user_a)
        wb = WalletService.ensure_wallet(self.user_b)
        platform = WalletService.ensure_platform_wallet()
        WalletService.top_up(wallet=wa, amount=Decimal("200000"), idempotency_key="topup-fee")
        gift = WalletService.send_gift(
            sender=self.user_a,
            gift_amount=Decimal("50000"),
            design_id="SOFT",  # case-insensitive
            idempotency_key="gift-fee",
            recipient_user_id=self.user_b.pk,
        )
        wa.refresh_from_db()
        wb.refresh_from_db()
        platform.refresh_from_db()
        self.assertEqual(gift.design_fee, Decimal("10000"))
        self.assertEqual(wa.balance, Decimal("140000"))
        self.assertEqual(wb.balance, Decimal("50000"))
        self.assertEqual(platform.balance, Decimal("10000"))

    def test_self_gift_blocked(self):
        wa = WalletService.ensure_wallet(self.user_a)
        WalletService.top_up(wallet=wa, amount=Decimal("100000"), idempotency_key="topup-self")
        with self.assertRaises(WalletServiceError):
            WalletService.send_gift(
                sender=self.user_a,
                gift_amount=Decimal("20000"),
                design_id="classic",
                idempotency_key="gift-self",
                recipient_user_id=self.user_a.pk,
            )

    def test_max_gift_amount(self):
        wa = WalletService.ensure_wallet(self.user_a)
        WalletService.ensure_wallet(self.user_b)
        WalletService.top_up(wallet=wa, amount=Decimal("2000000"), idempotency_key="topup-max")
        with self.assertRaises(WalletServiceError):
            WalletService.send_gift(
                sender=self.user_a,
                gift_amount=Decimal("1000001"),
                design_id="classic",
                idempotency_key="gift-max",
                recipient_user_id=self.user_b.pk,
            )

    def test_idempotent_gift(self):
        wa = WalletService.ensure_wallet(self.user_a)
        wb = WalletService.ensure_wallet(self.user_b)
        WalletService.top_up(wallet=wa, amount=Decimal("200000"), idempotency_key="topup-idemp")
        g1 = WalletService.send_gift(
            sender=self.user_a,
            gift_amount=Decimal("50000"),
            design_id="classic",
            idempotency_key="gift-same",
            recipient_user_id=self.user_b.pk,
        )
        g2 = WalletService.send_gift(
            sender=self.user_a,
            gift_amount=Decimal("50000"),
            design_id="classic",
            idempotency_key="gift-same",
            recipient_user_id=self.user_b.pk,
        )
        wa.refresh_from_db()
        wb.refresh_from_db()
        self.assertEqual(g1.pk, g2.pk)
        self.assertEqual(wa.balance, Decimal("145000"))  # 200k - 50k - 5k
        self.assertEqual(wb.balance, Decimal("50000"))

    def test_idempotent_topup(self):
        wa = WalletService.ensure_wallet(self.user_a)
        e1 = WalletService.top_up(wallet=wa, amount=Decimal("50000"), idempotency_key="dup")
        e2 = WalletService.top_up(wallet=wa, amount=Decimal("50000"), idempotency_key="dup")
        wa.refresh_from_db()
        self.assertEqual(e1.pk, e2.pk)
        self.assertEqual(wa.balance, Decimal("50000"))
        self.assertEqual(LedgerEntry.objects.filter(wallet=wa).count(), 1)
