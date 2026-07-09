from django.test import SimpleTestCase

from ai.services.explore_image_gen import (
    _build_view_rotation_prompt,
    _collect_view_rotation_anchors,
    _style_side_consistency_hint,
    generate_explore_asset,
)
from ai.services.errors import AiStyleError


class ExploreImageGenPromptTests(SimpleTestCase):
    def test_niki_right_prompt_mentions_light_stubble_not_full_beard(self):
        prompt = _build_view_rotation_prompt(
            persona_id="niki",
            slug="mid-fade",
            view="right",
            anchor_views=("front", "left", "reference"),
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

    def test_collect_anchors_empty_without_front(self):
        anchors = _collect_view_rotation_anchors(
            persona_id="niki",
            slug="mid-fade",
            target_view="right",
        )
        self.assertEqual(anchors, [])

    def test_alt_view_without_front_raises_clear_error(self):
        with self.assertRaises(AiStyleError) as ctx:
            generate_explore_asset(persona_id="niki", slug="mid-fade", view="right", force=True)
        self.assertIn("OLD (front)", ctx.exception.message)
        self.assertIn("reference yetarli emas", ctx.exception.message)
