"""B2C subscription smoke tests."""

from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch

from django.conf import settings as django_settings
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from accounts.referral import apply_referral, ensure_referral_code
from ai.models import MorphAiSettings
from subscriptions.models import SubscriptionEvent, SubscriptionPayment, UserSubscription
from subscriptions.plans import PLAN_PLUS, PLAN_PRO, PLAN_STARTER
from subscriptions.services import (
    CANCEL_BLOCK_REBUY_MESSAGE,
    activate_subscription,
    can_use_morph_voice,
    can_use_morph_care,
    can_use_morph_care_pro,
    cancel_user_subscription,
    chat_token_snapshot,
    check_morph_entitlement,
    current_period_bounds,
    checkout_plan_error,
    deactivate_subscription,
    expire_if_needed,
    get_active_subscription,
    has_premium_access,
    morph_care_block,
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


@override_settings(
    MORPH_ENTITLEMENT_BYPASS=False,
    MORPH_CARE_ACCESS_DEBUG=False,
    MORPH_VOICE_TEMPORARILY_DISABLED=False,
    MORPH_STUDIO_TEMPORARILY_DISABLED=False,
)
class SubscriptionServiceTests(TestCase):
    def setUp(self):
        self.user = _user("subuser@test.local", "+998901111111")
        # Eski (mavjud) user — bepul try-on huquqi yo'q.
        self.user.morph_free_tryon_eligible = False
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        MorphAiSettings.load()

    def test_new_user_gets_one_free_tryon(self):
        self.user.morph_free_tryon_eligible = True
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_free_tryon_used, 1)
        self.assertIn("obuna", (check_morph_entitlement(user=self.user, kind="tryon") or "").lower())
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="analyze"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="face_check"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        voice = check_morph_entitlement(user=self.user, kind="voice") or ""
        self.assertIn("ovoz", voice.lower())
        studio = check_morph_entitlement(user=self.user, kind="studio") or ""
        self.assertIn("obuna", studio.lower())

    def test_old_user_no_free_tryon(self):
        self.user.date_joined = timezone.now() - timedelta(days=400)
        self.user.save(update_fields=["date_joined"])
        msg = check_morph_entitlement(user=self.user, kind="tryon") or ""
        self.assertIn("obuna", msg.lower())

    def test_free_tryon_consumed_once(self):
        self.user.morph_free_tryon_eligible = True
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_free_tryon_used, 1)
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))

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
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="voice"))
        self.assertIn("Studio", check_morph_entitlement(user=self.user, kind="studio") or "")

        for _ in range(5):
            record_morph_usage(user=self.user, kind="tryon")
        self.assertIn("limiti", check_morph_entitlement(user=self.user, kind="tryon") or "")

    def test_new_user_chat_token_quota(self):
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_period"], "lifetime")
        self.assertEqual(snap["morph_chat_tokens_limit"], 10000)
        record_morph_chat_tokens(user=self.user, tokens=9800)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        record_morph_chat_tokens(user=self.user, tokens=200)
        msg = check_morph_entitlement(user=self.user, kind="chat") or ""
        self.assertIn("token", msg.lower())
        self.assertIn("obuna", msg.lower())

    def test_free_chat_tokens_do_not_reset_next_month(self):
        record_morph_chat_tokens(user=self.user, tokens=10_000)
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="chat"))
        from subscriptions.models import SubscriptionUsagePeriod

        SubscriptionUsagePeriod.objects.filter(user=self.user).delete()
        self.user.refresh_from_db()
        self.assertGreaterEqual(self.user.morph_chat_free_tokens_used, 10_000)
        msg = check_morph_entitlement(user=self.user, kind="chat") or ""
        self.assertIn("obuna", msg.lower())

    def test_subscription_unlocks_chat_after_free_grant(self):
        record_morph_chat_tokens(user=self.user, tokens=10_000)
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="chat"))
        activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_period"], "month")
        self.assertEqual(snap["morph_chat_tokens_used"], 0)

    def test_upgrade_replaces_exhausted_starter_quota(self):
        activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        for _ in range(5):
            record_morph_usage(user=self.user, kind="tryon")
        record_morph_chat_tokens(user=self.user, tokens=50_000)
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="chat"))

        activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.PAYME,
            price_uzs=Decimal("29990"),
        )
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="studio"))
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_limit"], 150_000)
        self.assertEqual(snap["morph_chat_tokens_used"], 0)
        self.assertEqual(snap["morph_chat_tokens_remaining"], 150_000)
        from subscriptions.services import build_me_payload

        usage = build_me_payload(self.user)["usage"]
        self.assertEqual(usage["morph_ai_limit"], 20)
        self.assertEqual(usage["morph_ai_used"], 0)
        self.assertEqual(usage["morph_ai_remaining"], 20)
        self.assertEqual(usage["morph_studio_limit"], 30)
        self.assertEqual(usage["morph_studio_remaining"], 30)

    def test_upgrade_plus_to_pro_refreshes_quota(self):
        activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        for _ in range(20):
            record_morph_usage(user=self.user, kind="tryon")
        record_morph_chat_tokens(user=self.user, tokens=150_000)
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="chat"))

        activate_subscription(
            user=self.user,
            plan_code=PLAN_PRO,
            source=UserSubscription.Source.PAYME,
            price_uzs=Decimal("69990"),
        )
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="studio"))
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_limit"], 500_000)
        self.assertEqual(snap["morph_chat_tokens_used"], 0)
        from subscriptions.services import build_me_payload

        usage = build_me_payload(self.user)["usage"]
        self.assertEqual(usage["morph_ai_limit"], 100)
        self.assertEqual(usage["morph_ai_remaining"], 100)
        self.assertEqual(usage["morph_studio_limit"], 150)

    def test_stale_entitlements_do_not_keep_old_limit(self):
        sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        sub.entitlements = {
            "morph_ai_monthly": 5,
            "morph_studio_monthly": 0,
            "morph_chat_tokens_monthly": 10_000,
        }
        sub.save(update_fields=["entitlements"])
        for _ in range(6):
            record_morph_usage(user=self.user, kind="tryon")
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="studio"))
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_limit"], 150_000)
        record_morph_chat_tokens(user=self.user, tokens=10_000)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))

    def test_empty_usage_plan_code_resets_when_subscription_active(self):
        from subscriptions.models import SubscriptionUsagePeriod

        activate_subscription(
            user=self.user,
            plan_code=PLAN_PRO,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        start, end = current_period_bounds()
        SubscriptionUsagePeriod.objects.filter(user=self.user).update(
            plan_code="",
            morph_chat_tokens_used=9_500,
            morph_ai_used=3,
        )
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_limit"], 500_000)
        self.assertEqual(snap["morph_chat_tokens_used"], 0)
        self.assertEqual(snap["morph_chat_tokens_remaining"], 500_000)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))

    def test_matching_plan_code_but_old_usage_resets(self):
        from subscriptions.models import SubscriptionUsagePeriod

        sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.PAYME,
            price_uzs=Decimal("29990"),
        )
        SubscriptionUsagePeriod.objects.filter(user=self.user).update(
            plan_code=PLAN_PLUS,
            morph_ai_used=20,
            morph_studio_used=30,
            morph_chat_tokens_used=150_000,
            updated_at=sub.starts_at - timedelta(minutes=5),
        )
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="studio"))
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_used"], 0)
        from subscriptions.services import build_me_payload

        usage = build_me_payload(self.user)["usage"]
        self.assertEqual(usage["morph_ai_used"], 0)
        self.assertEqual(usage["morph_ai_remaining"], 20)
        self.assertEqual(usage["plan_code"], PLAN_PLUS)

    def test_me_feature_flags_follow_plan(self):
        from subscriptions.services import build_me_payload

        free = build_me_payload(self.user)["access"]
        self.assertFalse(free["morph_studio_allowed"])
        self.assertFalse(free["morph_care_allowed"])
        self.assertFalse(free["morph_care_pro_allowed"])
        self.assertFalse(free["morph_voice_allowed"])
        activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        starter = build_me_payload(self.user)["access"]
        self.assertTrue(starter["morph_ai_allowed"])
        self.assertFalse(starter["morph_studio_allowed"])
        self.assertFalse(starter["morph_care_allowed"])
        self.assertTrue(starter["morph_voice_allowed"])
        activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        plus = build_me_payload(self.user)["access"]
        self.assertTrue(plus["morph_studio_allowed"])
        self.assertTrue(plus["morph_care_allowed"])
        self.assertFalse(plus["morph_care_pro_allowed"])

    @override_settings(MORPH_VOICE_TEMPORARILY_DISABLED=True)
    def test_voice_temporarily_disabled_even_with_plan(self):
        from subscriptions.services import build_me_payload

        activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        self.assertFalse(build_me_payload(self.user)["access"]["morph_voice_allowed"])
        self.assertFalse(can_use_morph_voice(self.user))
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="voice"))

    @override_settings(MORPH_STUDIO_TEMPORARILY_DISABLED=True)
    def test_studio_temporarily_disabled_even_with_plan(self):
        from subscriptions.plans import serialize_plan, get_plan
        from subscriptions.services import build_me_payload

        activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        self.assertFalse(build_me_payload(self.user)["access"]["morph_studio_allowed"])
        msg = check_morph_entitlement(user=self.user, kind="studio") or ""
        self.assertIn("hozircha", msg.lower())
        plus = serialize_plan(get_plan(PLAN_PLUS) or {})
        self.assertEqual(plus["morph_studio_monthly"], 0)
        self.assertFalse(any(row.get("key") == "studio" for row in plus["features"]))

    def test_usage_from_before_current_plan_does_not_block(self):
        from subscriptions.models import SubscriptionUsagePeriod

        sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.PAYME,
            price_uzs=Decimal("9990"),
        )
        SubscriptionUsagePeriod.objects.filter(user=self.user).update(
            plan_code="",
            morph_ai_used=5,
            morph_chat_tokens_used=50_000,
            updated_at=sub.starts_at - timedelta(minutes=2),
        )
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="chat"))
        snap = chat_token_snapshot(self.user)
        self.assertEqual(snap["morph_chat_tokens_used"], 0)
        self.assertEqual(snap["morph_chat_tokens_limit"], 50_000)

    def test_same_plan_usage_is_not_wiped(self):
        from subscriptions.models import SubscriptionUsagePeriod

        activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        record_morph_usage(user=self.user, kind="tryon")
        record_morph_usage(user=self.user, kind="tryon")
        SubscriptionUsagePeriod.objects.filter(user=self.user).update(plan_code="")
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        row = SubscriptionUsagePeriod.objects.get(user=self.user)
        self.assertEqual(row.morph_ai_used, 2)
        self.assertEqual(row.plan_code, PLAN_STARTER)

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

    def test_care_plus_and_pro_gates(self):
        self.assertFalse(can_use_morph_care(self.user))
        self.assertFalse(can_use_morph_care_pro(self.user))
        activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        self.assertFalse(can_use_morph_care(self.user))
        self.assertEqual(morph_care_block(user=self.user)["code"], "care_plus")
        activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        self.assertTrue(can_use_morph_care(self.user))
        self.assertFalse(can_use_morph_care_pro(self.user))
        self.assertIsNone(morph_care_block(user=self.user))
        self.assertEqual(morph_care_block(user=self.user, pro=True)["code"], "care_pro")
        activate_subscription(
            user=self.user,
            plan_code=PLAN_PRO,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        self.assertTrue(can_use_morph_care(self.user))
        self.assertTrue(can_use_morph_care_pro(self.user))
        self.assertIsNone(morph_care_block(user=self.user, pro=True))

    def test_one_referral_gives_one_generation_credit(self):
        self.user.morph_free_tryon_eligible = True
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        code = ensure_referral_code(self.user)
        referee = _user("ref0@test.local", "+998901112110", "Ref 0")
        apply_referral(new_user=referee, code=code)
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_referral_credits, 1)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_free_tryon_used, 0)
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


@override_settings(
    MORPH_ENTITLEMENT_BYPASS=False,
    MORPH_CARE_ACCESS_DEBUG=False,
    MORPH_VOICE_TEMPORARILY_DISABLED=False,
    MORPH_STUDIO_TEMPORARILY_DISABLED=False,
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "subscription-api-tests",
        }
    },
    REST_FRAMEWORK={
        **django_settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **django_settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
            "subscription_checkout": "10000/minute",
            "subscription_confirm": "10000/minute",
            "subscription_cancel": "10000/minute",
            "subscription_ip": "10000/minute",
            "user": "10000/minute",
            "anon": "10000/minute",
        },
    },
)
class SubscriptionAPITests(TestCase):
    def setUp(self):
        from subscriptions.views import (
            SubscriptionCancelView,
            SubscriptionCheckoutView,
            SubscriptionConfirmView,
            SubscriptionPaymentStatusView,
        )

        self._throttle_restore = [
            (SubscriptionCheckoutView, SubscriptionCheckoutView.throttle_classes),
            (SubscriptionConfirmView, SubscriptionConfirmView.throttle_classes),
            (SubscriptionCancelView, SubscriptionCancelView.throttle_classes),
            (SubscriptionPaymentStatusView, SubscriptionPaymentStatusView.throttle_classes),
        ]
        SubscriptionCheckoutView.throttle_classes = []
        SubscriptionConfirmView.throttle_classes = []
        SubscriptionCancelView.throttle_classes = []
        SubscriptionPaymentStatusView.throttle_classes = []
        self.user = _user("apiuser@test.local", "+998902222222", "API User")
        self.user.morph_free_tryon_eligible = False
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        MorphAiSettings.load()
        wallet = WalletService.ensure_wallet(self.user)
        WalletService.top_up(
            wallet=wallet,
            amount=Decimal("200000"),
            idempotency_key="test-topup-sub-1",
            metadata={"source": "test"},
        )

    def tearDown(self):
        for view, classes in self._throttle_restore:
            view.throttle_classes = classes

    def test_plans_public_without_auth(self):
        anon = APIClient()
        r = anon.get("/api/v1/subscriptions/plans/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["plans"]), 3)
        self.assertFalse(any(p["code"] == "free" for p in r.data["plans"]))
        starter = next(p for p in r.data["plans"] if p["code"] == "starter")
        self.assertEqual(starter["price_uzs"], 9990)
        plus_price = next(p for p in r.data["plans"] if p["code"] == "plus")
        pro_price = next(p for p in r.data["plans"] if p["code"] == "pro")
        self.assertEqual(plus_price["price_uzs"], 29990)
        self.assertEqual(pro_price["price_uzs"], 69990)
        self.assertEqual(starter["morph_ai_monthly"], 5)
        self.assertEqual(starter["morph_chat_tokens_monthly"], 50000)
        chat_feat = next(f for f in starter["features"] if f["key"] == "chat")
        self.assertIn("токенов", chat_feat["label_ru"])
        plus = next(p for p in r.data["plans"] if p["code"] == "plus")
        self.assertTrue(plus["morph_care"])
        self.assertFalse(plus.get("morph_care_pro"))
        pro = next(p for p in r.data["plans"] if p["code"] == "pro")
        self.assertTrue(pro["morph_care"])
        self.assertTrue(pro.get("morph_care_pro"))
        care_feat = next(f for f in plus["features"] if f["key"] == "care")
        self.assertTrue(care_feat.get("included", True))
        plus_sos = next(f for f in plus["features"] if f["key"] == "sos")
        self.assertFalse(plus_sos.get("included", True))
        self.assertTrue(next(f for f in plus["features"] if f["key"] == "scan").get("included", True))
        pro_sos = next(f for f in pro["features"] if f["key"] == "sos")
        self.assertTrue(pro_sos.get("included", True))
        pro_shelf = next(f for f in pro["features"] if f["key"] == "shelf")
        self.assertTrue(pro_shelf.get("included", True))
        r = self.client.get("/api/v1/subscriptions/plans/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["plans"]), 3)

        r2 = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "wallet"},
            format="json",
        )
        self.assertEqual(r2.status_code, 400, r2.data)
        activate_subscription(
            user=self.user,
            plan_code="starter",
            source=UserSubscription.Source.PAYME,
            price_uzs=Decimal("9990"),
            payment_provider="payme",
        )

        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.data["has_active"])
        self.assertEqual(me.data["subscription"]["plan_code"], "starter")
        self.assertTrue(me.data["access"]["morph_ai_allowed"])
        self.assertTrue(me.data["access"]["morph_voice_allowed"])

    def test_checkout_rejects_downgrade_and_ignores_client_price(self):
        first = activate_subscription(
            user=self.user,
            plan_code="plus",
            source=UserSubscription.Source.PAYME,
            price_uzs=Decimal("39990"),
            payment_provider="payme",
        )
        self.assertEqual(first.plan_code, "plus")
        self.assertGreaterEqual(first.price_uzs, 20000)

        down = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "payme"},
            format="json",
        )
        self.assertEqual(down.status_code, 400, down.data)
        self.assertIn("past", str(down.data.get("detail", "")).lower())

        same = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "plus", "method": "payme"},
            format="json",
        )
        self.assertEqual(same.status_code, 400, same.data)

        wallet_up = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "pro", "method": "wallet"},
            format="json",
        )
        self.assertEqual(wallet_up.status_code, 400, wallet_up.data)

    def test_me_free_tryon_for_eligible_new_user(self):
        self.user.morph_free_tryon_eligible = True
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertFalse(me.data["has_active"])
        self.assertEqual(me.data["current_plan_code"], "free")
        self.assertEqual(me.data["current_plan"]["code"], "free")
        self.assertEqual(me.data["current_plan"]["morph_chat_tokens_monthly"], 10000)
        self.assertEqual(me.data["current_plan"]["morph_ai_monthly"], 1)
        self.assertFalse(me.data["current_plan"]["purchasable"])
        self.assertTrue(me.data["access"]["morph_ai_allowed"])
        self.assertEqual(me.data["access"]["free_tryon_remaining"], 1)
        self.assertTrue(me.data["access"]["morph_chat_allowed"])
        self.assertFalse(me.data["access"]["morph_voice_allowed"])
        self.assertEqual(me.data["usage"]["morph_ai_limit"], 1)
        self.assertEqual(me.data["usage"]["morph_ai_remaining"], 1)
        self.assertEqual(me.data["usage"]["morph_chat_tokens_limit"], 10000)
        self.assertEqual(me.data["usage"]["morph_chat_tokens_remaining"], 10000)
        self.assertTrue(me.data["referral_generation_enabled"])
        self.assertNotIn("referral_trial", me.data)
        self.assertEqual(me.data["upgrade"]["plan_code"], "starter")
        denied = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "free", "method": "wallet"},
            format="json",
        )
        self.assertEqual(denied.status_code, 400)

    def test_me_locked_after_free_tryon_used(self):
        self.user.morph_free_tryon_eligible = True
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        record_morph_usage(user=self.user, kind="tryon")
        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertFalse(me.data["access"]["morph_ai_allowed"])
        self.assertEqual(me.data["access"]["free_tryon_remaining"], 0)
        self.assertEqual(me.data["usage"]["morph_free_tryon_used"], 1)

    def test_me_chat_blocked_after_free_tokens(self):
        record_morph_chat_tokens(user=self.user, tokens=10_000)
        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertFalse(me.data["access"]["morph_chat_allowed"])
        self.assertEqual(me.data["usage"]["morph_chat_tokens_remaining"], 0)
        self.assertEqual(me.data["usage"]["morph_chat_tokens_period"], "lifetime")


@override_settings(MORPH_ENTITLEMENT_BYPASS=False)
class FreeTryOnTests(TestCase):
    def setUp(self):
        MorphAiSettings.load()
        self.user = _user("free@test.local", "+998903333333", "Free User")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_new_user_has_one_free_tryon(self):
        self.assertTrue(self.user.morph_free_tryon_eligible)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        me = self.client.get("/api/v1/subscriptions/me/").data
        self.assertTrue(me["access"]["morph_ai_allowed"])
        self.assertTrue(me["free_tryon"]["available"])
        self.assertTrue(me["free_tryon"]["eligible"])
        self.assertEqual(me["usage"]["morph_ai_remaining"], 1)

        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.morph_free_tryon_used_at)
        self.assertIn("obuna", (check_morph_entitlement(user=self.user, kind="tryon") or "").lower())

    def test_studio_not_covered_by_free_tryon(self):
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="studio"))

    def test_subscriber_does_not_consume_free_tryon(self):
        activate_subscription(
            user=self.user,
            plan_code=PLAN_STARTER,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertIsNone(self.user.morph_free_tryon_used_at)

    def test_existing_user_not_eligible(self):
        self.user.morph_free_tryon_eligible = False
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        self.assertIsNotNone(check_morph_entitlement(user=self.user, kind="tryon"))

    def test_referral_credit_used_without_free_tryon(self):
        self.user.morph_referral_credits = 1
        self.user.save(update_fields=["morph_referral_credits"])
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertIsNone(self.user.morph_free_tryon_used_at)
        self.assertEqual(self.user.morph_referral_credits, 0)


class AdminFreeTrialUsersApiTests(TestCase):
    def setUp(self):
        from accounts.admin_auth import AdminPrincipal
        from accounts.models import AdminAccount

        admin = AdminAccount.objects.create(email="admin-free@test.uz", password="secret")
        self.client = APIClient()
        self.client.force_authenticate(user=AdminPrincipal(admin))

    def test_lists_only_users_who_used_free_tryon(self):
        used = _user("used@test.local", "+998904444444", "Used Free")
        used.morph_free_tryon_used_at = timezone.now()
        used.save(update_fields=["morph_free_tryon_used_at"])
        _user("unused@test.local", "+998905555555", "Unused Free")

        res = self.client.get("/api/v1/admin/morph-ai/free-trial-users/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["user_id"], used.pk)
        self.assertEqual(res.data["summary"]["used_total"], 1)
        self.assertEqual(res.data["summary"]["unused_total"], 0)

        csv_res = self.client.get("/api/v1/admin/morph-ai/free-trial-users/?export=csv")
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn("Used Free", csv_res.content.decode("utf-8"))

    def test_requires_admin(self):
        user = _user("plain@test.local", "+998906666666")
        client = APIClient()
        client.force_authenticate(user=user)
        res = client.get("/api/v1/admin/morph-ai/free-trial-users/")
        self.assertIn(res.status_code, (401, 403))


@override_settings(
    MORPH_ENTITLEMENT_BYPASS=False,
    MORPH_CARE_ACCESS_DEBUG=False,
    MORPH_STUDIO_TEMPORARILY_DISABLED=False,
)
class SubscriptionCancelTests(TestCase):
    def setUp(self):
        from subscriptions.views import SubscriptionCancelView

        self._prev_throttles = SubscriptionCancelView.throttle_classes
        SubscriptionCancelView.throttle_classes = []
        self.user = _user("cancel@test.local", "+998907777001")
        self.user.morph_free_tryon_eligible = False
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        MorphAiSettings.load()
        self.sub = activate_subscription(
            user=self.user,
            plan_code=PLAN_PLUS,
            source=UserSubscription.Source.PAYME,
            price_uzs=Decimal("29990"),
            payment_provider="payme",
            payment_order_id="sub-test-cancel-1",
            payment_transaction_id="receipt-1",
        )
        SubscriptionPayment.objects.create(
            user=self.user,
            subscription=self.sub,
            plan_code=PLAN_PLUS,
            amount_uzs=Decimal("29990"),
            amount_tiyin=2999000,
            provider="payme",
            status=SubscriptionPayment.Status.PAID,
            order_id="sub-test-cancel-1",
            idempotency_key="cancel-pay-1",
            payme_receipt_id="receipt-1",
            paid_at=timezone.now(),
        )

    def tearDown(self):
        from subscriptions.views import SubscriptionCancelView

        SubscriptionCancelView.throttle_classes = self._prev_throttles

    def test_cancel_keeps_premium_until_expiry(self):
        ends_at = self.sub.ends_at
        res = self.client.post("/api/v1/subscriptions/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["status"], "cancelled")
        self.assertTrue(res.data["is_premium"])
        self.assertEqual(res.data["can_cancel"], False)
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.status, UserSubscription.Status.CANCELLED)
        self.assertIsNotNone(self.sub.cancelled_at)
        self.assertEqual(self.sub.ends_at, ends_at)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="studio"))
        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertTrue(me.data["has_active"])
        self.assertTrue(me.data["is_premium"])
        self.assertEqual(me.data["status"], "cancelled")
        self.assertFalse(me.data["can_cancel"])

    def test_cancel_is_idempotent(self):
        first = self.client.post("/api/v1/subscriptions/cancel/", {}, format="json")
        self.assertEqual(first.status_code, 200, first.data)
        cancelled_at = first.data["cancelled_at"]
        second = self.client.post("/api/v1/subscriptions/cancel/", {}, format="json")
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(second.data["cancelled_at"], cancelled_at)
        self.assertEqual(
            SubscriptionEvent.objects.filter(
                user=self.user, action=SubscriptionEvent.Action.CANCELLED
            ).count(),
            1,
        )

    def test_cancel_without_subscription(self):
        other = _user("nosub@test.local", "+998907777002")
        client = APIClient()
        client.force_authenticate(user=other)
        res = client.post("/api/v1/subscriptions/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("obuna", (res.data.get("detail") or "").lower())

    def test_cannot_cancel_another_users_subscription(self):
        other = _user("other@test.local", "+998907777003")
        client = APIClient()
        client.force_authenticate(user=other)
        res = client.post("/api/v1/subscriptions/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.status, UserSubscription.Status.ACTIVE)
        self.assertIsNone(self.sub.cancelled_at)

    @patch("subscriptions.payme_client.receipts_cancel")
    def test_cancel_does_not_call_payme(self, receipts_cancel):
        res = self.client.post("/api/v1/subscriptions/cancel/", {}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        receipts_cancel.assert_not_called()
        pay = SubscriptionPayment.objects.get(order_id="sub-test-cancel-1")
        self.assertEqual(pay.status, SubscriptionPayment.Status.PAID)

    def test_expired_cancelled_blocks_premium(self):
        cancel_user_subscription(user=self.user)
        self.sub.refresh_from_db()
        self.sub.ends_at = timezone.now() - timedelta(seconds=1)
        self.sub.save(update_fields=["ends_at"])
        expired = expire_if_needed(self.sub)
        self.assertEqual(expired.status, UserSubscription.Status.EXPIRED)
        self.assertIsNone(get_active_subscription(self.user))
        self.assertIn("obuna", (check_morph_entitlement(user=self.user, kind="tryon") or "").lower())

    def test_rebuy_blocked_while_cancelled_premium(self):
        cancel_user_subscription(user=self.user)
        err = checkout_plan_error(user=self.user, plan_code=PLAN_PLUS)
        self.assertEqual(err, CANCEL_BLOCK_REBUY_MESSAGE)
        res = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "plus", "method": "payme", "return_url": "https://mysaloon.uz/x"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("faol", (res.data.get("detail") or "").lower())

    def test_rebuy_allowed_after_expiry(self):
        cancel_user_subscription(user=self.user)
        self.sub.refresh_from_db()
        self.sub.ends_at = timezone.now() - timedelta(seconds=1)
        self.sub.save(update_fields=["ends_at"])
        expire_if_needed(self.sub)
        self.assertIsNone(checkout_plan_error(user=self.user, plan_code=PLAN_STARTER))

    def test_refunded_payment_blocks_premium(self):
        pay = SubscriptionPayment.objects.get(order_id="sub-test-cancel-1")
        pay.status = SubscriptionPayment.Status.REFUNDED
        pay.save(update_fields=["status"])
        self.assertFalse(has_premium_access(self.sub))
        self.assertIsNone(get_active_subscription(self.user))
        self.assertIn("obuna", (check_morph_entitlement(user=self.user, kind="tryon") or "").lower())

    def test_unauthenticated_cancel_rejected(self):
        anon = APIClient()
        res = anon.post("/api/v1/subscriptions/cancel/", {}, format="json")
        self.assertIn(res.status_code, (401, 403))

    def test_cancel_ignores_client_supplied_fields(self):
        ends_at = self.sub.ends_at
        res = self.client.post(
            "/api/v1/subscriptions/cancel/",
            {
                "user_id": 999999,
                "status": "expired",
                "expires_at": "2019-01-01T00:00:00Z",
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.status, UserSubscription.Status.CANCELLED)
        self.assertEqual(self.sub.ends_at, ends_at)
        self.assertTrue(res.data["is_premium"])

    def test_upgrade_does_not_look_like_user_cancel(self):
        old_id = self.sub.pk
        activate_subscription(
            user=self.user,
            plan_code=PLAN_PRO,
            source=UserSubscription.Source.ADMIN,
            price_uzs=Decimal("0"),
        )
        old = UserSubscription.objects.get(pk=old_id)
        self.assertEqual(old.status, UserSubscription.Status.DEACTIVATED)
        self.assertIsNone(old.cancelled_at)
        self.assertFalse(old.is_user_cancelled)

