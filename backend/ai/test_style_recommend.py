from django.test import SimpleTestCase

from ai.hairstyle_catalog import HAIRSTYLE_CATALOG, pick_catalog_suggestions, score_hairstyle
from ai.services.gemini_style import AiStyleError
from ai.style_recommend import assert_gender_matches_profile, build_suggestions_from_analysis


class HairstyleCatalogTests(SimpleTestCase):
    def test_pick_men_short_oval_styles(self):
        suggestions = pick_catalog_suggestions(
            audience="men",
            face_shape="oval",
            hair_type="short",
        )
        self.assertEqual(len(suggestions), 3)
        self.assertTrue(all(item["id"].startswith("men-") for item in suggestions))
        self.assertEqual(suggestions[0]["match"], 94)

    def test_score_prefers_face_and_length_match(self):
        mid_fade = next(s for s in HAIRSTYLE_CATALOG if s["slug"] == "mid-fade")
        pompadour = next(s for s in HAIRSTYLE_CATALOG if s["slug"] == "pompadour")
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
