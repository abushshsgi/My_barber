from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from ai.services.gemini_tryon import load_public_image
from ai.services.gemini_style import AiStyleError, parse_data_url
from ai.style_prompts import style_detail_for


class StylePromptTests(SimpleTestCase):
    def test_men_style_detail(self):
        self.assertIn("fade", style_detail_for("men", "mid-fade"))

    def test_women_style_detail_fallback(self):
        self.assertEqual(style_detail_for("women", "unknown"), "unknown")


@override_settings(GEMINI_API_KEY="")
class TryOnServiceTests(SimpleTestCase):
    def test_requires_api_key(self):
        from ai.services.gemini_tryon import generate_tryon_preview

        tiny = (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        with self.assertRaises(AiStyleError) as ctx:
            generate_tryon_preview(
                selfie_data_url=tiny,
                audience="men",
                slug="mid-fade",
                title="Mid Fade",
            )
        self.assertEqual(ctx.exception.status, 503)

    def test_parse_data_url(self):
        mime, raw = parse_data_url(
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        self.assertEqual(mime, "image/png")
        self.assertTrue(raw)

    @patch("ai.services.gemini_tryon._post_gemini_image")
    def test_generate_tryon_success(self, mock_post):
        from ai.services.gemini_tryon import generate_tryon_preview

        fake_png = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        mock_post.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"inlineData": {"mimeType": "image/png", "data": fake_png}},
                        ]
                    }
                }
            ]
        }
        with override_settings(GEMINI_API_KEY="test-key", AI_IMAGE_PROVIDER="gemini"):
            result = generate_tryon_preview(
                selfie_data_url=(
                    "data:image/png;base64,"
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                ),
                audience="men",
                slug="mid-fade",
                title="Mid Fade",
            )
        self.assertTrue(result.startswith("data:image/png;base64,"))

    @patch("ai.services.gemini_tryon.generate_image_content")
    def test_generate_tryon_vertex(self, mock_vertex):
        from ai.services.gemini_tryon import generate_tryon_preview

        fake_png = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        mock_vertex.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"inlineData": {"mimeType": "image/png", "data": fake_png}},
                        ]
                    }
                }
            ]
        }
        with override_settings(
            AI_IMAGE_PROVIDER="vertex",
            VERTEX_PROJECT_ID="test-project",
            VERTEX_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"test"}',
        ):
            result = generate_tryon_preview(
                selfie_data_url=(
                    "data:image/png;base64,"
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                ),
                audience="men",
                slug="mid-fade",
                title="Mid Fade",
            )
        self.assertTrue(result.startswith("data:image/png;base64,"))
        mock_vertex.assert_called_once()


class PublicImageLoaderTests(SimpleTestCase):
    def test_missing_file_returns_none(self):
        self.assertIsNone(load_public_image("/hairstyles/men/not-real.webp"))
