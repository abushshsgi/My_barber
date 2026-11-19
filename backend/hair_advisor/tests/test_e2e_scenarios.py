"""Scenarios A–E — isolated DB workflow (no live Gemini)."""

from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from ai.models import CareProduct, HairCareProfile
from hair_advisor.models import HairProduct, ProductCandidate, ProductSubmission
from hair_advisor.services.publishing import publish_candidate
from hair_advisor.services.verified_catalog import lookup_verified_by_barcode


def _user(name: str) -> User:
    return User.objects.create_user(
        username=name,
        email=f"{name}@e2e.local",
        phone=f"+9989{name[-8:].zfill(8)}",
        password="TestPass123!",
        role=User.Role.USER,
    )


ING_A = ["Aqua", "Sodium Laureth Sulfate", "Glycerin"]
ING_B = ["Aqua", "Sodium Chloride", "Glycerin"]


class HairAdvisorE2EScenarios(TestCase):
    def setUp(self):
        self.user = _user("e2euser")
        HairCareProfile.objects.create(
            user=self.user,
            condition="normal",
            texture="straight",
            color_status="natural",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_scenario_a_verified_barcode_scan(self):
        code = "4006381333931"
        care = CareProduct.objects.create(
            name="Verified Shampoo",
            brand="V",
            slug="verified-shampoo-e2e",
            barcode=code,
            is_verified=True,
            is_published=True,
            ingredients=ING_A,
        )
        self.assertTrue(care.is_verified)
        lookup = lookup_verified_by_barcode(code)
        self.assertTrue(lookup["found"])

    def test_scenario_b_unknown_triggers_submission_path(self):
        res = self.client.post(
            "/api/v1/hair-advisor/scans/",
            {"input_method": "barcode", "barcode": "5901234123457"},
            format="json",
        )
        if res.status_code == 403:
            self.skipTest("morph_care gate")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "product_not_found")
        self.assertTrue(res.json().get("submission_allowed"))

    def test_scenario_c_grouping(self):
        from hair_advisor.services.aggregation import aggregate_submission

        u2 = _user("e2euser2")
        for u in (self.user, u2):
            sub = ProductSubmission.objects.create(
                user=u,
                barcode="5901234123458",
                submitted_brand="Clear",
                submitted_product_name="Shampoo",
                user_corrected_ingredients=ING_A,
                status=ProductSubmission.Status.SUBMITTED,
            )
            aggregate_submission(sub)
        self.assertEqual(ProductCandidate.objects.filter(proposed_barcode="5901234123458").count(), 1)

    def test_scenario_d_conflict(self):
        from hair_advisor.services.aggregation import aggregate_submission

        sub1 = ProductSubmission.objects.create(
            user=self.user,
            barcode="5901234123459",
            user_corrected_ingredients=ING_A,
            status=ProductSubmission.Status.SUBMITTED,
        )
        cand = aggregate_submission(sub1)
        u2 = _user("e2econf")
        sub2 = ProductSubmission.objects.create(
            user=u2,
            barcode="5901234123459",
            user_corrected_ingredients=ING_B,
            status=ProductSubmission.Status.SUBMITTED,
        )
        aggregate_submission(sub2)
        cand.refresh_from_db()
        self.assertTrue(cand.conflicting_fields or cand.status == ProductCandidate.Status.CONFLICT)

    @patch("hair_advisor.services.analysis.explain_analysis_uz")
    def test_scenario_e_publish_and_rescan(self, mock_explain):
        mock_explain.return_value = (
            {"explanation_uz": "Test", "summary_bullets_uz": [], "cautions_uz": [], "provider": "test"},
            None,
        )
        code = "5901234123460"
        cand = ProductCandidate.objects.create(
            proposed_brand="Clear",
            proposed_product_name="Final",
            proposed_barcode=code,
            proposed_field_evidence={"inci_consensus_key": "k", "inci_lists": {"k": ING_A}},
        )
        publish_candidate(cand, corrected_fields={"ingredients": ING_A, "barcode": code})
        lookup = lookup_verified_by_barcode(code)
        self.assertTrue(lookup["found"])
        self.assertEqual(lookup["tier"], "verified")