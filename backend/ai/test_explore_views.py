from django.test import SimpleTestCase

from ai.explore_views import (
    EXPLORE_VIEW_IDS,
    explore_asset_storage_slug,
    normalize_explore_view,
    parse_storage_slug,
    resolve_style_image_path_with_view,
)


class ExploreViewsTests(SimpleTestCase):
    def test_normalize_aliases(self):
        self.assertEqual(normalize_explore_view("chap"), "left")
        self.assertEqual(normalize_explore_view("orqa"), "back")
        self.assertEqual(normalize_explore_view("old"), "front")

    def test_storage_slug(self):
        self.assertEqual(explore_asset_storage_slug("buzz-cut", "front"), "buzz-cut")
        self.assertEqual(explore_asset_storage_slug("buzz-cut", "left"), "buzz-cut__left")

    def test_parse_storage_slug(self):
        self.assertEqual(parse_storage_slug("buzz-cut__right"), ("buzz-cut", "right"))
        self.assertEqual(parse_storage_slug("reference"), ("reference", "front"))

    def test_resolve_style_path_with_view(self):
        base = "/hairstyles/men/personas/britan/buzz-cut.webp"
        self.assertEqual(
            resolve_style_image_path_with_view(base_path=base, slug="buzz-cut", view="back"),
            "/hairstyles/men/personas/britan/buzz-cut__back.webp",
        )

    def test_four_views(self):
        self.assertEqual(len(EXPLORE_VIEW_IDS), 4)
