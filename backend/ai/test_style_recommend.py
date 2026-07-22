from django.test import SimpleTestCase, TestCase

from ai.age_groups import age_to_group, resolve_hairstyle_image_path
from ai.hairstyle_catalog import get_published_catalog, pick_catalog_suggestions, pick_trending_styles, score_hairstyle
from ai.services.gemini_style import AiStyleError
from ai.style_recommend import assert_gender_matches_profile, build_suggestions_from_analysis

OLD_MONEY_SLUGS = {
    "old-money-loose-curl",
    "old-money-soft-wave",
    "old-money-defined-curl",
    "old-money-layered-curl",
    "old-money-tousled-curl",
}


class AgeGroupTests(SimpleTestCase):
    def test_age_to_group(self):
        self.assertEqual(age_to_group(11), "kids")
        self.assertEqual(age_to_group(15), "teen")
        self.assertEqual(age_to_group(25), "young")
        self.assertEqual(age_to_group(35), "adult")
        self.assertEqual(age_to_group(50), "mature")

    def test_image_path_for_adult(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/personas/irland/old-money-loose-curl.webp",
            slug="old-money-loose-curl",
            audience="men",
            age_group="adult",
        )
        self.assertEqual(path, "/hairstyles/men/adult/old-money-loose-curl.webp")

    def test_image_path_for_young_uses_legacy(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/personas/irland/old-money-loose-curl.webp",
            slug="old-money-loose-curl",
            audience="men",
            age_group="young",
        )
        self.assertEqual(path, "/hairstyles/men/personas/irland/old-money-loose-curl.webp")

    def test_persona_without_ready_asset_keeps_seed_path(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/personas/irland/old-money-loose-curl.webp",
            slug="old-money-loose-curl",
            audience="men",
            age_group="young",
            persona_id="irland",
        )
        # Ready assets hali yo'q — seed image_path qaytadi.
        self.assertEqual(path, "/hairstyles/men/personas/irland/old-money-loose-curl.webp")


class HairstyleCatalogTests(TestCase):
    def test_pick_men_medium_oval_styles(self):
        suggestions = pick_catalog_suggestions(
            audience="men",
            face_shape="oval",
            hair_type="medium",
        )
        self.assertEqual(len(suggestions), 3)
        self.assertTrue(all(item["id"].startswith("men-") for item in suggestions))
        self.assertEqual(suggestions[0]["match"], 94)
        self.assertTrue({item["seed"] for item in suggestions} <= OLD_MONEY_SLUGS)

    def test_pick_mature_men_prefers_catalog_styles(self):
        suggestions = pick_catalog_suggestions(
            audience="men",
            face_shape="oval",
            hair_type="medium",
            age_group="mature",
        )
        self.assertEqual(len(suggestions), 3)
        slugs = {item["seed"] for item in suggestions}
        self.assertTrue(slugs <= OLD_MONEY_SLUGS)

    def test_catalog_filters_by_age_group(self):
        mature = get_published_catalog("men", "mature")
        slugs = {item["slug"] for item in mature}
        self.assertIn("old-money-loose-curl", slugs)
        self.assertEqual(len(slugs), 5)

    def test_score_prefers_face_and_length_match(self):
        catalog = get_published_catalog("men")
        loose = next(s for s in catalog if s["slug"] == "old-money-loose-curl")
        soft = next(s for s in catalog if s["slug"] == "old-money-soft-wave")
        medium_oval = score_hairstyle(loose, "oval", "medium")
        soft_oval = score_hairstyle(soft, "oval", "medium")
        # loose oval+square+round, soft oval+square — bir xil oval+medium score
        self.assertEqual(medium_oval, soft_oval)


class TrendingStylesTests(TestCase):
    def test_trending_empty_without_ready_assets(self):
        trending = pick_trending_styles(
            audience="men",
            face_shape="oval",
            hair_type="medium",
            preferred_persona_id="irland",
            limit=3,
        )
        # PERSONA_READY_ASSETS da style yo'q — trending persona rasmlarisiz yoki bo'sh.
        self.assertIsInstance(trending, list)

    def test_trending_returns_unique_styles(self):
        trending = pick_trending_styles(
            audience="men",
            face_shape="oval",
            hair_type="medium",
            limit=4,
        )
        slugs = [item["seed"] for item in trending]
        self.assertEqual(len(slugs), len(set(slugs)))

    def test_trending_women_empty_without_assets(self):
        trending = pick_trending_styles(
            audience="women",
            face_shape="oval",
            hair_type="medium",
            limit=6,
        )
        self.assertEqual(trending, [])


class GenderGuardTests(SimpleTestCase):
    def test_blocks_male_profile_with_female_photo(self):
        with self.assertRaises(AiStyleError) as ctx:
            assert_gender_matches_profile("men", "female", 0.9)
        self.assertEqual(ctx.exception.status, 422)

    def test_allows_unclear_gender(self):
        assert_gender_matches_profile("men", "unclear", 0.2)


class GenderGuardIntegrationTests(TestCase):
    def test_build_suggestions_for_women_empty_catalog(self):
        _, suggestions = build_suggestions_from_analysis(
            request_audience="women",
            analysis={
                "face_shape": "round",
                "hair_type": "medium",
                "detected_gender": "female",
                "gender_confidence": 0.88,
            },
        )
        self.assertEqual(suggestions, [])

    def test_build_suggestions_respects_age_group(self):
        _, teen = build_suggestions_from_analysis(
            request_audience="men",
            analysis={
                "face_shape": "oval",
                "hair_type": "medium",
                "detected_gender": "male",
                "gender_confidence": 0.9,
            },
            age_group="teen",
        )
        slugs = {item["seed"] for item in teen}
        self.assertTrue(slugs <= OLD_MONEY_SLUGS)
