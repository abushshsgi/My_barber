import os
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.google_auth import GoogleProfile
from accounts.models import User


@patch.dict(os.environ, {"GOOGLE_OAUTH_CLIENT_ID": "web-client.apps.googleusercontent.com"})
class GoogleLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch.dict(os.environ, {"GOOGLE_OAUTH_CLIENT_ID": ""})
    def test_not_configured_returns_503(self):
        res = self.client.post(
            "/api/v1/auth/google/",
            {"id_token": "token"},
            format="json",
        )
        self.assertEqual(res.status_code, 503)

    @patch("accounts.views_google_auth.verify_google_id_token")
    def test_google_login_creates_user(self, mock_verify):
        mock_verify.return_value = GoogleProfile(
            sub="google-sub-1",
            email="user@gmail.com",
            email_verified=True,
            full_name="Test User",
            first_name="Test",
            last_name="User",
        )
        res = self.client.post(
            "/api/v1/auth/google/",
            {"id_token": "valid-token"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["access"])
        self.assertTrue(body["refresh"])
        self.assertTrue(body["is_new_user"])
        user = User.objects.get(email="user@gmail.com")
        self.assertEqual(user.google_sub, "google-sub-1")
        self.assertIsNotNone(user.email_verified_at)

    @patch("accounts.views_google_auth.verify_google_id_token")
    def test_google_login_existing_user(self, mock_verify):
        User.objects.create(
            username="user@gmail.com",
            email="user@gmail.com",
            google_sub="google-sub-1",
            password=make_password("x"),
        )
        mock_verify.return_value = GoogleProfile(
            sub="google-sub-1",
            email="user@gmail.com",
            email_verified=True,
            full_name="Test User",
            first_name="Test",
            last_name="User",
        )
        res = self.client.post(
            "/api/v1/auth/google/",
            {"credential": "valid-token"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["is_new_user"])
