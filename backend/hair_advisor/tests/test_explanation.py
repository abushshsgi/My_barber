from unittest.mock import patch

from django.test import SimpleTestCase

from hair_advisor.services.explanation import _deterministic_fallback, explain_analysis_uz


class ExplanationTests(SimpleTestCase):
    def test_deterministic_fallback_insufficient(self):
        out = _deterministic_fallback({"recommendation": "INSUFFICIENT_DATA", "flags": []})
        self.assertIn("explanation_uz", out)
        self.assertEqual(out["provider"], "deterministic")

    @patch("hair_advisor.services.explanation.gemini_explain_json")
    def test_gemini_success(self, mock_gemini):
        mock_gemini.return_value = (
            {
                "explanation_uz": "Test tushuntirish.",
                "summary_bullets_uz": ["Band 1"],
                "cautions_uz": [],
            },
            {"model": "test", "latency_ms": 10, "prompt_tokens": 1, "candidates_tokens": 1},
        )
        payload, usage = explain_analysis_uz(
            "Shampoo",
            "Brand",
            {"recommendation": "POTENTIAL_MATCH", "key_ingredients": []},
            "Hair condition: Normal",
        )
        self.assertEqual(payload["provider"], "gemini")
        self.assertIsNotNone(usage)

    @patch("hair_advisor.services.explanation.gemini_explain_json", side_effect=ValueError("bad json"))
    def test_gemini_fallback(self, _mock):
        payload, usage = explain_analysis_uz(
            "Shampoo",
            "Brand",
            {"recommendation": "CAUTION", "flags": ["sulfate"]},
            "profile",
        )
        self.assertEqual(payload["provider"], "deterministic")
        self.assertIsNone(usage)