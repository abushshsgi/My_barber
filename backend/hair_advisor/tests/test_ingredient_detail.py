from django.test import TestCase
from hair_advisor.services.ingredient_detail import build_ingredient_detail


class IngredientDetailTests(TestCase):
    def test_build_from_curated_fact(self):
        payload = build_ingredient_detail("Glycerin", product_name="Test Shampoo")
        self.assertIsNotNone(payload)
        assert payload is not None
        self.assertEqual(payload["inci_name"], "Glycerin")
        self.assertTrue(payload["known_curated"])
        self.assertIn("Test Shampoo", payload["product_context_uz"])

    def test_empty_inci_returns_none(self):
        self.assertIsNone(build_ingredient_detail(""))