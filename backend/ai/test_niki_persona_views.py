from django.test import SimpleTestCase

from ai.explore_personas import NIKI_READY_SLUGS, persona_static_extra_views


class NikiPersonaViewsTests(SimpleTestCase):
    def test_niki_declares_left_right_and_back_for_ready_slugs(self):
        for slug in NIKI_READY_SLUGS:
            self.assertEqual(persona_static_extra_views("niki", slug), ("left", "right", "back"))

    def test_niki_low_fade_not_in_ready_slugs(self):
        self.assertNotIn("low-fade", NIKI_READY_SLUGS)
