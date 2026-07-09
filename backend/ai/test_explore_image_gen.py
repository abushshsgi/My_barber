from unittest.mock import patch

from django.test import SimpleTestCase

from ai.services.explore_image_gen import (
    DEV_EXPLORE_PERSONA_ID,
    DEV_EXPLORE_VIEW,
    _assert_dev_explore_job,
    _build_view_rotation_prompt,
    _collect_view_rotation_anchors,
    _style_side_consistency_hint,
    generate_explore_asset,
    list_explore_gen_jobs,
)
from ai.services.errors import AiStyleError


class ExploreImageGenPromptTests(SimpleTestCase):
    def test_niki_right_prompt_mentions_light_stubble_not_full_beard(self):
        prompt = _build_view_rotation_prompt(
            persona_id="niki",
            slug="mid-fade",
            view="right",
            anchor_views=("front", "left", "back", "reference"),
        )
        self.assertIn("light stubble only", prompt)
        self.assertIn("NOT a full beard", prompt)
        self.assertIn("RIGHT temple taper/fade", prompt)

    def test_fade_style_gets_side_symmetry_hint(self):
        hint = _style_side_consistency_hint(slug="skin-fade", view="right")
        self.assertIn("RIGHT temple", hint)

    def test_non_fade_style_has_no_side_hint(self):
        hint = _style_side_consistency_hint(slug="buzz-cut", view="right")
        self.assertEqual(hint, "")

    def test_rejects_non_niki_persona(self):
        with self.assertRaises(AiStyleError) as ctx:
            _assert_dev_explore_job(persona_id="britan", slug="mid-fade", view="right")
        self.assertIn("faqat Niki", ctx.exception.message)

    def test_rejects_non_right_view(self):
        with self.assertRaises(AiStyleError) as ctx:
            _assert_dev_explore_job(persona_id="niki", slug="mid-fade", view="front")
        self.assertIn("O'ng", ctx.exception.message)

    def test_rejects_low_fade_slug(self):
        with self.assertRaises(AiStyleError):
            _assert_dev_explore_job(persona_id="niki", slug="low-fade", view="right")

    def test_list_jobs_only_niki_right(self):
        jobs = list_explore_gen_jobs()
        self.assertTrue(jobs)
        for job in jobs:
            self.assertEqual(job["persona_id"], DEV_EXPLORE_PERSONA_ID)
            self.assertEqual(job["view"], DEV_EXPLORE_VIEW)
            self.assertNotEqual(job["slug"], "reference")

    def test_niki_mid_fade_collects_explore_anchors_from_public(self):
        anchors = _collect_view_rotation_anchors(
            persona_id="niki",
            slug="mid-fade",
            target_view="right",
        )
        self.assertGreaterEqual(len(anchors), 1)
        self.assertIn("PRIMARY ANCHOR", anchors[0][0])

    def test_missing_explore_front_raises_clear_error(self):
        with patch(
            "ai.services.explore_image_gen._collect_view_rotation_anchors",
            return_value=[],
        ):
            with self.assertRaises(AiStyleError) as ctx:
                generate_explore_asset(
                    persona_id="niki",
                    slug="mid-fade",
                    view="right",
                    force=True,
                )
        self.assertIn("Explore'da", ctx.exception.message)
