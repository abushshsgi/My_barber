from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from content_seo.models import SeoArticle


class SeoArticlePublicationTests(APITestCase):
    def setUp(self):
        self.draft, _ = SeoArticle.objects.update_or_create(
            slug="virtual-soch-turmagini-sinab-korish",
            locale="uz",
            defaults={
                "title": "Draft",
                "status": SeoArticle.Status.DRAFT,
                "published_at": None,
            },
        )

    def test_public_detail_hides_draft(self):
        res = self.client.get("/api/v1/content/articles/virtual-soch-turmagini-sinab-korish/")
        self.assertEqual(res.status_code, 404)

    def test_preview_flag_is_off_by_default(self):
        res = self.client.get(
            "/api/v1/content/articles/virtual-soch-turmagini-sinab-korish/?preview=1"
        )
        self.assertEqual(res.status_code, 404)

    @override_settings(CONTENT_DRAFT_PREVIEW=True)
    def test_preview_returns_draft_only_when_enabled(self):
        res = self.client.get(
            "/api/v1/content/articles/virtual-soch-turmagini-sinab-korish/?preview=1"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "draft")
        self.assertEqual(res.json()["published_locales"], [])

    def test_published_locale_is_listed_and_draft_translation_is_not(self):
        SeoArticle.objects.update_or_create(
            slug="virtual-soch-turmagini-sinab-korish",
            locale="en",
            defaults={
                "title": "Live",
                "status": SeoArticle.Status.PUBLISHED,
                "published_at": timezone.now(),
            },
        )
        SeoArticle.objects.update_or_create(
            slug="virtual-soch-turmagini-sinab-korish",
            locale="ru",
            defaults={
                "title": "Draft ru",
                "status": SeoArticle.Status.DRAFT,
                "published_at": None,
            },
        )
        res = self.client.get(
            "/api/v1/content/articles/virtual-soch-turmagini-sinab-korish/?locale=en"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["published_locales"], ["en"])
        listed = self.client.get("/api/v1/content/articles/?locale=ru")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json(), [])
