from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from salons.models import Salon

User = get_user_model()


def _user_token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


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
        self.user = User.objects.create_user(
            username="901111222@phone.mysaloon.local",
            email="901111222@phone.mysaloon.local",
            phone="+998901111222",
            password="unused",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_user_token(self.user)}")
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
            "detected_gender": "male",
            "gender_confidence": 0.92,
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
        self.assertTrue(body["suggestions"][0]["id"].startswith("men-"))
        self.assertIn("image_url", body["suggestions"][0])
        self.assertEqual(body["suggestions"][0]["salon_name"], "Test Salon")

    @patch("ai.views.analyze_style_from_data_url")
    def test_style_analyze_blocks_gender_mismatch(self, mock_analyze):
        mock_analyze.return_value = {
            "face_shape": "oval",
            "hair_type": "medium",
            "summary_uz": "Ayol yuzi.",
            "detected_gender": "female",
            "gender_confidence": 0.95,
        }
        res = self.client.post(
            "/api/v1/ai/style-analyze/",
            {"image": self.tiny_png, "audience": "men"},
            format="json",
        )
        self.assertEqual(res.status_code, 422)
        self.assertIn("Erkak", res.json()["detail"])

    def test_style_analyze_requires_auth(self):
        client = APIClient()
        res = client.post(
            "/api/v1/ai/style-analyze/",
            {"image": self.tiny_png, "audience": "men"},
            format="json",
        )
        self.assertIn(res.status_code, (401, 403))

    def test_style_analyze_requires_image(self):
        res = self.client.post("/api/v1/ai/style-analyze/", {"audience": "men"}, format="json")
        self.assertEqual(res.status_code, 400)

    @override_settings(GEMINI_API_KEY="")
    def test_style_analyze_without_api_key(self):
        from ai.services.gemini_style import AiStyleError, analyze_style_from_data_url

        with self.assertRaises(AiStyleError) as ctx:
            analyze_style_from_data_url(self.tiny_png, "men")
        self.assertEqual(ctx.exception.status, 503)

    @patch("ai.views.check_face_in_data_url", return_value=False)
    def test_face_check_rejects_non_face(self, _mock_check):
        res = self.client.post(
            "/api/v1/ai/face-check/",
            {"image": self.tiny_png},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json()["has_face"])
        self.assertIn("yuz", res.json()["detail"].lower())

    @patch("ai.views.check_face_in_data_url", return_value=True)
    def test_face_check_accepts_face(self, _mock_check):
        res = self.client.post(
            "/api/v1/ai/face-check/",
            {"image": self.tiny_png},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["has_face"])


class HairstyleApiTests(TestCase):
    def test_hairstyles_list_returns_seed_catalog(self):
        res = self.client.get("/api/v1/hairstyles/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body), 24)
        self.assertEqual(body[0]["id"], "men-mid-fade")
        self.assertIn("image_url", body[0])

    def test_hairstyles_list_filters_audience(self):
        res = self.client.get("/api/v1/hairstyles/", {"audience": "women"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body), 12)
        self.assertTrue(all(item["audience"] == "women" for item in body))

    def test_hairstyles_detail(self):
        res = self.client.get("/api/v1/hairstyles/men-mid-fade/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["slug"], "mid-fade")

    def test_hairstyles_detail_not_found(self):
        res = self.client.get("/api/v1/hairstyles/missing-style/")
        self.assertEqual(res.status_code, 404)


@override_settings(
    GEMINI_API_KEY="test-key",
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "ai-history-tests",
        }
    },
)
class AiStyleHistoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username="901222333@phone.mysaloon.local",
            email="901222333@phone.mysaloon.local",
            phone="+998901222333",
            password="unused",
        )
        self.user_b = User.objects.create_user(
            username="901333444@phone.mysaloon.local",
            email="901333444@phone.mysaloon.local",
            phone="+998901333444",
            password="unused",
        )
        self.tiny_png = (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )

    def test_history_create_and_list_scoped_to_user(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_user_token(self.user_a)}")
        create = self.client.post(
            "/api/v1/ai/style-history/",
            {"image": self.tiny_png, "source": "gallery"},
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        self.assertTrue(create.json()["photo_url"])

        listed = self.client.get("/api/v1/ai/style-history/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.json()), 1)
        self.assertEqual(listed.json()[0]["source"], "gallery")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_user_token(self.user_b)}")
        other = self.client.get("/api/v1/ai/style-history/")
        self.assertEqual(other.status_code, 200)
        self.assertEqual(other.json(), [])

    def test_history_replace_latest_updates_metadata(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_user_token(self.user_a)}")
        self.client.post(
            "/api/v1/ai/style-history/",
            {"image": self.tiny_png, "source": "gallery"},
            format="json",
        )
        updated = self.client.post(
            "/api/v1/ai/style-history/",
            {
                "replace_latest": True,
                "source": "ai_analysis",
                "face_shape_key": "oval",
                "hair_type_key": "short",
            },
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        body = updated.json()
        self.assertEqual(body["source"], "ai_analysis")
        self.assertEqual(body["face_shape_key"], "oval")
        self.assertEqual(body["hair_type_key"], "short")

        listed = self.client.get("/api/v1/ai/style-history/")
        self.assertEqual(len(listed.json()), 1)

    def test_history_requires_auth(self):
        res = APIClient().get("/api/v1/ai/style-history/")
        self.assertIn(res.status_code, (401, 403))
