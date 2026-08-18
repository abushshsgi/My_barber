from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from ai.models import MorphAiChatThread, MorphAiUserPrefs
from ai.privacy_prefs import user_allows_chat_persist, user_allows_look_persist

User = get_user_model()


def _user_token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "ai-privacy-tests",
        }
    },
)
class MorphAiPrivacyApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="901555666@phone.mysaloon.local",
            email="901555666@phone.mysaloon.local",
            phone="+998901555666",
            password="unused",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_user_token(self.user)}")

    def test_privacy_get_creates_prefs_and_counts(self):
        res = self.client.get("/api/v1/ai/privacy/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn("prefs", body)
        self.assertFalse(body["prefs"]["privacy_local_only"])
        self.assertTrue(body["prefs"]["persist_looks"])
        self.assertEqual(body["data"]["chat_threads"], 0)
        self.assertEqual(body["limits"]["token_limit"], 10000)
        self.assertEqual(body["limits"]["daily_limit"], 10000)
        self.assertTrue(MorphAiUserPrefs.objects.filter(user=self.user).exists())

    def test_privacy_patch_local_only_wipes_chat_threads(self):
        MorphAiChatThread.objects.create(user=self.user, client_id="t1", title="Hello")
        res = self.client.patch(
            "/api/v1/ai/privacy/",
            {"privacy_local_only": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["prefs"]["privacy_local_only"])
        self.assertEqual(body["data"]["chat_threads"], 0)
        self.assertFalse(user_allows_chat_persist(self.user))

    def test_thread_put_blocked_when_privacy_on(self):
        self.client.patch("/api/v1/ai/privacy/", {"privacy_local_only": True}, format="json")
        res = self.client.put(
            "/api/v1/ai/chat/threads/",
            {"id": "local-1", "title": "x", "messages": [{"role": "user", "content": "hi"}]},
            format="json",
        )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "privacy_local_only")

    def test_generation_post_skipped_when_persist_looks_off(self):
        self.client.patch("/api/v1/ai/privacy/", {"persist_looks": False}, format="json")
        self.assertFalse(user_allows_look_persist(self.user))
        res = self.client.post(
            "/api/v1/ai/generations/",
            {"after_image": "data:image/png;base64,aaaa", "title": "x"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["stored"])

    def test_privacy_data_delete_all(self):
        MorphAiChatThread.objects.create(user=self.user, client_id="t2", title="Bye")
        res = self.client.delete("/api/v1/ai/privacy/data/", {"kind": "all"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["deleted"]["chats"], 1)

    def test_chat_limits_endpoint(self):
        res = self.client.get("/api/v1/ai/chat/limits/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["daily_used"], 0)
        self.assertEqual(body["token_limit"], 10000)
        self.assertEqual(body["daily_remaining"], 10000)
