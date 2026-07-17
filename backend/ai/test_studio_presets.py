from django.test import SimpleTestCase

from ai.studio_presets import get_studio_option, list_studio_catalog


class StudioPresetsTests(SimpleTestCase):
    def test_catalog_has_core_categories(self):
        cats = {c["id"] for c in list_studio_catalog()}
        self.assertEqual(cats, {"hair_color", "beard", "finish"})
        self.assertNotIn("skin_tone", cats)
        self.assertNotIn("hair_style", cats)

    def test_get_option(self):
        opt = get_studio_option("hair_blonde")
        self.assertIsNotNone(opt)
        assert opt is not None
        self.assertEqual(opt["id"], "hair_blonde")
        self.assertIn("instruction", opt)
        self.assertIn("same", opt["instruction"].lower())

    def test_finish_wet(self):
        opt = get_studio_option("finish_wet")
        self.assertIsNotNone(opt)
        assert opt is not None
        self.assertEqual(opt["category_id"], "finish")

    def test_unknown_option(self):
        self.assertIsNone(get_studio_option("nope"))
        self.assertIsNone(get_studio_option("skin_lighter"))
