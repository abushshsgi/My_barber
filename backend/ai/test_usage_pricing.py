from decimal import Decimal

from django.test import SimpleTestCase, override_settings

from ai.usage_pricing import (
    billing_bucket,
    cost_usd_for_chat,
    cost_usd_for_image,
    explain_usage_charge,
    extract_usage_tokens,
    finalize_usage,
    usd_to_uzs,
)


class UsagePricingTests(SimpleTestCase):
    def test_extract_usage_tokens(self):
        tokens = extract_usage_tokens(
            {
                "usageMetadata": {
                    "promptTokenCount": 100,
                    "candidatesTokenCount": 1120,
                    "totalTokenCount": 1220,
                }
            }
        )
        self.assertEqual(tokens["prompt_tokens"], 100)
        self.assertEqual(tokens["candidates_tokens"], 1120)
        self.assertEqual(tokens["total_tokens"], 1220)

    def test_image_cost_approx_one_k(self):
        # ~1120 image output tokens @ $30/1M ≈ $0.0336
        cost = cost_usd_for_image(prompt_tokens=1120, candidates_tokens=1120)
        self.assertGreater(cost, Decimal("0.03"))
        self.assertLess(cost, Decimal("0.04"))

    def test_finalize_fallback_when_no_metadata(self):
        usage = finalize_usage({}, kind="tryon", input_images=1)
        self.assertTrue(usage["tokens_estimated"])
        self.assertGreater(usage["total_tokens"], 0)
        self.assertGreater(usage["cost_usd"], Decimal("0"))

    def test_chat_flash_lite_is_cheap(self):
        # 10k tokens: ~8000 in / 2000 out @ $0.10 / $0.40 → $0.0016
        cost = cost_usd_for_chat(prompt_tokens=8000, candidates_tokens=2000)
        self.assertGreater(cost, Decimal("0.001"))
        self.assertLess(cost, Decimal("0.002"))
        usage = finalize_usage({}, kind="chat")
        self.assertGreater(usage["total_tokens"], 0)
        self.assertLess(usage["cost_usd"], Decimal("0.01"))
        self.assertGreater(usd_to_uzs(cost), 0)

    def test_chat_fallback_uses_actual_text_length(self):
        from ai.usage_pricing import estimate_chat_tokens_from_text, merge_usage_tokens

        short = estimate_chat_tokens_from_text(prompt_chars=40, reply_chars=80)
        long = estimate_chat_tokens_from_text(prompt_chars=4000, reply_chars=2000)
        self.assertLess(short["total_tokens"], 80)
        self.assertGreater(long["total_tokens"], short["total_tokens"])
        usage = finalize_usage(
            {},
            kind="chat",
            prompt_chars=120,
            reply_chars=40,
        )
        self.assertTrue(usage["tokens_estimated"])
        self.assertLess(usage["total_tokens"], 200)

        merged = merge_usage_tokens(
            {"candidates": [{"content": {"parts": [{"text": "A"}]}}]},
            {
                "usageMetadata": {
                    "promptTokenCount": 210,
                    "candidatesTokenCount": 40,
                    "totalTokenCount": 250,
                }
            },
        )
        self.assertEqual(merged["prompt_tokens"], 210)
        self.assertEqual(merged["total_tokens"], 250)

    @override_settings(RUNWARE_TRYON_WIDTH=1024, RUNWARE_TRYON_HEIGHT=1024)
    def test_runware_api_cost_is_kept(self):
        charge = explain_usage_charge(
            kind="tryon",
            status="success",
            provider="runware",
            model="runware:400@2",
            cost_usd="0.002470",
            total_tokens=0,
            tokens_estimated=False,
        )
        self.assertEqual(charge["cost_usd"], Decimal("0.002470"))
        self.assertEqual(charge["price_basis"], "runware_api")
        self.assertEqual(charge["charge_from"], "runware")
        self.assertFalse(charge["repriced"])
        self.assertEqual(billing_bucket(charge), "runware")

    @override_settings(RUNWARE_TRYON_WIDTH=1024, RUNWARE_TRYON_HEIGHT=1024)
    def test_old_gemini_tryon_uses_runware_list_price(self):
        charge = explain_usage_charge(
            kind="tryon",
            status="success",
            provider="vertex",
            model="gemini-2.5-flash-image",
            cost_usd="0.034200",
            total_tokens=2240,
            tokens_estimated=True,
        )
        self.assertEqual(charge["cost_usd"], Decimal("0.000780"))
        self.assertEqual(charge["legacy_cost_usd"], Decimal("0.034200"))
        self.assertEqual(charge["price_basis"], "runware_list")
        self.assertTrue(charge["repriced"])
        self.assertIn("Gemini", charge["price_note"])

    def test_analyze_stays_on_gemini_tokens(self):
        charge = explain_usage_charge(
            kind="analyze",
            status="success",
            provider="vertex",
            model="gemini-3.5-flash-lite",
            cost_usd="0.000931",
            total_tokens=1800,
            tokens_estimated=False,
        )
        self.assertEqual(charge["cost_usd"], Decimal("0.000931"))
        self.assertEqual(charge["charge_from"], "gemini")
        self.assertEqual(charge["activity"], "tahlil")
        self.assertEqual(billing_bucket(charge), "gemini_analyze")

    def test_failed_analyze_is_unbilled(self):
        charge = explain_usage_charge(
            kind="analyze",
            status="failed",
            provider="",
            cost_usd="0",
            total_tokens=0,
        )
        self.assertEqual(charge["cost_usd"], Decimal("0"))
        self.assertEqual(charge["charge_from"], "none")
        self.assertEqual(billing_bucket(charge), "unbilled")
