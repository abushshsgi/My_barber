"""Public agent-code-check for partner signup QR / manual entry."""

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from agents.models import FieldAgent
from agents.referral import ensure_agent_code


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_THROTTLE_RATES": {
            "barber_check": "10000/minute",
            "anon": "10000/minute",
            "user": "10000/minute",
        }
    }
)
class AgentCodeCheckTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.agent = FieldAgent.objects.create(
            email="agent-check@test.uz",
            full_name="Aziz Agent",
            code="",
            is_active=True,
        )
        self.agent.set_password("pass12345")
        self.agent.save(update_fields=["password"])
        ensure_agent_code(self.agent)

    def test_valid_code(self):
        res = self.client.get("/api/v1/auth/agent-code-check/", {"code": self.agent.code})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["valid"])
        self.assertEqual(res.data["code"], self.agent.code)
        self.assertEqual(res.data["agent_label"], "Aziz")

    def test_invalid_code(self):
        res = self.client.get("/api/v1/auth/agent-code-check/", {"code": "ABCD2345"})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["valid"])

    def test_inactive_agent_rejected(self):
        self.agent.is_active = False
        self.agent.save(update_fields=["is_active"])
        res = self.client.get("/api/v1/auth/agent-code-check/", {"code": self.agent.code})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["valid"])

    def test_short_code(self):
        res = self.client.get("/api/v1/auth/agent-code-check/", {"code": "ABC"})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["valid"])
