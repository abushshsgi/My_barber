from django.test import SimpleTestCase

from ai.explore_personas import MEN_CATALOG_STYLE_SLUGS, NIKI_READY_SLUGS, persona_static_extra_views


class NikiPersonaViewsTests(SimpleTestCase):
    def test_new_styles_have_no_static_extra_views_until_publish(self):
        for slug in MEN_CATALOG_STYLE_SLUGS:
            self.assertEqual(persona_static_extra_views("irland", slug), ())
            self.assertEqual(persona_static_extra_views("niki", slug), ())

    def test_niki_ready_slugs_empty_until_assets(self):
        self.assertEqual(NIKI_READY_SLUGS, frozenset())
