from django.test import SimpleTestCase, TestCase

from ai.age_groups import age_to_group, birth_year_to_group, resolve_hairstyle_image_path
from ai.hairstyle_catalog import get_published_catalog, pick_catalog_suggestions, score_hairstyle
from ai.services.gemini_style import AiStyleError
from ai.style_recommend import assert_gender_matches_profile, build_suggestions_from_analysis


class AgeGroupTests(SimpleTestCase):
    def test_age_to_group(self):
        self.assertEqual(age_to_group(11), "kids")
        self.assertEqual(age_to_group(15), "teen")
        self.assertEqual(age_to_group(25), "young")
        self.assertEqual(age_to_group(35), "adult")
        self.assertEqual(age_to_group(50), "mature")

    def test_image_path_for_adult(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/mid-fade.webp",
            slug="mid-fade",
            audience="men",
            age_group="adult",
        )
        self.assertEqual(path, "/hairstyles/men/adult/mid-fade.webp")

    def test_image_path_for_young_uses_legacy(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/mid-fade.webp",
            slug="mid-fade",
            audience="men",
            age_group="young",
        )
        self.assertEqual(path, "/hairstyles/men/mid-fade.webp")

    def test_persona_evro_ready_asset(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/mid-fade.webp",
            slug="mid-fade",
            audience="men",
            age_group="young",
            persona_id="evro",
        )
        self.assertEqual(path, "/hairstyles/men/personas/evro/mid-fade.webp")

    def test_persona_irland_ready_asset(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/mid-fade.webp",
            slug="mid-fade",
            audience="men",
            age_group="young",
            persona_id="irland",
        )
        self.assertEqual(path, "/hairstyles/men/personas/irland/mid-fade.webp")

    def test_persona_evro_missing_slug_falls_back(self):
        path = resolve_hairstyle_image_path(
            image_path="/hairstyles/men/low-fade.webp",
            slug="low-fade",
            audience="men",
            age_group="young",
            persona_id="evro",
        )
        self.assertEqual(path, "/hairstyles/men/low-fade.webp")


class HairstyleCatalogTests(TestCase):
    def test_pick_men_short_oval_styles(self):
        suggestions = pick_catalog_suggestions(
            audience="men",
            face_shape="oval",
            hair_type="short",
        )
        self.assertEqual(len(suggestions), 3)
        self.assertTrue(all(item["id"].startswith("men-") for item in suggestions))
        self.assertEqual(suggestions[0]["match"], 94)

    def test_pick_mature_men_prefers_classic_styles(self):
        suggestions = pick_catalog_suggestions(
            audience="men",
            face_shape="oval",
            hair_type="short",
            age_group="mature",
        )
        self.assertEqual(len(suggestions), 3)
        slugs = {item["seed"] for item in suggestions}
        self.assertTrue(slugs & {"buzz-cut", "low-fade", "side-part"})

    def test_catalog_filters_by_age_group(self):
        mature = get_published_catalog("men", "mature")
        slugs = {item["slug"] for item in mature}
        self.assertNotIn("modern-mullet", slugs)
        self.assertIn("side-part", slugs)

    def test_score_prefers_face_and_length_match(self):
        catalog = get_published_catalog("men")
        mid_fade = next(s for s in catalog if s["slug"] == "mid-fade")
        pompadour = next(s for s in catalog if s["slug"] == "pompadour")
        short_oval = score_hairstyle(mid_fade, "oval", "short")
        medium_oval = score_hairstyle(pompadour, "oval", "short")
        self.assertGreater(short_oval, medium_oval)


class GenderGuardTests(SimpleTestCase):
    def test_blocks_male_profile_with_female_photo(self):
        with self.assertRaises(AiStyleError) as ctx:
            assert_gender_matches_profile("men", "female", 0.9)
        self.assertEqual(ctx.exception.status, 422)

    def test_allows_unclear_gender(self):
        assert_gender_matches_profile("men", "unclear", 0.2)


class GenderGuardIntegrationTests(TestCase):
    def test_build_suggestions_for_women(self):
        _, suggestions = build_suggestions_from_analysis(
            request_audience="women",
            analysis={
                "face_shape": "round",
                "hair_type": "medium",
                "detected_gender": "female",
                "gender_confidence": 0.88,
            },
        )
        self.assertEqual(len(suggestions), 3)
        self.assertTrue(suggestions[0]["id"].startswith("women-"))

    def test_build_suggestions_respects_age_group(self):
        _, teen = build_suggestions_from_analysis(
            request_audience="men",
            analysis={
                "face_shape": "oval",
                "hair_type": "short",
                "detected_gender": "male",
                "gender_confidence": 0.9,
            },
            age_group="teen",
        )
        _, mature = build_suggestions_from_analysis(
            request_audience="men",
            analysis={
                "face_shape": "oval",
                "hair_type": "short",
                "detected_gender": "male",
                "gender_confidence": 0.9,
            },
            age_group="mature",
        )
        self.assertNotEqual({s["seed"] for s in teen}, {s["seed"] for s in mature})
