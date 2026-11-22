from unittest.mock import patch

from django.test import TestCase

from ai.models import CareProduct
from accounts.models import User
from hair_advisor.services.product_recognition import rank_ocr_catalog_candidates


class OcrCandidateRankingTests(TestCase):
    def setUp(self):
        CareProduct.objects.create(
            name="Repair Shampoo",
            brand="Clear",
            slug="clear-repair",
            is_published=True,
            ingredients=["Aqua", "Glycerin"],
        )
        self.other = CareProduct.objects.create(
            name="Volume Shampoo",
            brand="Clear",
            slug="clear-volume",
            is_published=True,
            ingredients=["Aqua"],
        )

    def test_ambiguous_when_multiple_catalog_hits(self):
        matched = CareProduct.objects.filter(brand="Clear").first()
        payload = {
            "product_analysis": {"brand": "Clear", "product_name": "Shampoo"},
            "matched_product_id": matched.pk if matched else None,
        }
        candidates, meta = rank_ocr_catalog_candidates(payload)
        self.assertGreaterEqual(len(candidates), 2)
        self.assertEqual(meta["recognition_status"], "ambiguous")

    def test_exact_only_for_single_gemini_match(self):
        CareProduct.objects.exclude(slug="clear-repair").delete()
        care = CareProduct.objects.get(slug="clear-repair")
        payload = {
            "product_analysis": {"brand": "Clear", "product_name": "Repair Shampoo"},
            "matched_product_id": care.pk,
        }
        _, meta = rank_ocr_catalog_candidates(payload)
        self.assertIn(meta["recognition_status"], ("exact", "exact_match"))


class ConfirmProductViewTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        self.user = User.objects.create_user(
            username="pickuser",
            email="pick@test.local",
            phone="+998900000099",
            password="TestPass123!",
            role=User.Role.USER,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.care = CareProduct.objects.create(
            name="Pick Me",
            brand="Test",
            slug="pick-me",
            is_published=True,
            ingredients=["Aqua"],
        )

    @patch("hair_advisor.views.morph_care_block", return_value=None)
    def test_confirm_product_rejects_outside_candidates(self, _mock_block):
        from hair_advisor.models import HairScan

        scan = HairScan.objects.create(
            user=self.user,
            input_method=HairScan.InputMethod.CAMERA_LABEL,
            status=HairScan.Status.NEEDS_CONFIRMATION,
            recognition_meta={"recognition_status": "ambiguous", "candidate_ids": [self.care.pk]},
        )
        outsider = CareProduct.objects.create(
            name="Other",
            brand="X",
            slug="other-x",
            is_published=True,
        )
        res = self.client.post(
            f"/api/v1/hair-advisor/scans/{scan.id}/confirm-product/",
            {"care_product_id": outsider.pk},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    @patch("hair_advisor.views.morph_care_block", return_value=None)
    def test_confirm_product_attaches_allowed_candidate(self, _mock_block):
        from hair_advisor.models import HairScan

        scan = HairScan.objects.create(
            user=self.user,
            input_method=HairScan.InputMethod.CAMERA_LABEL,
            status=HairScan.Status.NEEDS_CONFIRMATION,
            recognition_meta={"recognition_status": "ambiguous", "candidate_ids": [self.care.pk]},
        )
        res = self.client.post(
            f"/api/v1/hair-advisor/scans/{scan.id}/confirm-product/",
            {"care_product_id": self.care.pk},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["care_product"]["id"], self.care.pk)
        scan.refresh_from_db()
        self.assertEqual(scan.care_product_id, self.care.pk)


class OcrRecognitionNoneTests(TestCase):
    def test_rank_returns_none_without_catalog_hits(self):
        payload = {
            "product_analysis": {"brand": "ZZZUnknown", "product_name": "NoProductHere"},
            "matched_product_id": None,
        }
        candidates, meta = rank_ocr_catalog_candidates(payload)
        self.assertEqual(candidates, [])
        self.assertIn(meta["recognition_status"], ("none", "not_found", "insufficient_image_quality"))