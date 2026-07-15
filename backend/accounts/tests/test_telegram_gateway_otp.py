import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.sms_otp import is_sms_provider_configured, otp_delivery_channel


@override_settings(
    CACHES={
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "telegram-otp-tests",
        }
    }
)
class TelegramGatewayOtpTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch.dict(
        "os.environ",
        {"SMS_PROVIDER": "telegram", "TELEGRAM_GATEWAY_TOKEN": "test-token"},
        clear=False,
    )
    def test_send_code_uses_telegram_delivery(self):
        self.assertTrue(is_sms_provider_configured())
        self.assertEqual(otp_delivery_channel(), "telegram")

        class _Resp:
            status = 200

            def read(self):
                return json.dumps({"ok": True, "result": {"request_id": "r1"}}).encode()

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        with patch("urllib.request.urlopen", return_value=_Resp()):
            res = self.client.post(
                "/api/v1/auth/phone/send-code/",
                {"phone": "901990011"},
                format="json",
            )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["delivery"], "telegram")
        self.assertNotIn("debug_code", body)
