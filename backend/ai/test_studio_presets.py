from django.test import SimpleTestCase

from ai.studio_presets import get_studio_option, list_studio_catalog


class StudioPresetsTests(SimpleTestCase):
    def test_catalog_has_core_categories(self):
        cats = {c["id"] for c in list_studio_catalog()}
        self.assertIn("hair_color", cats)
        self.assertIn("hair_style", cats)
        self.assertIn("skin_tone", cats)
        self.assertIn("beard", cats)
        self.assertIn("look", cats)

    def test_get_option(self):
        opt = get_studio_option("hair_blonde")
        self.assertIsNotNone(opt)
        assert opt is not None
        self.assertEqual(opt["id"], "hair_blonde")
        self.assertIn("instruction", opt)

    def test_unknown_option(self):
        self.assertIsNone(get_studio_option("nope"))
