from django.test import SimpleTestCase, TestCase

from ai.age_groups import age_to_group, resolve_hairstyle_image_path
from ai.hairstyle_catalog import get_published_catalog, pick_catalog_suggestions, pick_trending_styles, score_hairstyle
from ai.services.gemini_style import AiStyleError
from ai.style_recommend import assert_gender_matches_profile, build_suggestions_from_analysis

CLASSIC_SLUGS = {
    "mid-fade",
    "low-fade",
    "skin-fade",
    "buzz-cut",
    "textured-crop",
    "pompadour",
    "undercut",
    "side-part",
    "french-crop",
    "slick-back",
    "curly-top-fade",
    "modern-mullet",
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
            image_path="/hairstyles/men/personas/irland/buzz-cut.webp",
            slug="buzz-cut",
            audience="men",
            age_group="adult",
        )
        self.assertEqual(path, "/hairstyles/men/adult/buzz-cut.webp")

    def test_image_path_for_young_uses_legacy(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/personas/irland/buzz-cut.webp",
            slug="buzz-cut",
            audience="men",
            age_group="young",
        )
        self.assertEqual(path, "/hairstyles/men/personas/irland/buzz-cut.webp")

    def test_persona_irland_resolves_ready_asset(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/personas/irland/buzz-cut.webp",
            slug="buzz-cut",
            audience="men",
            age_group="young",
            persona_id="irland",
        )
        self.assertIn("irland/buzz-cut", path)


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
        self.assertTrue({item["seed"] for item in suggestions} <= CLASSIC_SLUGS)

    def test_pick_mature_men_prefers_catalog_styles(self):
        suggestions = pick_catalog_suggestions(
            audience="men",
            face_shape="oval",
            hair_type="medium",
            age_group="mature",
        )
        self.assertEqual(len(suggestions), 3)
        slugs = {item["seed"] for item in suggestions}
        self.assertTrue(slugs <= CLASSIC_SLUGS)

    def test_catalog_filters_by_age_group(self):
        mature = get_published_catalog("men", "mature")
        slugs = {item["slug"] for item in mature}
        self.assertIn("buzz-cut", slugs)
        self.assertIn("low-fade", slugs)
        self.assertEqual(len(slugs), 4)

    def test_score_prefers_face_and_length_match(self):
        catalog = get_published_catalog("men")
        buzz = next(s for s in catalog if s["slug"] == "buzz-cut")
        french = next(s for s in catalog if s["slug"] == "french-crop")
        short_oval = score_hairstyle(buzz, "oval", "short")
        french_oval = score_hairstyle(french, "oval", "short")
        self.assertGreaterEqual(short_oval, french_oval)


class TrendingStylesTests(TestCase):
    def test_trending_irland_uses_persona_images(self):
        trending = pick_trending_styles(
            audience="men",
            face_shape="oval",
            hair_type="medium",
            preferred_persona_id="irland",
            limit=3,
        )
        self.assertEqual(len(trending), 3)
        irland_rows = [item for item in trending if item.get("persona_id") == "irland"]
        self.assertTrue(irland_rows)
        self.assertTrue(all("irland" in (item.get("image_url") or "") for item in irland_rows))

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
        self.assertTrue(slugs <= CLASSIC_SLUGS)
