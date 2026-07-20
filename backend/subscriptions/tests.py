"""B2C subscription smoke tests."""

from decimal import Decimal
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ReferralAttribution, User
from subscriptions.models import ReferralTrialGrant, UserSubscription
from subscriptions.plans import (
    PLAN_PLUS,
    PLAN_STARTER,
    REFERRAL_TRIAL_REQUIRED,
)
from subscriptions.services import (
    activate_subscription,
    check_morph_entitlement,
    deactivate_subscription,
    expire_if_needed,
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


class SubscriptionServiceTests(TestCase):
    def setUp(self):
        self.user = _user("subuser@test.local", "+998901111111")

    def test_new_user_blocked_without_subscription(self):
        for kind in ("tryon", "studio", "analyze", "face_check"):
            msg = check_morph_entitlement(user=self.user, kind=kind) or ""
            self.assertIn("obuna", msg.lower(), kind)
            self.assertIn("taklif", msg.lower(), kind)

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

        for _ in range(10):
            record_morph_usage(user=self.user, kind="tryon")
        self.assertIn("limiti", check_morph_entitlement(user=self.user, kind="tryon") or "")

    def test_expire_blocks_again(self):
        sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.REFERRAL_TRIAL,
            price_uzs=Decimal("0"),
            period_days=7,
        )
        sub.ends_at = timezone.now() - timedelta(seconds=1)
        sub.save(update_fields=["ends_at"])
        expired = expire_if_needed(sub)
        self.assertEqual(expired.status, UserSubscription.Status.EXPIRED)
        # Muddat tugagach Morph AI yana yopiladi.
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

    def test_referral_trial_after_3(self):
        for i in range(REFERRAL_TRIAL_REQUIRED):
            referee = _user(f"ref{i}@test.local", f"+99890111211{i}", f"Ref {i}")
            ReferralAttribution.objects.create(
                referrer=self.user,
                referee=referee,
                code_used="ABCD1234",
            )
        self.assertTrue(ReferralTrialGrant.objects.filter(user=self.user).exists())
        active = UserSubscription.objects.filter(
            user=self.user, status=UserSubscription.Status.ACTIVE
        ).first()
        self.assertIsNotNone(active)
        self.assertEqual(active.source, UserSubscription.Source.REFERRAL_TRIAL)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="studio"))


class SubscriptionAPITests(TestCase):
    def setUp(self):
        self.user = _user("apiuser@test.local", "+998902222222", "API User")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        wallet = WalletService.ensure_wallet(self.user)
        WalletService.top_up(
            wallet=wallet,
            amount=Decimal("100000"),
            idempotency_key="test-topup-sub-1",
            metadata={"source": "test"},
        )

    def test_plans_and_wallet_checkout(self):
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
        self.assertEqual(me.data["usage"]["morph_ai_limit"], 0)
        self.assertEqual(me.data["referral_trial"]["required_referrals"], 3)
        self.assertIn("invite_count", me.data["referral_trial"])
