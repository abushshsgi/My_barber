"""B2C subscription smoke tests."""

from decimal import Decimal
from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from accounts.referral import apply_referral, ensure_referral_code
from ai.models import MorphAiSettings
from subscriptions.models import UserSubscription
from subscriptions.plans import PLAN_PLUS, PLAN_STARTER
from subscriptions.services import (
    activate_subscription,
    check_morph_entitlement,
    deactivate_subscription,
    expire_if_needed,
    record_morph_chat_tokens,
    record_morph_usage,
)
from wallet.services.wallet_service import WalletService


def _user(email: str, phone: str, name: str = "Sub User") -> User:
    import uuid

    suffix = uuid.uuid4().hex[:10]
    return User.objects.create_user(
        username=f"u{suffix}",
        email=f"{suffix}@test.local",
        phone=f"+9989{suffix[:8]}",
        password="TestPass123!",
        role=User.Role.USER,
        full_name=name,
    )


@override_settings(MORPH_ENTITLEMENT_BYPASS=False)
class SubscriptionServiceTests(TestCase):
    def setUp(self):
        self.user = _user("subuser@test.local", "+998901111111")
        MorphAiSettings.load()

    def test_new_user_blocked_without_subscription(self):
        msg = check_morph_entitlement(user=self.user, kind="tryon") or ""
        self.assertIn("obuna", msg.lower())
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="analyze"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="face_check"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        studio = check_morph_entitlement(user=self.user, kind="studio") or ""
        self.assertIn("obuna", studio.lower())

    def test_activate_and_limits(self):
        sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        self.assertEqual(sub.status, UserSubscription.Status.ACTIVE)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="analyze"))
        self.assertIn("Studio", check_morph_entitlement(user=self.user, kind="studio") or "")

        for _ in range(5):
            record_morph_usage(user=self.user, kind="tryon")
        self.assertIn("limiti", check_morph_entitlement(user=self.user, kind="tryon") or "")

    def test_new_user_chat_token_quota(self):
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        record_morph_chat_tokens(user=self.user, tokens=9800)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        record_morph_chat_tokens(user=self.user, tokens=200)
        msg = check_morph_entitlement(user=self.user, kind="chat") or ""
        self.assertIn("token", msg.lower())

    def test_expire_blocks_again(self):
        sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
            period_days=7,
        )
        sub.ends_at = timezone.now() - timedelta(seconds=1)
        sub.save(update_fields=["ends_at"])
        expired = expire_if_needed(sub)
        self.assertEqual(expired.status, UserSubscription.Status.EXPIRED)
        msg = check_morph_entitlement(user=self.user, kind="tryon") or ""
        self.assertIn("obuna", msg.lower())

    def test_deactivate_blocks_again(self):
        sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        deactivate_subscription(subscription=sub, actor="admin:1", reason="test")
        msg = check_morph_entitlement(user=self.user, kind="tryon") or ""
        self.assertIn("obuna", msg.lower())
        self.assertIn("obuna", (check_morph_entitlement(user=self.user, kind="studio") or "").lower())

    def test_one_referral_gives_one_generation_credit(self):
        code = ensure_referral_code(self.user)
        referee = _user("ref0@test.local", "+998901112110", "Ref 0")
        apply_referral(new_user=referee, code=code)
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_referral_credits, 1)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_referral_credits, 0)
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))

    def test_referral_credits_disabled_by_admin(self):
        s = MorphAiSettings.load()
        s.referral_generation_enabled = False
        s.save(update_fields=["referral_generation_enabled"])
        code = ensure_referral_code(self.user)
        referee = _user("ref1@test.local", "+998901112111", "Ref 1")
        apply_referral(new_user=referee, code=code)
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_referral_credits, 0)
        self.user.morph_referral_credits = 5
        self.user.save(update_fields=["morph_referral_credits"])
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))


@override_settings(MORPH_ENTITLEMENT_BYPASS=False)
class SubscriptionAPITests(TestCase):
    def setUp(self):
        self.user = _user("apiuser@test.local", "+998902222222", "API User")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        MorphAiSettings.load()
        wallet = WalletService.ensure_wallet(self.user)
        WalletService.top_up(
            wallet=wallet,
            amount=Decimal("100000"),
            idempotency_key="test-topup-sub-1",
            metadata={"source": "test"},
        )

    def test_plans_public_without_auth(self):
        anon = APIClient()
        r = anon.get("/api/v1/subscriptions/plans/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["plans"]), 3)
        starter = next(p for p in r.data["plans"] if p["code"] == "starter")
        self.assertEqual(starter["price_uzs"], 9990)
        self.assertEqual(starter["morph_ai_monthly"], 5)
        self.assertEqual(starter["morph_chat_tokens_monthly"], 50000)
        r = self.client.get("/api/v1/subscriptions/plans/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["plans"]), 3)

        r2 = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "wallet"},
            format="json",
        )
        self.assertEqual(r2.status_code, 201, r2.data)
        self.assertTrue(r2.data["ok"])

        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.data["has_active"])
        self.assertEqual(me.data["subscription"]["plan_code"], "starter")
        self.assertTrue(me.data["access"]["morph_ai_allowed"])

    def test_me_locked_for_new_user(self):
        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertFalse(me.data["has_active"])
        self.assertFalse(me.data["access"]["morph_ai_allowed"])
        self.assertTrue(me.data["access"]["morph_chat_allowed"])
        self.assertEqual(me.data["usage"]["morph_ai_limit"], 0)
        self.assertEqual(me.data["usage"]["morph_chat_tokens_limit"], 10000)
        self.assertEqual(me.data["usage"]["morph_chat_tokens_remaining"], 10000)
        self.assertTrue(me.data["referral_generation_enabled"])
        self.assertNotIn("referral_trial", me.data)
