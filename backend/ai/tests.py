from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from salons.models import Salon


@override_settings(
    GEMINI_API_KEY="test-key",
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "ai-tests",
        }
    },
)
class AiStyleAnalyzeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tiny_png = (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )

    @patch("ai.views.analyze_style_from_data_url")
    def test_style_analyze_returns_suggestions(self, mock_analyze):
        Salon.objects.create(
            name="Test Salon",
            latitude="41.2995",
            longitude="69.2401",
            is_published=True,
        )
        mock_analyze.return_value = {
            "face_shape": "oval",
            "hair_type": "short",
            "summary_uz": "Oval yuzga qisqa kesim mos.",
            "suggestions": [
                {
                    "id": "ai-1",
                    "title": "Mid Fade",
                    "match": 92,
                    "reason_uz": "Yuz konturini yumshatadi.",
                    "category": "barber",
                    "seed": "ai1",
                },
                {
                    "id": "ai-2",
                    "title": "Crop",
                    "match": 88,
                    "reason_uz": "Zamonaviy ko'rinish.",
                    "category": "barber",
                    "seed": "ai2",
                },
                {
                    "id": "ai-3",
                    "title": "Buzz",
                    "match": 84,
                    "reason_uz": "Minimal parvarish.",
                    "category": "barber",
                    "seed": "ai3",
                },
            ],
        }
        res = self.client.post(
            "/api/v1/ai/style-analyze/",
            {"image": self.tiny_png, "audience": "men"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["face_shape"], "oval")
        self.assertEqual(len(body["suggestions"]), 3)
        self.assertEqual(body["suggestions"][0]["salon_name"], "Test Salon")

    def test_style_analyze_requires_image(self):
        res = self.client.post("/api/v1/ai/style-analyze/", {"audience": "men"}, format="json")
        self.assertEqual(res.status_code, 400)

    @override_settings(GEMINI_API_KEY="")
    def test_style_analyze_without_api_key(self):
        from ai.services.gemini_style import AiStyleError, analyze_style_from_data_url

        with self.assertRaises(AiStyleError) as ctx:
            analyze_style_from_data_url(self.tiny_png, "men")
        self.assertEqual(ctx.exception.status, 503)
