from django.test import TestCase

from accounts.models import User
from ai.models import CareProduct, HairCareProfile
from hair_advisor.models import (
    CandidateSubmission,
    HairProduct,
    ProductCandidate,
    ProductSubmission,
)
from hair_advisor.services.aggregation import aggregate_submission
from hair_advisor.services.matching import compare_submission_to_candidate, inci_jaccard
from hair_advisor.services.publishing import publish_candidate
from hair_advisor.services.verified_catalog import lookup_verified_by_barcode

INGREDIENTS_A = ["Aqua", "Sodium Laureth Sulfate", "Glycerin", "Citric Acid"]
INGREDIENTS_B = ["Aqua", "Sodium Chloride", "Glycerin", "Parfum"]


def _user(name: str) -> User:
    return User.objects.create_user(
        username=name,
        email=f"{name}@test.local",
        phone=f"+9989{name[-8:].zfill(8)}",
        password="TestPass123!",
        role=User.Role.USER,
    )


class ProductVerificationTests(TestCase):
    def setUp(self):
        self.user = _user("pvtesta")
        self.user_b = _user("pvtestb")
        HairCareProfile.objects.create(
            user=self.user,
            condition="normal",
            texture="straight",
            color_status="natural",
        )

    def test_verified_lookup_requires_is_verified(self):
        from hair_advisor.services.verified_catalog import invalidate_verified_barcode_cache

        code = "4006381333999"
        CareProduct.objects.create(
            name="Clear Deep",
            brand="Clear",
            slug="clear-deep-unverified-2",
            barcode=code,
            is_verified=False,
            is_published=True,
            ingredients=INGREDIENTS_A,
        )
        invalidate_verified_barcode_cache(code)
        result = lookup_verified_by_barcode(code)
        self.assertFalse(result["found"])

    def test_verified_lookup_returns_verified_product(self):
        care = CareProduct.objects.create(
            name="Clear Deep",
            brand="Clear",
            slug="clear-deep-verified",
            barcode="4006381333932",
            is_verified=True,
            is_published=True,
            ingredients=INGREDIENTS_A,
            ingredients_text=", ".join(INGREDIENTS_A),
        )
        result = lookup_verified_by_barcode("4006381333932")
        self.assertTrue(result["found"])
        self.assertEqual(result["tier"], "verified")
        self.assertEqual(result["care_product"].pk, care.pk)

    def test_duplicate_grouping_same_barcode_and_inci(self):
        c1 = ProductCandidate.objects.create(
            proposed_brand="Clear",
            proposed_product_name="Shampoo",
            proposed_barcode="1234567890123",
            proposed_field_evidence={
                "inci_consensus_key": "abc",
                "inci_lists": {"abc": INGREDIENTS_A},
            },
        )
        sub = ProductSubmission.objects.create(
            user=self.user,
            barcode="1234567890123",
            submitted_brand="Clear",
            submitted_product_name="Shampoo",
            normalized_ingredients=INGREDIENTS_A,
            user_corrected_ingredients=INGREDIENTS_A,
            status=ProductSubmission.Status.SUBMITTED,
        )
        meta = compare_submission_to_candidate(sub, c1)
        self.assertEqual(meta["stage"], "A")
        self.assertNotIn("inci_mismatch_same_barcode", meta.get("conflicts", []))

    def test_conflict_same_barcode_different_inci(self):
        c1 = ProductCandidate.objects.create(
            proposed_brand="Clear",
            proposed_product_name="Shampoo",
            proposed_barcode="1234567890123",
            proposed_field_evidence={
                "inci_consensus_key": "abc",
                "inci_lists": {"abc": INGREDIENTS_A},
            },
        )
        sub = ProductSubmission.objects.create(
            user=self.user,
            barcode="1234567890123",
            submitted_brand="Clear",
            submitted_product_name="Shampoo",
            normalized_ingredients=INGREDIENTS_B,
            user_corrected_ingredients=INGREDIENTS_B,
            status=ProductSubmission.Status.SUBMITTED,
        )
        meta = compare_submission_to_candidate(sub, c1)
        self.assertIn("inci_mismatch_same_barcode", meta.get("conflicts", []))
        self.assertLess(inci_jaccard(INGREDIENTS_A, INGREDIENTS_B), 0.65)

    def test_aggregation_groups_two_submissions(self):
        s1 = ProductSubmission.objects.create(
            user=self.user,
            barcode="5901234123457",
            submitted_brand="Clear",
            submitted_product_name="Anti-Dandruff",
            user_corrected_ingredients=INGREDIENTS_A,
            status=ProductSubmission.Status.SUBMITTED,
        )
        c1 = aggregate_submission(s1)
        s2 = ProductSubmission.objects.create(
            user=self.user_b,
            barcode="5901234123457",
            submitted_brand="Clear",
            submitted_product_name="Anti-Dandruff",
            user_corrected_ingredients=INGREDIENTS_A,
            status=ProductSubmission.Status.SUBMITTED,
        )
        c2 = aggregate_submission(s2)
        self.assertEqual(c1.id, c2.id)
        c1.refresh_from_db()
        self.assertGreaterEqual(c1.submission_count, 2)

    def test_publish_candidate_creates_verified_catalog(self):
        cand = ProductCandidate.objects.create(
            proposed_brand="Clear",
            proposed_product_name="Shampoo X",
            proposed_barcode="5901234123458",
            proposed_field_evidence={
                "inci_consensus_key": "k1",
                "inci_lists": {"k1": INGREDIENTS_A},
            },
        )
        hp = publish_candidate(
            cand,
            corrected_fields={"ingredients": INGREDIENTS_A, "category": "shampoo"},
        )
        self.assertEqual(hp.data_quality_status, HairProduct.DataQuality.VERIFIED)
        self.assertIsNotNone(hp.care_product_id)
        lookup = lookup_verified_by_barcode("5901234123458")
        self.assertTrue(lookup["found"])