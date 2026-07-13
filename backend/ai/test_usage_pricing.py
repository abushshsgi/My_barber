from decimal import Decimal

from django.test import SimpleTestCase

from ai.usage_pricing import (
    cost_usd_for_image,
    extract_usage_tokens,
    finalize_usage,
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
