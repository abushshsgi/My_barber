from django.test import TestCase

from hair_advisor.models import Ingredient
from hair_advisor.services.ingredient_import import sync_ingredients_from_facts


class IngredientImportTests(TestCase):
    def test_idempotent_sync(self):
        first = sync_ingredients_from_facts()
        count_after_first = Ingredient.objects.count()
        second = sync_ingredients_from_facts()
        self.assertEqual(Ingredient.objects.count(), count_after_first)
        self.assertGreaterEqual(first["ingredients_created"] + first["ingredients_updated"], 0)
        self.assertEqual(second["ingredients_created"], 0)