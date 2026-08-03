from io import BytesIO
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from ai.services.gemini_studio_edit import _nearest_aspect_ratio
from ai.studio_presets import get_studio_option, list_studio_catalog

# 1x1 red PNG (valid)
_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0"
    b"\x00\x00\x03\x01\x01\x00\xc9\xfe\x92\xef\x00\x00\x00\x00IEND\xaeB`\x82"
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


class StudioResponseCompressTests(SimpleTestCase):
    def test_studio_response_is_jpeg_data_url(self):
        from ai.services.image_response import to_studio_response_data_url

        url = to_studio_response_data_url("image/png", _TINY_PNG)
        self.assertTrue(url.startswith("data:image/jpeg;base64,"))
        self.assertLess(len(url), 20_000)


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


class StudioEditFallbackTests(SimpleTestCase):
    def test_lite_model_skips_image_size_config(self):
        from ai.services.gemini_studio_edit import _studio_generation_configs

        configs = _studio_generation_configs("3:4", model="gemini-3.1-flash-lite-image")
        self.assertEqual(len(configs), 2)
        self.assertNotIn("imageSize", str(configs))
        self.assertEqual(configs[0]["responseModalities"], ["IMAGE"])

    def test_flash_model_uses_1k_not_2k(self):
        from ai.services.gemini_studio_edit import _studio_generation_configs

        configs = _studio_generation_configs("3:4", model="gemini-3.1-flash-image")
        self.assertIn("imageSize", str(configs[0]))
        self.assertEqual(configs[0]["imageConfig"]["imageSize"], "1K")
        self.assertNotIn("2K", str(configs))

    @patch("ai.services.gemini_studio_edit._generate_for_studio_edit")
    @patch("ai.services.gemini_studio_edit.load_image_bytes")
    @patch("ai.services.gemini_studio_edit.vertex_image_configured", return_value=True)
    def test_falls_back_to_lite_model_on_404(self, _cfg, mock_load, mock_gen):
        from ai.services.gemini_style import AiStyleError
        from ai.services.gemini_studio_edit import generate_studio_edit

        mock_load.return_value = ("image/png", _TINY_PNG)
        fake_png_b64 = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        ok_payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"inlineData": {"mimeType": "image/png", "data": fake_png_b64}},
                        ]
                    }
                }
            ]
        }

        def _gen(body, model=None):
            if model and "lite" not in model:
                raise AiStyleError("Rasm modeli topilmadi.", 404)
            return ok_payload, "vertex"

        mock_gen.side_effect = _gen
        with patch(
            "ai.services.gemini_studio_edit.studio_edit_image_model",
            return_value="gemini-3.1-flash-image",
        ), patch(
            "ai.services.gemini_studio_edit.vertex_image_model",
            return_value="gemini-3.1-flash-lite-image",
        ):
            result = generate_studio_edit(
                image_data_url="data:image/png;base64," + fake_png_b64,
                preset_id="beard_clean",
            )

        self.assertTrue(result.preview_image.startswith("data:image/jpeg;base64,"))
        self.assertEqual(result.model, "gemini-3.1-flash-lite-image")
        used_models = [call.kwargs.get("model") for call in mock_gen.call_args_list]
        self.assertTrue(any(m and "flash-image" in m for m in used_models))
        self.assertIn("gemini-3.1-flash-lite-image", used_models)

    def test_flash_models_before_lite(self):
        from ai.services.gemini_studio_edit import _studio_models_to_try

        with patch(
            "ai.services.gemini_studio_edit.studio_edit_image_model",
            return_value="gemini-3.1-flash-image",
        ), patch(
            "ai.services.gemini_studio_edit.vertex_image_model",
            return_value="gemini-3.1-flash-lite-image",
        ):
            models = _studio_models_to_try()
        self.assertEqual(models[0], "gemini-3.1-flash-image")
        self.assertIn("gemini-2.5-flash-image", models)
        self.assertNotIn("gemini-3-pro-image", models)
        self.assertTrue(any("lite" in m for m in models))
        self.assertGreater(models.index("gemini-3.1-flash-lite-image"), 0)
