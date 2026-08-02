from io import BytesIO
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from ai.services.gemini_studio_edit import _nearest_aspect_ratio
from ai.studio_presets import get_studio_option, list_studio_catalog

_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)


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
        self.assertIn("PIXEL LOCK", opt["instruction"])

    def test_finish_wet(self):
        opt = get_studio_option("finish_wet")
        self.assertIsNotNone(opt)
        assert opt is not None
        self.assertEqual(opt["category_id"], "finish")

    def test_unknown_option(self):
        self.assertIsNone(get_studio_option("nope"))
        self.assertIsNone(get_studio_option("skin_lighter"))

    def test_nearest_aspect_ratio(self):
        self.assertEqual(_nearest_aspect_ratio(768, 1024), "3:4")
        self.assertEqual(_nearest_aspect_ratio(1024, 1024), "1:1")
        self.assertEqual(_nearest_aspect_ratio(1920, 1080), "16:9")


class StudioImageSourceTests(SimpleTestCase):
    def test_load_image_bytes_accepts_media_path(self):
        from ai.services.gemini_style import load_image_bytes

        storage = MagicMock()
        storage.exists.return_value = True
        storage.open.return_value = BytesIO(_TINY_PNG)

        with patch("django.core.files.storage.default_storage", storage):
            mime, raw = load_image_bytes("/media/ai-style/generations/2026/08/after.jpg")

        self.assertEqual(mime, "image/png")
        self.assertTrue(raw.startswith(b"\x89PNG"))
        storage.exists.assert_called_once_with("ai-style/generations/2026/08/after.jpg")
