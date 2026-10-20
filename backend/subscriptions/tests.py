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
    chat_token_snapshot,
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
        # Eski (mavjud) user — bepul try-on huquqi yo'q.
        self.user.morph_free_tryon_eligible = False
        self.user.save(update_fields=["morph_free_tryon_eligible"])
        MorphAiSettings.load()

    def test_new_user_one_free_tryon_then_blocked(self):
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_free_tryon_used, 1)
        msg = check_morph_entitlement(user=self.user, kind="tryon") or ""
        self.assertIn("obuna", msg.lower())
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

    def test_new_user_cannot_use_free_tryon_twice(self):
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        record_morph_usage(user=self.user, kind="tryon")
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
        self.assertEqual(self.user.morph_free_tryon_used, 1)
        self.assertEqual(self.user.morph_referral_credits, 1)
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

    def test_plans_public_without_auth(self):
        anon = APIClient()
        r = anon.get("/api/v1/subscriptions/plans/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["plans"]), 3)
        starter = next(p for p in r.data["plans"] if p["code"] == "starter")
        self.assertEqual(starter["price_uzs"], 9990)
        self.assertEqual(starter["morph_ai_monthly"], 5)
        self.assertEqual(starter["morph_chat_tokens_monthly"], 50000)
        chat_feat = next(f for f in starter["features"] if f["key"] == "chat")
        self.assertIn("токенов", chat_feat["label_ru"])
        voice_feat = next(f for f in starter["features"] if f["key"] == "voice")
        self.assertTrue(voice_feat.get("included", True))
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
        self.assertTrue(me.data["access"]["morph_voice_allowed"])

    def test_checkout_rejects_downgrade_and_ignores_client_price(self):
        first = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "plus", "method": "wallet", "amount_uzs": 1},
            format="json",
        )
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(first.data["subscription"]["plan_code"], "plus")
        # Klient 1 so'm yuborgan — server katalog/promo narxini oladi.
        self.assertNotEqual(first.data["subscription"]["price_uzs"], 1)
        self.assertGreaterEqual(first.data["subscription"]["price_uzs"], 20000)

        down = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "starter", "method": "wallet"},
            format="json",
        )
        self.assertEqual(down.status_code, 400, down.data)
        self.assertIn("past", str(down.data.get("detail", "")).lower())

        same = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "plus", "method": "wallet"},
            format="json",
        )
        self.assertEqual(same.status_code, 400, same.data)

        up = self.client.post(
            "/api/v1/subscriptions/checkout/",
            {"plan_code": "pro", "method": "wallet"},
            format="json",
        )
        self.assertEqual(up.status_code, 201, up.data)
        self.assertEqual(up.data["subscription"]["plan_code"], "pro")

    def test_me_locked_for_new_user(self):
        me = self.client.get("/api/v1/subscriptions/me/")
        self.assertEqual(me.status_code, 200)
        self.assertFalse(me.data["has_active"])
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

    def test_me_locked_after_free_tryon(self):
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

    def test_new_user_gets_exactly_one_free_tryon(self):
        self.assertTrue(self.user.morph_free_tryon_eligible)
        self.assertIsNone(check_morph_entitlement(user=self.user, kind="tryon"))
        me = self.client.get("/api/v1/subscriptions/me/").data
        self.assertTrue(me["access"]["morph_ai_allowed"])
        self.assertTrue(me["free_tryon"]["available"])
        self.assertEqual(me["usage"]["morph_ai_remaining"], 1)

        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.morph_free_tryon_used_at)
        self.assertIn("obuna", (check_morph_entitlement(user=self.user, kind="tryon") or "").lower())
        me = self.client.get("/api/v1/subscriptions/me/").data
        self.assertFalse(me["access"]["morph_ai_allowed"])
        self.assertFalse(me["free_tryon"]["available"])
        self.assertTrue(me["free_tryon"]["used"])

        first_used = self.user.morph_free_tryon_used_at
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertEqual(self.user.morph_free_tryon_used_at, first_used)

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

    def test_free_tryon_used_before_referral_credit(self):
        self.user.morph_referral_credits = 1
        self.user.save(update_fields=["morph_referral_credits"])
        record_morph_usage(user=self.user, kind="tryon")
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.morph_free_tryon_used_at)
        self.assertEqual(self.user.morph_referral_credits, 1)


class AdminFreeTrialUsersApiTests(TestCase):
    def setUp(self):
        from accounts.admin_auth import AdminPrincipal
        from accounts.models import AdminAccount

        admin = AdminAccount.objects.create(email="admin-free@test.uz", password="secret")
        self.client = APIClient()
        self.client.force_authenticate(user=AdminPrincipal(admin))

    def test_lists_only_users_who_used_free_tryon(self):
        used = _user("used@test.local", "+998904444444", "Used Free")
        _user("unused@test.local", "+998905555555", "Unused Free")
        record_morph_usage(user=used, kind="tryon")

        res = self.client.get("/api/v1/admin/morph-ai/free-trial-users/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["user_id"], used.pk)
        self.assertEqual(res.data["summary"]["used_total"], 1)
        self.assertGreaterEqual(res.data["summary"]["unused_total"], 1)

        csv_res = self.client.get("/api/v1/admin/morph-ai/free-trial-users/?export=csv")
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn("Used Free", csv_res.content.decode("utf-8"))

    def test_requires_admin(self):
        user = _user("plain@test.local", "+998906666666")
        client = APIClient()
        client.force_authenticate(user=user)
        res = client.get("/api/v1/admin/morph-ai/free-trial-users/")
        self.assertIn(res.status_code, (401, 403))
