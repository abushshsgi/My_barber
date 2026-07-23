from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from ai.services.gemini_tryon import load_public_image
from ai.services.gemini_style import AiStyleError, parse_data_url
from ai.style_prompts import style_detail_for


class StylePromptTests(SimpleTestCase):
    def test_men_style_detail(self):
        self.assertIn("buzz cut", style_detail_for("men", "buzz-cut").lower())

    def test_women_style_detail_fallback(self):
        self.assertEqual(style_detail_for("women", "unknown"), "unknown")


@override_settings(GEMINI_API_KEY="", VERTEX_PROJECT_ID="")
class TryOnServiceTests(SimpleTestCase):
    def test_requires_image_config(self):
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
        with override_settings(GEMINI_API_KEY="test-studio-key"):
            result = generate_tryon_preview(
                selfie_data_url=(
                    "data:image/png;base64,"
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                ),
                audience="men",
                slug="mid-fade",
                title="Mid Fade",
            )
        self.assertTrue(result.preview_image.startswith("data:image/png;base64,"))
        mock_vertex.assert_called_once()
        self.assertTrue(result.prompt)
        self.assertGreaterEqual(result.total_tokens, 0)

class PublicImageLoaderTests(SimpleTestCase):
    def test_missing_file_returns_none(self):
        self.assertIsNone(load_public_image("/hairstyles/men/not-real.webp"))


class VertexImageEndpointTests(SimpleTestCase):
    def test_global_image_endpoint_url(self):
        from ai.services.vertex_client import build_vertex_generate_url

        with override_settings(VERTEX_PROJECT_ID="my-project"):
            url = build_vertex_generate_url(
                "gemini-3.1-flash-lite-image",
                location="global",
            )
        self.assertEqual(
            url,
            "https://aiplatform.googleapis.com/v1/projects/my-project/locations/global/"
            "publishers/google/models/gemini-3.1-flash-lite-image:generateContent",
        )
        self.assertNotIn("global-aiplatform", url)


class ImageProviderPriorityTests(SimpleTestCase):
    @patch("ai.services.vertex_auth.vertex_image_configured", return_value=True)
    def test_provider_prefers_vertex(self, _vertex):
        from ai.services.studio_image import image_generation_provider

        with override_settings(GEMINI_API_KEY="studio-key"):
            self.assertEqual(image_generation_provider(), "vertex")

    @patch("ai.services.vertex_auth.vertex_image_configured", return_value=False)
    def test_provider_falls_back_to_studio(self, _vertex):
        from ai.services.studio_image import image_generation_provider

        with override_settings(GEMINI_API_KEY="studio-key"):
            self.assertEqual(image_generation_provider(), "studio")

    @patch("ai.services.vertex_image.studio_generate_image_content")
    @patch("ai.services.vertex_image._generate_via_vertex")
    @patch("ai.services.vertex_image.vertex_credentials_configured", return_value=True)
    def test_generate_uses_vertex_first(self, _creds, mock_vertex, mock_studio):
        from ai.services.vertex_image import generate_image_content

        mock_vertex.return_value = {"ok": True}
        out = generate_image_content({"contents": []})
        self.assertEqual(out, {"ok": True})
        mock_vertex.assert_called_once()
        mock_studio.assert_not_called()

    @patch("ai.services.vertex_image.studio_generate_image_content")
    @patch("ai.services.vertex_image._generate_via_vertex")
    @patch("ai.services.vertex_image.studio_image_configured", return_value=True)
    @patch("ai.services.vertex_image.vertex_credentials_configured", return_value=True)
    def test_generate_falls_back_to_studio_on_429(self, _creds, _studio_cfg, mock_vertex, mock_studio):
        from ai.services.gemini_style import AiStyleError
        from ai.services.vertex_image import generate_image_content

        mock_vertex.side_effect = AiStyleError("limit", 429)
        mock_studio.return_value = {"from": "studio"}
        out = generate_image_content({"contents": []})
        self.assertEqual(out, {"from": "studio"})
        mock_studio.assert_called_once()
